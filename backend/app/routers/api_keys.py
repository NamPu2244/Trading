"""API key CRUD — keys are encrypted before storage."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import get_settings
from app.core.security import encrypt, decrypt, mask
from app.models.api_key import ApiKey
from app.schemas.api_key import ApiKeyCreate, ApiKeyOut, ApiKeyUpdate

router = APIRouter()
settings = get_settings()


def _to_out(key: ApiKey) -> ApiKeyOut:
    raw_key = decrypt(key.encrypted_key, settings.SECRET_KEY)
    return ApiKeyOut(
        id=key.id,
        label=key.label,
        provider=key.provider,
        key_masked=mask(raw_key),
        has_secret=key.encrypted_secret is not None,
        created_at=key.created_at,
    )


@router.get("", response_model=list[ApiKeyOut])
async def list_keys(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ApiKey).order_by(ApiKey.created_at.desc()))
    return [_to_out(k) for k in result.scalars().all()]


@router.post("", response_model=ApiKeyOut, status_code=status.HTTP_201_CREATED)
async def create_key(body: ApiKeyCreate, db: AsyncSession = Depends(get_db)):
    key = ApiKey(
        label=body.label,
        provider=body.provider,
        encrypted_key=encrypt(body.key, settings.SECRET_KEY),
        encrypted_secret=encrypt(body.secret, settings.SECRET_KEY) if body.secret else None,
    )
    db.add(key)
    await db.flush()
    await db.refresh(key)
    return _to_out(key)


@router.get("/{key_id}", response_model=ApiKeyOut)
async def get_key(key_id: int, db: AsyncSession = Depends(get_db)):
    key = await db.get(ApiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    return _to_out(key)


@router.patch("/{key_id}", response_model=ApiKeyOut)
async def update_key(key_id: int, body: ApiKeyUpdate, db: AsyncSession = Depends(get_db)):
    key = await db.get(ApiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    if body.label is not None:
        key.label = body.label
    if body.key is not None:
        key.encrypted_key = encrypt(body.key, settings.SECRET_KEY)
    if body.secret is not None:
        key.encrypted_secret = encrypt(body.secret, settings.SECRET_KEY)
    await db.flush()
    return _to_out(key)


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_key(key_id: int, db: AsyncSession = Depends(get_db)):
    key = await db.get(ApiKey, key_id)
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    await db.delete(key)
