from datetime import datetime
from pydantic import BaseModel
from app.models.trade import OrderType, TradeSide, TradeStatus


class TradeOut(BaseModel):
    id: int
    agent_id: int
    symbol: str
    side: TradeSide
    order_type: OrderType
    status: TradeStatus
    entry_price: float
    exit_price: float | None
    quantity: float
    entry_value: float
    stop_loss_price: float | None
    take_profit_price: float | None
    pnl: float | None
    pnl_pct: float | None
    ai_reasoning: str | None
    ai_confidence: float | None
    broker_order_id: str | None
    is_paper: bool
    opened_at: datetime
    closed_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class TradeCreate(BaseModel):
    """Internal use — the AI router calls this to record a decision."""
    agent_id: int
    symbol: str
    side: TradeSide
    order_type: OrderType = OrderType.MARKET
    entry_price: float
    quantity: float
    stop_loss_price: float | None = None
    take_profit_price: float | None = None
    ai_reasoning: str | None = None
    ai_confidence: float | None = None
    is_paper: bool = True
