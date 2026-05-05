from datetime import datetime
from pydantic import BaseModel, Field
from app.models.api_key import KeyProvider


class ApiKeyCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=128)
    provider: KeyProvider
    key: str = Field(..., min_length=1, description="Plaintext API key — will be encrypted")
    secret: str | None = Field(None, description="Plaintext secret (brokers) — will be encrypted")


class ApiKeyUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=128)
    key: str | None = None
    secret: str | None = None


class ApiKeyOut(BaseModel):
    id: int
    label: str
    provider: KeyProvider
    key_masked: str        # e.g. "****abcd"
    has_secret: bool
    created_at: datetime

    model_config = {"from_attributes": True}
