"""
Individual trade records — both paper and live.
Includes AI reasoning and PnL tracking.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TradeSide(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class TradeStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"
    PAPER = "paper"


class OrderType(str, enum.Enum):
    MARKET = "market"
    LIMIT = "limit"


class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # ── Order Details ───────────────────────────────────────────────────────────
    symbol: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    side: Mapped[TradeSide] = mapped_column(Enum(TradeSide), nullable=False)
    order_type: Mapped[OrderType] = mapped_column(Enum(OrderType), default=OrderType.MARKET)
    status: Mapped[TradeStatus] = mapped_column(Enum(TradeStatus), default=TradeStatus.PAPER)

    entry_price: Mapped[float] = mapped_column(Float, nullable=False)
    exit_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    # Notional value at entry
    entry_value: Mapped[float] = mapped_column(Float, nullable=False)

    # ── Risk Levels (snapshotted at trade entry) ─────────────────────────────────
    stop_loss_price: Mapped[float | None] = mapped_column(Float, nullable=True)
    take_profit_price: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ── PnL ─────────────────────────────────────────────────────────────────────
    pnl: Mapped[float | None] = mapped_column(Float, nullable=True)          # absolute
    pnl_pct: Mapped[float | None] = mapped_column(Float, nullable=True)      # percentage

    # ── AI Decision Context ─────────────────────────────────────────────────────
    ai_reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)  # 0.0 – 1.0

    # ── Broker ──────────────────────────────────────────────────────────────────
    broker_order_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_paper: Mapped[bool] = mapped_column(default=True)

    # ── Timestamps ──────────────────────────────────────────────────────────────
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    agent: Mapped["Agent"] = relationship("Agent", back_populates="trades")  # noqa: F821
