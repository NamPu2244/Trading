from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator

from app.models.agent import AIProvider, AgentStatus, Timeframe


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: str | None = None
    strategy_prompt: str = Field(
        default="Analyze the provided OHLCV data and technical indicators. "
                "Return a JSON trading decision with action (BUY/SELL/HOLD), "
                "amount_pct (0-100), and reason."
    )
    symbols: list[str] = Field(default_factory=list, min_length=1)
    timeframe: Timeframe = Timeframe.H1

    ai_provider: AIProvider = AIProvider.ANTHROPIC
    ai_model: str = Field(default="claude-sonnet-4-6", max_length=128)
    ai_api_key_id: int | None = None

    broker: str = Field(default="binance", max_length=64)
    is_paper_trading: bool = True
    broker_api_key_id: int | None = None

    risk_stop_loss_pct: float = Field(default=2.0, ge=0.1, le=50.0)
    risk_take_profit_pct: float = Field(default=4.0, ge=0.1, le=100.0)
    risk_max_drawdown_pct: float = Field(default=10.0, ge=1.0, le=100.0)
    risk_position_size_pct: float = Field(default=10.0, ge=0.1, le=100.0)

    @field_validator("symbols")
    @classmethod
    def normalize_symbols(cls, v: list[str]) -> list[str]:
        return [s.upper().strip() for s in v]


class AgentUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=128)
    description: str | None = None
    strategy_prompt: str | None = None
    symbols: list[str] | None = None
    timeframe: Timeframe | None = None

    ai_provider: AIProvider | None = None
    ai_model: str | None = None
    ai_api_key_id: int | None = None

    broker: str | None = None
    is_paper_trading: bool | None = None
    broker_api_key_id: int | None = None

    risk_stop_loss_pct: float | None = Field(None, ge=0.1, le=50.0)
    risk_take_profit_pct: float | None = Field(None, ge=0.1, le=100.0)
    risk_max_drawdown_pct: float | None = Field(None, ge=1.0, le=100.0)
    risk_position_size_pct: float | None = Field(None, ge=0.1, le=100.0)


class AgentOut(BaseModel):
    id: int
    name: str
    description: str | None
    strategy_prompt: str
    symbols: list[str]
    timeframe: Timeframe

    ai_provider: AIProvider
    ai_model: str
    ai_api_key_id: int | None

    broker: str
    is_paper_trading: bool
    broker_api_key_id: int | None

    risk_stop_loss_pct: float
    risk_take_profit_pct: float
    risk_max_drawdown_pct: float
    risk_position_size_pct: float

    status: AgentStatus
    is_active: bool
    total_pnl: float
    total_trades: int
    win_rate: float
    last_decision: dict[str, Any] | None
    last_run_at: datetime | None
    error_message: str | None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentStatusUpdate(BaseModel):
    """Used to start/stop/pause an agent."""
    is_active: bool
