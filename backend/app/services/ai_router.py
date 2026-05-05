"""
AI Router — unified interface to Cloud AI (via LiteLLM) and Local AI (Ollama).

Input:  agent config + OHLCV candles + indicator snapshot
Output: AIDecision(action, amount_pct, reason, confidence)
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

import litellm
from litellm import acompletion

from app.core.config import get_settings
from app.models.agent import AIProvider

settings = get_settings()

# Suppress LiteLLM's verbose logging in production
litellm.set_verbose = False


@dataclass
class AIDecision:
    action: str           # BUY | SELL | HOLD
    amount_pct: float     # % of available balance to use (0–100)
    reason: str
    confidence: float     # 0.0 – 1.0
    raw_response: str     # full AI output for logging


SYSTEM_PROMPT_TEMPLATE = """You are an expert algorithmic trading AI assistant.
You will be given real-time market data (OHLCV candles and technical indicators) for a trading symbol.
Your job is to analyze the data and return a trading decision.

Strategy context:
{strategy}

Risk parameters:
- Stop Loss: {stop_loss}%
- Take Profit: {take_profit}%
- Max position size: {position_size}% of balance

CRITICAL: You MUST respond with ONLY a valid JSON object in this exact format:
{{
  "action": "BUY" | "SELL" | "HOLD",
  "amount_pct": <number 1-100>,
  "reason": "<concise explanation under 200 chars>",
  "confidence": <number 0.0-1.0>
}}

Do not include any text outside the JSON object."""


def _build_user_message(
    symbol: str,
    timeframe: str,
    candles: list[dict[str, Any]],
    indicators: dict[str, Any],
) -> str:
    # Send the last 20 candles (enough context, keeps tokens low)
    recent = candles[-20:] if len(candles) > 20 else candles
    candle_rows = "\n".join(
        f"  {i+1}. ts={c['ts']} O={c['open']} H={c['high']} L={c['low']} C={c['close']} V={c['volume']:.2f}"
        for i, c in enumerate(recent)
    )

    ind_lines = "\n".join(
        f"  {k}: {v}" for k, v in indicators.items() if v is not None
    )

    return f"""Symbol: {symbol}
Timeframe: {timeframe}
Current Price: {indicators.get('price', 'N/A')}

Recent OHLCV ({len(recent)} candles, newest last):
{candle_rows}

Technical Indicators:
{ind_lines}

Analyze the above data and return your trading decision as JSON."""


def _parse_decision(raw: str) -> AIDecision:
    """Extract and validate the JSON decision from AI output."""
    # Try to extract JSON even if the model added extra text
    json_match = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
    if not json_match:
        raise ValueError(f"No JSON found in AI response: {raw[:200]}")

    data = json.loads(json_match.group())

    action = str(data.get("action", "HOLD")).upper().strip()
    if action not in ("BUY", "SELL", "HOLD"):
        action = "HOLD"

    amount_pct = float(data.get("amount_pct", 10.0))
    amount_pct = max(1.0, min(100.0, amount_pct))

    confidence = float(data.get("confidence", 0.5))
    confidence = max(0.0, min(1.0, confidence))

    reason = str(data.get("reason", "No reason provided"))[:500]

    return AIDecision(
        action=action,
        amount_pct=amount_pct,
        reason=reason,
        confidence=confidence,
        raw_response=raw,
    )


def _build_model_string(provider: AIProvider, model: str) -> str:
    """Build the LiteLLM model identifier string."""
    if provider == AIProvider.OLLAMA:
        return f"ollama/{model}"
    elif provider == AIProvider.ANTHROPIC:
        # LiteLLM uses anthropic/ prefix automatically for claude models
        return model if model.startswith("claude") else f"anthropic/{model}"
    elif provider == AIProvider.OPENAI:
        return model  # LiteLLM defaults to OpenAI
    return model


async def get_ai_decision(
    provider: AIProvider,
    model: str,
    strategy_prompt: str,
    symbol: str,
    timeframe: str,
    candles: list[dict[str, Any]],
    indicators: dict[str, Any],
    risk_stop_loss_pct: float,
    risk_take_profit_pct: float,
    risk_position_size_pct: float,
    api_key: str | None = None,
    ollama_base_url: str | None = None,
) -> AIDecision:
    """
    Route an AI decision request to the appropriate provider.
    Raises on connection/parse failure.
    """
    system_msg = SYSTEM_PROMPT_TEMPLATE.format(
        strategy=strategy_prompt,
        stop_loss=risk_stop_loss_pct,
        take_profit=risk_take_profit_pct,
        position_size=risk_position_size_pct,
    )
    user_msg = _build_user_message(symbol, timeframe, candles, indicators)
    model_str = _build_model_string(provider, model)

    # Build kwargs for LiteLLM
    kwargs: dict[str, Any] = {
        "model": model_str,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "max_tokens": 512,
        "temperature": 0.3,  # Low temperature for consistent JSON
    }

    if provider == AIProvider.ANTHROPIC and api_key:
        kwargs["api_key"] = api_key
    elif provider == AIProvider.OPENAI and api_key:
        kwargs["api_key"] = api_key
    elif provider == AIProvider.OLLAMA:
        kwargs["api_base"] = ollama_base_url or settings.OLLAMA_BASE_URL

    response = await acompletion(**kwargs)
    raw = response.choices[0].message.content or ""
    return _parse_decision(raw)


async def stream_ai_reasoning(
    provider: AIProvider,
    model: str,
    strategy_prompt: str,
    symbol: str,
    timeframe: str,
    candles: list[dict[str, Any]],
    indicators: dict[str, Any],
    risk_stop_loss_pct: float,
    risk_take_profit_pct: float,
    risk_position_size_pct: float,
    api_key: str | None = None,
    ollama_base_url: str | None = None,
):
    """
    Async generator that yields text chunks from the AI as it thinks.
    Use for the 'AI Thinking' live stream in the dashboard.
    """
    system_msg = SYSTEM_PROMPT_TEMPLATE.format(
        strategy=strategy_prompt,
        stop_loss=risk_stop_loss_pct,
        take_profit=risk_take_profit_pct,
        position_size=risk_position_size_pct,
    )
    user_msg = _build_user_message(symbol, timeframe, candles, indicators)
    model_str = _build_model_string(provider, model)

    kwargs: dict[str, Any] = {
        "model": model_str,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
        "max_tokens": 512,
        "temperature": 0.3,
        "stream": True,
    }

    if provider == AIProvider.ANTHROPIC and api_key:
        kwargs["api_key"] = api_key
    elif provider == AIProvider.OPENAI and api_key:
        kwargs["api_key"] = api_key
    elif provider == AIProvider.OLLAMA:
        kwargs["api_base"] = ollama_base_url or settings.OLLAMA_BASE_URL

    full_text = ""
    async for chunk in await acompletion(**kwargs):
        delta = chunk.choices[0].delta.content or ""
        if delta:
            full_text += delta
            yield delta

    # After streaming completes, yield the parsed decision as a final sentinel
    try:
        decision = _parse_decision(full_text)
        yield f"\n__DECISION__:{json.dumps({
            'action': decision.action,
            'amount_pct': decision.amount_pct,
            'reason': decision.reason,
            'confidence': decision.confidence,
        })}"
    except Exception:
        yield "\n__DECISION__:null"
