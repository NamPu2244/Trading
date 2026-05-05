"""Trade/order management — view and manually close paper trades."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.trade import Trade, TradeStatus
from app.schemas.trade import TradeOut
from app.services.broker import close_trade_paper
from app.services.market_data import get_ohlcv_cached

router = APIRouter()


@router.get("", response_model=list[TradeOut])
async def list_trades(
    agent_id: int | None = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    q = select(Trade).order_by(Trade.opened_at.desc()).limit(limit)
    if agent_id is not None:
        q = q.where(Trade.agent_id == agent_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{trade_id}", response_model=TradeOut)
async def get_trade(trade_id: int, db: AsyncSession = Depends(get_db)):
    trade = await db.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.post("/{trade_id}/close", response_model=TradeOut)
async def close_trade(
    trade_id: int,
    exit_price: float | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Manually close an open/paper trade.
    If exit_price is not provided, fetches current market price.
    """
    trade = await db.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status not in (TradeStatus.OPEN, TradeStatus.PAPER):
        raise HTTPException(status_code=400, detail="Trade is already closed")

    if exit_price is None:
        # Fetch current price from exchange (unauthenticated ticker)
        candles = await get_ohlcv_cached(
            db=db,
            exchange_id="binance",  # TODO: pull from agent
            symbol=trade.symbol,
            timeframe="1m",
            limit=2,
        )
        exit_price = float(candles[-1]["close"]) if candles else trade.entry_price

    result = await close_trade_paper(
        entry_price=trade.entry_price,
        exit_price=exit_price,
        quantity=trade.quantity,
        side=trade.side.value,
    )

    trade.exit_price = result["exit_price"]
    trade.pnl = result["pnl"]
    trade.pnl_pct = result["pnl_pct"]
    trade.closed_at = result["closed_at"]
    trade.status = TradeStatus.CLOSED

    await db.flush()
    await db.refresh(trade)
    return trade
