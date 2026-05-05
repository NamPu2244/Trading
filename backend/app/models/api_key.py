"""
Encrypted storage for broker and AI provider API keys.
One row per key/secret pair. Agents reference these by ID.
"""
import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class KeyProvider(str, enum.Enum):
    # Brokers
    BINANCE = "binance"
    KRAKEN = "kraken"
    COINBASE = "coinbase"
    ALPACA = "alpaca"
    # AI Cloud
    ANTHROPIC = "anthropic"
    OPENAI = "openai"
    # Generic
    OTHER = "other"


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    provider: Mapped[KeyProvider] = mapped_column(Enum(KeyProvider), nullable=False)

    # Fernet-encrypted values
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    encrypted_secret: Mapped[str | None] = mapped_column(Text, nullable=True)  # brokers need secret

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Back-references (agents that use this key as broker or ai)
    broker_agents: Mapped[list["Agent"]] = relationship(  # noqa: F821
        "Agent", back_populates="broker_api_key", foreign_keys="Agent.broker_api_key_id"
    )
    ai_agents: Mapped[list["Agent"]] = relationship(  # noqa: F821
        "Agent", back_populates="ai_api_key", foreign_keys="Agent.ai_api_key_id"
    )
