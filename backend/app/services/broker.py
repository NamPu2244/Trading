"""
Unified broker execution layer.
- Paper trading: simulates fills using current market price (no exchange calls).
- Live trading: routes through CCXT with error handling and order confirmation.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import ccxt.async_support as ccxt

from app.services.market_data import normalize_symbol


class BrokerError(Exception):
    pass


async def _get_current_price(exchange: ccxt.Exchange, symbol: str) -> float:
    ticker = await exchange.fetch_ticker(symbol)
    return float(ticker["last"] or ticker["close"] or 0)


async def execute_paper_trade(
    symbol: str,
    side: str,          # "BUY" or "SELL"
    amount_pct: float,  # % of balance to use
    balance: float,     # simulated balance in quote currency
    entry_price: float,
    stop_loss_pct: float,
    take_profit_pct: float,
) -> dict[str, Any]:
    """
    Simulate a trade fill. Returns a dict compatible with TradeCreate schema.
    """
    notional = balance * (amount_pct / 100)
    quantity = notional / entry_price if entry_price > 0 else 0

    if side == "BUY":
        sl = entry_price * (1 - stop_loss_pct / 100)
        tp = entry_price * (1 + take_profit_pct / 100)
    else:
        sl = entry_price * (1 + stop_loss_pct / 100)
        tp = entry_price * (1 - take_profit_pct / 100)

    return {
        "symbol": symbol,
        "side": side,
        "entry_price": entry_price,
        "quantity": quantity,
        "entry_value": notional,
        "stop_loss_price": round(sl, 8),
        "take_profit_price": round(tp, 8),
        "is_paper": True,
        "broker_order_id": None,
    }


async def execute_live_trade(
    exchange_id: str,
    symbol: str,
    side: str,
    amount_pct: float,
    api_key: str,
    secret: str,
    stop_loss_pct: float,
    take_profit_pct: float,
) -> dict[str, Any]:
    """
    Execute a real market order via CCXT.
    Fetches the current balance, sizes the order, and places it.
    """
    cls = getattr(ccxt, exchange_id, None)
    if cls is None:
        raise BrokerError(f"Unknown exchange: {exchange_id}")

    exchange: ccxt.Exchange = cls({"apiKey": api_key, "secret": secret, "enableRateLimit": True})
    ccxt_side = "buy" if side == "BUY" else "sell"

    try:
        # Determine quote currency from symbol (e.g. BTC/USDT → USDT)
        normalized = normalize_symbol(symbol, exchange_id)
        quote = normalized.split("/")[1] if "/" in normalized else "USDT"

        balance_data = await exchange.fetch_balance()
        available = float(balance_data["free"].get(quote, 0))
        if available <= 0:
            raise BrokerError(f"No available {quote} balance")

        notional = available * (amount_pct / 100)
        ticker = await exchange.fetch_ticker(normalized)
        price = float(ticker["last"])
        if price <= 0:
            raise BrokerError(f"Invalid price for {normalized}: {price}")

        quantity = notional / price

        # Round to exchange precision
        markets = await exchange.load_markets()
        if normalized in markets:
            precision = markets[normalized].get("precision", {}).get("amount", 8)
            quantity = exchange.amount_to_precision(normalized, quantity)

        order = await exchange.create_market_order(normalized, ccxt_side, float(quantity))
        fill_price = float(order.get("average") or order.get("price") or price)
        fill_qty = float(order.get("filled") or quantity)
        entry_value = fill_price * fill_qty

        if side == "BUY":
            sl = fill_price * (1 - stop_loss_pct / 100)
            tp = fill_price * (1 + take_profit_pct / 100)
        else:
            sl = fill_price * (1 + stop_loss_pct / 100)
            tp = fill_price * (1 - take_profit_pct / 100)

        return {
            "symbol": normalized,
            "side": side,
            "entry_price": fill_price,
            "quantity": fill_qty,
            "entry_value": entry_value,
            "stop_loss_price": round(sl, 8),
            "take_profit_price": round(tp, 8),
            "is_paper": False,
            "broker_order_id": str(order.get("id", "")),
        }

    finally:
        await exchange.close()


async def close_trade_paper(
    entry_price: float,
    exit_price: float,
    quantity: float,
    side: str,
) -> dict[str, Any]:
    """Calculate PnL for a closed paper trade."""
    if side == "BUY":
        pnl = (exit_price - entry_price) * quantity
    else:
        pnl = (entry_price - exit_price) * quantity

    pnl_pct = (pnl / (entry_price * quantity)) * 100 if entry_price > 0 else 0

    return {
        "exit_price": exit_price,
        "pnl": round(pnl, 8),
        "pnl_pct": round(pnl_pct, 4),
        "closed_at": datetime.now(timezone.utc),
    }
