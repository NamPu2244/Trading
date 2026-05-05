"""
Agent runner — orchestrates one full trading cycle for an agent:
  1. Fetch market data + indicators
  2. Ask AI for a decision (streamed to WebSocket)
  3. Execute the trade (paper or live)
  4. Persist trade + log
  5. Update agent stats
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import decrypt
from app.models.agent import Agent, AgentStatus
from app.models.log import AgentLog, LogLevel
from app.models.trade import Trade, TradeSide, TradeStatus, OrderType
from app.services import ai_router, broker, market_data as md
from app.ws.manager import manager

settings = get_settings()

# Paper balance per agent in USD (reset on agent creation)
PAPER_BALANCE = 10_000.0


async def _get_broker_credentials(agent: Agent) -> tuple[str, str]:
    if agent.broker_api_key and not agent.is_paper_trading:
        key = decrypt(agent.broker_api_key.encrypted_key, settings.SECRET_KEY)
        secret = ""
        if agent.broker_api_key.encrypted_secret:
            secret = decrypt(agent.broker_api_key.encrypted_secret, settings.SECRET_KEY)
        return key, secret
    return "", ""


async def _get_ai_key(agent: Agent) -> str | None:
    if agent.ai_api_key:
        return decrypt(agent.ai_api_key.encrypted_key, settings.SECRET_KEY)
    # Fall back to env
    if agent.ai_provider.value == "anthropic":
        return settings.ANTHROPIC_API_KEY or None
    if agent.ai_provider.value == "openai":
        return settings.OPENAI_API_KEY or None
    return None


async def _log(
    db: AsyncSession,
    agent: Agent,
    level: LogLevel,
    message: str,
    meta: dict | None = None,
    symbol: str | None = None,
) -> None:
    log = AgentLog(agent_id=agent.id, level=level, message=message, meta=meta, symbol=symbol)
    db.add(log)
    await db.flush()
    await manager.emit_log(agent.id, level.value, message, meta=meta, symbol=symbol)


async def _update_agent_stats(db: AsyncSession, agent: Agent) -> None:
    """Recalculate win_rate and total_pnl from closed trades."""
    result = await db.execute(
        select(
            func.count(Trade.id),
            func.sum(Trade.pnl),
            func.sum(
                (Trade.pnl > 0).cast(int)
            ),
        ).where(
            Trade.agent_id == agent.id,
            Trade.pnl.is_not(None),
        )
    )
    row = result.one()
    total = int(row[0] or 0)
    total_pnl = float(row[1] or 0.0)
    wins = int(row[2] or 0)

    agent.total_trades = total
    agent.total_pnl = round(total_pnl, 4)
    agent.win_rate = round((wins / total * 100) if total > 0 else 0.0, 2)
    await db.flush()


async def run_agent_cycle(db: AsyncSession, agent: Agent) -> None:
    """
    Execute one full trading cycle. Called by the scheduler or on-demand.
    All exceptions are caught so a single cycle failure doesn't kill the agent.
    """
    if not agent.is_active or agent.status == AgentStatus.ERROR:
        return

    agent.status = AgentStatus.RUNNING
    agent.last_run_at = datetime.now(timezone.utc)
    await db.flush()
    await manager.emit_agent_status(agent.id, AgentStatus.RUNNING.value)

    try:
        broker_key, broker_secret = await _get_broker_credentials(agent)
        ai_key = await _get_ai_key(agent)

        for symbol in agent.symbols:
            await _run_symbol_cycle(db, agent, symbol, broker_key, broker_secret, ai_key)

        agent.status = AgentStatus.IDLE
        agent.error_message = None

    except Exception as exc:
        agent.status = AgentStatus.ERROR
        agent.error_message = str(exc)[:500]
        await _log(db, agent, LogLevel.ERROR, f"Cycle error: {exc}")

    finally:
        await db.commit()
        await manager.emit_agent_status(agent.id, agent.status.value)


async def _run_symbol_cycle(
    db: AsyncSession,
    agent: Agent,
    symbol: str,
    broker_key: str,
    broker_secret: str,
    ai_key: str | None,
) -> None:
    await _log(db, agent, LogLevel.INFO, f"Starting cycle for {symbol}", symbol=symbol)

    # ── 1. Market data ──────────────────────────────────────────────────────────
    candles = await md.get_ohlcv_cached(
        db=db,
        exchange_id=agent.broker,
        symbol=symbol,
        timeframe=agent.timeframe.value,
        api_key=broker_key,
        secret=broker_secret,
    )
    if not candles:
        await _log(db, agent, LogLevel.WARNING, f"No candles returned for {symbol}", symbol=symbol)
        return

    indicators = md.compute_indicators(candles)
    await _log(
        db, agent, LogLevel.INFO,
        f"Fetched {len(candles)} candles. Price: {indicators.get('price')} RSI: {indicators.get('rsi')}",
        meta={"indicators": indicators},
        symbol=symbol,
    )

    # ── 2. AI Decision (with streaming to WebSocket) ────────────────────────────
    await _log(db, agent, LogLevel.AI_THINKING, "AI is analyzing market data...", symbol=symbol)

    full_reasoning = ""
    decision = None

    async for chunk in ai_router.stream_ai_reasoning(
        provider=agent.ai_provider,
        model=agent.ai_model,
        strategy_prompt=agent.strategy_prompt,
        symbol=symbol,
        timeframe=agent.timeframe.value,
        candles=candles,
        indicators=indicators,
        risk_stop_loss_pct=agent.risk_stop_loss_pct,
        risk_take_profit_pct=agent.risk_take_profit_pct,
        risk_position_size_pct=agent.risk_position_size_pct,
        api_key=ai_key,
    ):
        if chunk.startswith("\n__DECISION__:"):
            import json as _json
            sentinel = chunk.replace("\n__DECISION__:", "")
            if sentinel != "null":
                try:
                    d = _json.loads(sentinel)
                    from app.services.ai_router import AIDecision
                    decision = AIDecision(
                        action=d["action"],
                        amount_pct=d["amount_pct"],
                        reason=d["reason"],
                        confidence=d["confidence"],
                        raw_response=full_reasoning,
                    )
                except Exception:
                    pass
        else:
            full_reasoning += chunk
            # Stream chunk to WebSocket clients
            await manager.emit_log(
                agent.id, LogLevel.AI_THINKING.value,
                chunk, symbol=symbol
            )

    if decision is None:
        await _log(db, agent, LogLevel.WARNING, "AI returned no parseable decision", symbol=symbol)
        return

    # Update agent's last_decision snapshot
    agent.last_decision = {
        "action": decision.action,
        "amount_pct": decision.amount_pct,
        "reason": decision.reason,
        "confidence": decision.confidence,
        "symbol": symbol,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await _log(
        db, agent, LogLevel.AI_DECISION,
        f"Decision: {decision.action} {decision.amount_pct:.1f}% — {decision.reason}",
        meta={
            "action": decision.action,
            "amount_pct": decision.amount_pct,
            "confidence": decision.confidence,
            "reason": decision.reason,
        },
        symbol=symbol,
    )

    # ── 3. Execute Trade ────────────────────────────────────────────────────────
    if decision.action == "HOLD":
        await _log(db, agent, LogLevel.INFO, "Holding — no trade executed.", symbol=symbol)
        return

    current_price = float(indicators.get("price") or candles[-1]["close"])

    if agent.is_paper_trading:
        fill = await broker.execute_paper_trade(
            symbol=symbol,
            side=decision.action,
            amount_pct=decision.amount_pct,
            balance=PAPER_BALANCE,
            entry_price=current_price,
            stop_loss_pct=agent.risk_stop_loss_pct,
            take_profit_pct=agent.risk_take_profit_pct,
        )
    else:
        fill = await broker.execute_live_trade(
            exchange_id=agent.broker,
            symbol=symbol,
            side=decision.action,
            amount_pct=decision.amount_pct,
            api_key=broker_key,
            secret=broker_secret,
            stop_loss_pct=agent.risk_stop_loss_pct,
            take_profit_pct=agent.risk_take_profit_pct,
        )

    # ── 4. Persist Trade ────────────────────────────────────────────────────────
    trade = Trade(
        agent_id=agent.id,
        symbol=fill["symbol"],
        side=TradeSide(decision.action),
        order_type=OrderType.MARKET,
        status=TradeStatus.PAPER if agent.is_paper_trading else TradeStatus.OPEN,
        entry_price=fill["entry_price"],
        quantity=fill["quantity"],
        entry_value=fill["entry_value"],
        stop_loss_price=fill["stop_loss_price"],
        take_profit_price=fill["take_profit_price"],
        ai_reasoning=decision.reason,
        ai_confidence=decision.confidence,
        is_paper=fill["is_paper"],
        broker_order_id=fill.get("broker_order_id"),
    )
    db.add(trade)
    await db.flush()

    await _log(
        db, agent, LogLevel.TRADE,
        f"{'[PAPER] ' if agent.is_paper_trading else ''}Executed {decision.action} "
        f"{fill['quantity']:.6f} {symbol} @ {fill['entry_price']}",
        meta={"trade_id": trade.id, **fill},
        symbol=symbol,
    )

    await _update_agent_stats(db, agent)
