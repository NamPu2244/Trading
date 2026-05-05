"""
Broker utility endpoints:
- Test broker connectivity (fetch ticker without placing orders)
- List available symbols for an exchange
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

import ccxt.async_support as ccxt

from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import decrypt
from app.models.api_key import ApiKey

router = APIRouter()
settings = get_settings()


@router.get("/test")
async def test_broker(
    exchange_id: str = Query("binance"),
    symbol: str = Query("BTC/USDT"),
    api_key_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Verify exchange connectivity by fetching a public ticker.
    If api_key_id is provided, also validates the credentials via fetch_balance.
    """
    cls = getattr(ccxt, exchange_id, None)
    if cls is None:
        raise HTTPException(status_code=400, detail=f"Unknown exchange: {exchange_id}")

    params: dict = {"enableRateLimit": True}
    authenticated = False

    if api_key_id:
        key_row = await db.get(ApiKey, api_key_id)
        if not key_row:
            raise HTTPException(status_code=404, detail="API key not found")
        params["apiKey"] = decrypt(key_row.encrypted_key, settings.SECRET_KEY)
        if key_row.encrypted_secret:
            params["secret"] = decrypt(key_row.encrypted_secret, settings.SECRET_KEY)
        authenticated = True

    exchange: ccxt.Exchange = cls(params)
    try:
        ticker = await exchange.fetch_ticker(symbol)
        result = {
            "status": "ok",
            "exchange": exchange_id,
            "symbol": symbol,
            "price": ticker.get("last"),
            "bid": ticker.get("bid"),
            "ask": ticker.get("ask"),
            "authenticated": authenticated,
        }

        if authenticated:
            try:
                balance = await exchange.fetch_balance()
                total = balance.get("total", {})
                # Return top non-zero balances
                non_zero = {k: v for k, v in total.items() if v and float(v) > 0}
                result["balances"] = dict(list(non_zero.items())[:10])
                result["auth_status"] = "valid"
            except Exception as e:
                result["auth_status"] = f"invalid: {str(e)[:100]}"

        return result

    except ccxt.NetworkError as e:
        raise HTTPException(status_code=503, detail=f"Network error: {str(e)[:200]}")
    except ccxt.ExchangeError as e:
        raise HTTPException(status_code=400, detail=f"Exchange error: {str(e)[:200]}")
    finally:
        await exchange.close()


@router.get("/symbols")
async def list_symbols(exchange_id: str = Query("binance"), quote: str = Query("USDT")):
    """Return available trading symbols for an exchange filtered by quote currency."""
    cls = getattr(ccxt, exchange_id, None)
    if cls is None:
        raise HTTPException(status_code=400, detail=f"Unknown exchange: {exchange_id}")

    exchange: ccxt.Exchange = cls({"enableRateLimit": True})
    try:
        markets = await exchange.load_markets()
        symbols = [
            s for s in markets.keys()
            if s.endswith(f"/{quote}") and markets[s].get("active", True)
        ]
        return {"exchange": exchange_id, "quote": quote, "symbols": sorted(symbols)[:200]}
    finally:
        await exchange.close()
