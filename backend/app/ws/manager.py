"""
WebSocket connection manager.
Supports per-agent rooms so the frontend only receives logs for the
agent it's currently viewing, plus a global broadcast channel.
"""
from __future__ import annotations

import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        # agent_id → list of connected WebSocket clients
        self._rooms: dict[int, list[WebSocket]] = defaultdict(list)
        # Global subscribers (dashboard overview)
        self._global: list[WebSocket] = []

    # ── Connection lifecycle ────────────────────────────────────────────────────

    async def connect_agent(self, agent_id: int, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms[agent_id].append(ws)

    async def connect_global(self, ws: WebSocket) -> None:
        await ws.accept()
        self._global.append(ws)

    def disconnect_agent(self, agent_id: int, ws: WebSocket) -> None:
        self._rooms[agent_id].discard(ws) if hasattr(self._rooms[agent_id], "discard") else None
        try:
            self._rooms[agent_id].remove(ws)
        except ValueError:
            pass

    def disconnect_global(self, ws: WebSocket) -> None:
        try:
            self._global.remove(ws)
        except ValueError:
            pass

    # ── Broadcast helpers ───────────────────────────────────────────────────────

    async def broadcast_agent(self, agent_id: int, payload: dict[str, Any]) -> None:
        """Send a message to all clients subscribed to a specific agent."""
        message = json.dumps(payload)
        dead: list[WebSocket] = []
        for ws in list(self._rooms[agent_id]):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_agent(agent_id, ws)

    async def broadcast_global(self, payload: dict[str, Any]) -> None:
        """Send a message to all global dashboard subscribers."""
        message = json.dumps(payload)
        dead: list[WebSocket] = []
        for ws in list(self._global):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect_global(ws)

    async def emit_log(
        self,
        agent_id: int,
        level: str,
        message: str,
        meta: dict[str, Any] | None = None,
        symbol: str | None = None,
    ) -> None:
        """Convenience wrapper used by services to stream logs."""
        payload = {
            "type": "log",
            "agent_id": agent_id,
            "level": level,
            "message": message,
            "symbol": symbol,
            "meta": meta or {},
        }
        await self.broadcast_agent(agent_id, payload)
        await self.broadcast_global(payload)

    async def emit_agent_status(self, agent_id: int, status: str, extra: dict | None = None) -> None:
        payload = {"type": "agent_status", "agent_id": agent_id, "status": status, **(extra or {})}
        await self.broadcast_agent(agent_id, payload)
        await self.broadcast_global(payload)


# Module-level singleton — imported by services and routers
manager = ConnectionManager()
