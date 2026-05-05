"""Market data endpoints — OHLCV fetch + indicator snapshot."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.log import OHLCVOut
from app.services.market_data import get_ohlcv_cached, compute_indicators

router = APIRouter()


@router.get("/ohlcv", response_model=list[OHLCVOut])
async def get_ohlcv(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    timeframe: str = Query("1h"),
    limit: int = Query(200, ge=10, le=1000),
    db: AsyncSession = Depends(get_db),
):
    candles = await get_ohlcv_cached(
        db=db,
        exchange_id=exchange,
        symbol=symbol,
        timeframe=timeframe,
        limit=limit,
    )
    return [OHLCVOut(**c) for c in candles]


@router.get("/indicators")
async def get_indicators(
    exchange: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    timeframe: str = Query("1h"),
    db: AsyncSession = Depends(get_db),
):
    candles = await get_ohlcv_cached(
        db=db,
        exchange_id=exchange,
        symbol=symbol,
        timeframe=timeframe,
        limit=200,
    )
    return compute_indicators(candles)


@router.get("/exchanges")
async def list_exchanges():
    """Return a curated list of supported CCXT exchange IDs."""
    return {
        "exchanges": [
            {"id": "binance", "name": "Binance"},
            {"id": "kraken", "name": "Kraken"},
            {"id": "coinbasepro", "name": "Coinbase Pro"},
            {"id": "bybit", "name": "Bybit"},
            {"id": "okx", "name": "OKX"},
            {"id": "bitfinex", "name": "Bitfinex"},
        ]
    }
