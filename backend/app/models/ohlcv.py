"""
OHLCV candle cache — avoids redundant exchange API calls.
Unique constraint on (symbol, exchange, timeframe, timestamp).
"""
from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class OHLCVCache(Base):
    __tablename__ = "ohlcv_cache"
    __table_args__ = (
        UniqueConstraint("symbol", "exchange", "timeframe", "ts", name="uq_ohlcv"),
        Index("ix_ohlcv_lookup", "symbol", "exchange", "timeframe", "ts"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    exchange: Mapped[str] = mapped_column(String(32), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(8), nullable=False)
    # Candle open timestamp (Unix ms stored as int, exposed as datetime)
    ts: Mapped[int] = mapped_column(Integer, nullable=False)  # Unix epoch ms

    open: Mapped[float] = mapped_column(Float, nullable=False)
    high: Mapped[float] = mapped_column(Float, nullable=False)
    low: Mapped[float] = mapped_column(Float, nullable=False)
    close: Mapped[float] = mapped_column(Float, nullable=False)
    volume: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    @property
    def datetime(self) -> datetime:
        return datetime.fromtimestamp(self.ts / 1000, tz=timezone.utc)
