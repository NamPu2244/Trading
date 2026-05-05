"""
Per-agent logs: trade events, AI reasoning stream, errors, system messages.
"""
import enum
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LogLevel(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    AI_DECISION = "ai_decision"   # AI returned a trading decision
    AI_THINKING = "ai_thinking"   # Streamed AI reasoning chunk
    TRADE = "trade"               # Order executed


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    agent_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("agents.id", ondelete="CASCADE"), nullable=False, index=True
    )
    level: Mapped[LogLevel] = mapped_column(Enum(LogLevel), default=LogLevel.INFO)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    # Arbitrary JSON metadata (e.g. full AI response, trade details)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    symbol: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    agent: Mapped["Agent"] = relationship("Agent", back_populates="logs")  # noqa: F821
