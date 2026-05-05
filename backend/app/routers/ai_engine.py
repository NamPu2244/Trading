"""
AI Engine endpoints:
- POST /api/ai/decide  — one-shot decision for a symbol
- GET  /api/ai/stream  — SSE stream of AI reasoning for a symbol
- GET  /api/ai/models  — list available models per provider
"""
from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decrypt
from app.models.agent import Agent, AIProvider
from app.services import ai_router, market_data as md

router = APIRouter()
settings = get_settings()


async def _resolve_agent(agent_id: int, db: AsyncSession) -> Agent:
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/decide")
async def get_decision(
    agent_id: int,
    symbol: str,
    db: AsyncSession = Depends(get_db),
):
    """Run a single (non-streaming) AI decision for the given agent + symbol."""
    agent = await _resolve_agent(agent_id, db)

    candles = await md.get_ohlcv_cached(
        db=db,
        exchange_id=agent.broker,
        symbol=symbol,
        timeframe=agent.timeframe.value,
    )
    if not candles:
        raise HTTPException(status_code=422, detail=f"No market data for {symbol}")

    indicators = md.compute_indicators(candles)
    ai_key = None
    if agent.ai_api_key:
        ai_key = decrypt(agent.ai_api_key.encrypted_key, settings.SECRET_KEY)
    elif agent.ai_provider == AIProvider.ANTHROPIC:
        ai_key = settings.ANTHROPIC_API_KEY or None
    elif agent.ai_provider == AIProvider.OPENAI:
        ai_key = settings.OPENAI_API_KEY or None

    decision = await ai_router.get_ai_decision(
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
    )

    return {
        "action": decision.action,
        "amount_pct": decision.amount_pct,
        "reason": decision.reason,
        "confidence": decision.confidence,
    }


@router.get("/stream")
async def stream_decision(
    agent_id: int = Query(...),
    symbol: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Server-Sent Events stream of AI reasoning.
    Each event is a JSON chunk: {type: "chunk"|"decision", data: ...}
    """
    agent = await _resolve_agent(agent_id, db)

    candles = await md.get_ohlcv_cached(
        db=db, exchange_id=agent.broker, symbol=symbol, timeframe=agent.timeframe.value
    )
    indicators = md.compute_indicators(candles)

    ai_key = None
    if agent.ai_api_key:
        ai_key = decrypt(agent.ai_api_key.encrypted_key, settings.SECRET_KEY)
    elif agent.ai_provider == AIProvider.ANTHROPIC:
        ai_key = settings.ANTHROPIC_API_KEY or None

    async def event_gen():
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
                sentinel = chunk.replace("\n__DECISION__:", "")
                payload = json.dumps({"type": "decision", "data": json.loads(sentinel) if sentinel != "null" else None})
            else:
                payload = json.dumps({"type": "chunk", "data": chunk})
            yield f"data: {payload}\n\n"

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.get("/models")
async def list_models():
    """Return curated model lists per provider."""
    return {
        "anthropic": [
            {"id": "claude-opus-4-6", "name": "Claude Opus 4.6 (Most Capable)"},
            {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6 (Recommended)"},
            {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5 (Fastest)"},
        ],
        "openai": [
            {"id": "gpt-4o", "name": "GPT-4o"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Fast)"},
            {"id": "o1-mini", "name": "o1 Mini (Reasoning)"},
        ],
        "ollama": [
            {"id": "llama3.2", "name": "Llama 3.2 (3B)"},
            {"id": "llama3.1:8b", "name": "Llama 3.1 (8B)"},
            {"id": "mistral", "name": "Mistral 7B"},
            {"id": "deepseek-r1:7b", "name": "DeepSeek R1 (7B)"},
            {"id": "qwen2.5:7b", "name": "Qwen 2.5 (7B)"},
        ],
    }
