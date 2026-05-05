"""
Trading Agent (Profile) — the core entity.
Each agent has its own strategy, AI config, risk params, and broker config.
"""
import enum
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AIProvider(str, enum.Enum):
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    OLLAMA = "ollama"


class AgentStatus(str, enum.Enum):
    IDLE = "idle"
    RUNNING = "running"
    PAUSED = "paused"
    ERROR = "error"


class Timeframe(str, enum.Enum):
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Strategy ────────────────────────────────────────────────────────────────
    strategy_prompt: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="Analyze the provided OHLCV data and technical indicators. "
                "Return a JSON trading decision with action (BUY/SELL/HOLD), "
                "amount_pct (0-100), and reason.",
    )
    # Symbols this agent trades, e.g. ["BTC/USDT", "ETH/USDT"]
    symbols: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    timeframe: Mapped[Timeframe] = mapped_column(Enum(Timeframe), default=Timeframe.H1)

    # ── AI Configuration ────────────────────────────────────────────────────────
    ai_provider: Mapped[AIProvider] = mapped_column(Enum(AIProvider), default=AIProvider.ANTHROPIC)
    # Cloud model IDs or Ollama model tag (e.g. "llama3.2", "claude-opus-4-6")
    ai_model: Mapped[str] = mapped_column(String(128), default="claude-sonnet-4-6")
    # Optional per-agent AI API key (overrides env). FK to api_keys.
    ai_api_key_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True
    )
    ai_api_key: Mapped["ApiKey | None"] = relationship(  # noqa: F821
        "ApiKey", back_populates="ai_agents", foreign_keys=[ai_api_key_id]
    )

    # ── Broker Configuration ────────────────────────────────────────────────────
    broker: Mapped[str] = mapped_column(String(64), default="binance")  # CCXT exchange id
    is_paper_trading: Mapped[bool] = mapped_column(Boolean, default=True)
    broker_api_key_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True
    )
    broker_api_key: Mapped["ApiKey | None"] = relationship(  # noqa: F821
        "ApiKey", back_populates="broker_agents", foreign_keys=[broker_api_key_id]
    )

    # ── Risk Management ─────────────────────────────────────────────────────────
    risk_stop_loss_pct: Mapped[float] = mapped_column(Float, default=2.0)       # 2%
    risk_take_profit_pct: Mapped[float] = mapped_column(Float, default=4.0)     # 4%
    risk_max_drawdown_pct: Mapped[float] = mapped_column(Float, default=10.0)   # 10%
    risk_position_size_pct: Mapped[float] = mapped_column(Float, default=10.0)  # 10% of balance

    # ── Runtime State ───────────────────────────────────────────────────────────
    status: Mapped[AgentStatus] = mapped_column(Enum(AgentStatus), default=AgentStatus.IDLE)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    # Cached PnL metrics (updated after each trade cycle)
    total_pnl: Mapped[float] = mapped_column(Float, default=0.0)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    win_rate: Mapped[float] = mapped_column(Float, default=0.0)
    # Last AI decision snapshot for dashboard display
    last_decision: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ───────────────────────────────────────────────────────────
    trades: Mapped[list["Trade"]] = relationship(  # noqa: F821
        "Trade", back_populates="agent", cascade="all, delete-orphan"
    )
    logs: Mapped[list["AgentLog"]] = relationship(  # noqa: F821
        "AgentLog", back_populates="agent", cascade="all, delete-orphan"
    )
