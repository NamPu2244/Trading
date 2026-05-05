from datetime import datetime
from typing import Any
from pydantic import BaseModel
from app.models.log import LogLevel


class LogOut(BaseModel):
    id: int
    agent_id: int
    level: LogLevel
    message: str
    meta: dict[str, Any] | None
    symbol: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OHLCVOut(BaseModel):
    ts: int           # Unix ms — Lightweight Charts expects this
    open: float
    high: float
    low: float
    close: float
    volume: float

    model_config = {"from_attributes": True}
