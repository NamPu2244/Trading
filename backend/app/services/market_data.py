"""
Market data service — fetches OHLCV from exchanges via CCXT,
caches to SQLite, and computes technical indicators via `ta`.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import ccxt.async_support as ccxt
import pandas as pd
import ta
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.models.ohlcv import OHLCVCache

# How many candles to fetch by default
DEFAULT_LIMIT = 200


def normalize_symbol(symbol: str, exchange_id: str) -> str:
    """Normalize symbol to CCXT format (e.g. BTCUSDT → BTC/USDT)."""
    s = symbol.upper().strip()
    if "/" not in s:
        # Try common quote currencies
        for quote in ("USDT", "USD", "BTC", "ETH", "BUSD", "USDC"):
            if s.endswith(quote):
                base = s[: -len(quote)]
                return f"{base}/{quote}"
    return s


def _build_exchange(exchange_id: str, api_key: str = "", secret: str = "") -> ccxt.Exchange:
    cls = getattr(ccxt, exchange_id, None)
    if cls is None:
        raise ValueError(f"Unknown exchange: {exchange_id}")
    params: dict[str, Any] = {"enableRateLimit": True}
    if api_key:
        params["apiKey"] = api_key
    if secret:
        params["secret"] = secret
    return cls(params)


async def fetch_ohlcv(
    exchange_id: str,
    symbol: str,
    timeframe: str,
    limit: int = DEFAULT_LIMIT,
    api_key: str = "",
    secret: str = "",
) -> list[dict[str, Any]]:
    """
    Fetch OHLCV candles from the exchange.
    Returns list of dicts: {ts, open, high, low, close, volume}.
    """
    exchange = _build_exchange(exchange_id, api_key, secret)
    try:
        raw = await exchange.fetch_ohlcv(symbol, timeframe=timeframe, limit=limit)
    finally:
        await exchange.close()

    return [
        {"ts": c[0], "open": c[1], "high": c[2], "low": c[3], "close": c[4], "volume": c[5]}
        for c in raw
    ]


async def get_ohlcv_cached(
    db: AsyncSession,
    exchange_id: str,
    symbol: str,
    timeframe: str,
    limit: int = DEFAULT_LIMIT,
    api_key: str = "",
    secret: str = "",
) -> list[dict[str, Any]]:
    """
    Return OHLCV from cache if available, otherwise fetch from exchange and cache.
    Always refreshes the most recent candles from the exchange.
    """
    # Fetch latest from exchange (always get fresh data for live use)
    fresh = await fetch_ohlcv(exchange_id, symbol, timeframe, limit, api_key, secret)

    if fresh:
        # Upsert into cache
        rows = [
            {
                "symbol": symbol,
                "exchange": exchange_id,
                "timeframe": timeframe,
                "ts": c["ts"],
                "open": c["open"],
                "high": c["high"],
                "low": c["low"],
                "close": c["close"],
                "volume": c["volume"],
                "created_at": datetime.now(timezone.utc),
            }
            for c in fresh
        ]
        stmt = sqlite_insert(OHLCVCache).values(rows)
        stmt = stmt.on_conflict_do_nothing(index_elements=["symbol", "exchange", "timeframe", "ts"])
        await db.execute(stmt)
        await db.commit()

    return fresh


def compute_indicators(candles: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Compute a standard set of technical indicators from OHLCV data.
    Returns a dict of the most recent indicator values.
    """
    if len(candles) < 20:
        return {}

    df = pd.DataFrame(candles)
    df = df.rename(columns={"ts": "timestamp"})
    df["close"] = df["close"].astype(float)
    df["high"] = df["high"].astype(float)
    df["low"] = df["low"].astype(float)
    df["volume"] = df["volume"].astype(float)

    # RSI
    df["rsi"] = ta.momentum.RSIIndicator(df["close"], window=14).rsi()

    # MACD
    macd = ta.trend.MACD(df["close"])
    df["macd"] = macd.macd()
    df["macd_signal"] = macd.macd_signal()
    df["macd_diff"] = macd.macd_diff()

    # Bollinger Bands
    bb = ta.volatility.BollingerBands(df["close"], window=20)
    df["bb_upper"] = bb.bollinger_hband()
    df["bb_middle"] = bb.bollinger_mavg()
    df["bb_lower"] = bb.bollinger_lband()

    # EMA
    df["ema_20"] = ta.trend.EMAIndicator(df["close"], window=20).ema_indicator()
    df["ema_50"] = ta.trend.EMAIndicator(df["close"], window=50).ema_indicator()

    # ATR (for volatility / stop-loss sizing)
    df["atr"] = ta.volatility.AverageTrueRange(df["high"], df["low"], df["close"], window=14).average_true_range()

    # Volume SMA
    df["volume_sma"] = df["volume"].rolling(20).mean()

    last = df.iloc[-1]
    prev = df.iloc[-2]

    def _f(val) -> float | None:
        try:
            v = float(val)
            return None if pd.isna(v) else round(v, 6)
        except (TypeError, ValueError):
            return None

    return {
        "rsi": _f(last["rsi"]),
        "macd": _f(last["macd"]),
        "macd_signal": _f(last["macd_signal"]),
        "macd_diff": _f(last["macd_diff"]),
        "bb_upper": _f(last["bb_upper"]),
        "bb_middle": _f(last["bb_middle"]),
        "bb_lower": _f(last["bb_lower"]),
        "ema_20": _f(last["ema_20"]),
        "ema_50": _f(last["ema_50"]),
        "atr": _f(last["atr"]),
        "volume_sma": _f(last["volume_sma"]),
        "price": _f(last["close"]),
        "price_change_pct": _f(
            ((last["close"] - prev["close"]) / prev["close"] * 100) if prev["close"] else None
        ),
    }
