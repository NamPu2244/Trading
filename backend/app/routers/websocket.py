"""WebSocket endpoints — per-agent log stream and global dashboard stream."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.ws.manager import manager

router = APIRouter()


@router.websocket("/ws/agents/{agent_id}")
async def ws_agent(agent_id: int, websocket: WebSocket):
    """Subscribe to real-time logs for a specific agent."""
    await manager.connect_agent(agent_id, websocket)
    try:
        while True:
            # Keep alive — client can send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_agent(agent_id, websocket)


@router.websocket("/ws/global")
async def ws_global(websocket: WebSocket):
    """Subscribe to all agent events (dashboard overview)."""
    await manager.connect_global(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_global(websocket)
