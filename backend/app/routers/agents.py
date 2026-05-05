"""Agent CRUD + start/stop/run-now endpoints."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.agent import Agent, AgentStatus
from app.models.trade import Trade
from app.schemas.agent import AgentCreate, AgentOut, AgentStatusUpdate, AgentUpdate
from app.schemas.trade import TradeOut
from app.services.agent_runner import run_agent_cycle
from app.ws.manager import manager

router = APIRouter()


def _load_opts():
    return [
        selectinload(Agent.broker_api_key),
        selectinload(Agent.ai_api_key),
    ]


async def _get_or_404(db: AsyncSession, agent_id: int) -> Agent:
    result = await db.execute(
        select(Agent).options(*_load_opts()).where(Agent.id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


# ── CRUD ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AgentOut])
async def list_agents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Agent).options(*_load_opts()).order_by(Agent.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AgentOut, status_code=status.HTTP_201_CREATED)
async def create_agent(body: AgentCreate, db: AsyncSession = Depends(get_db)):
    # Check name uniqueness
    existing = await db.execute(select(Agent).where(Agent.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Agent '{body.name}' already exists")

    agent = Agent(**body.model_dump())
    db.add(agent)
    await db.flush()
    await db.refresh(agent)
    return agent


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    return await _get_or_404(db, agent_id)


@router.patch("/{agent_id}", response_model=AgentOut)
async def update_agent(agent_id: int, body: AgentUpdate, db: AsyncSession = Depends(get_db)):
    agent = await _get_or_404(db, agent_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    agent.updated_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(agent)
    return agent


@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_agent(agent_id: int, db: AsyncSession = Depends(get_db)):
    agent = await _get_or_404(db, agent_id)
    if agent.is_active:
        raise HTTPException(status_code=400, detail="Stop the agent before deleting")
    await db.delete(agent)


# ── Status Control ────────────────────────────────────────────────────────────

@router.post("/{agent_id}/status", response_model=AgentOut)
async def set_agent_status(
    agent_id: int,
    body: AgentStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    agent = await _get_or_404(db, agent_id)
    agent.is_active = body.is_active
    agent.status = AgentStatus.IDLE if body.is_active else AgentStatus.PAUSED
    agent.updated_at = datetime.now(timezone.utc)
    if not body.is_active:
        agent.error_message = None
    await db.flush()
    await db.refresh(agent)
    await manager.emit_agent_status(agent.id, agent.status.value)
    return agent


@router.post("/{agent_id}/run", response_model=AgentOut)
async def run_agent_now(agent_id: int, db: AsyncSession = Depends(get_db)):
    """
    Trigger one immediate trading cycle (useful for testing).
    This runs synchronously in the request — for production, the scheduler fires cycles.
    """
    agent = await _get_or_404(db, agent_id)
    if not agent.is_active:
        raise HTTPException(status_code=400, detail="Agent must be active to run a cycle")
    await run_agent_cycle(db, agent)
    await db.refresh(agent)
    return agent


# ── Trade History ─────────────────────────────────────────────────────────────

@router.get("/{agent_id}/trades", response_model=list[TradeOut])
async def get_agent_trades(
    agent_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    await _get_or_404(db, agent_id)
    result = await db.execute(
        select(Trade)
        .where(Trade.agent_id == agent_id)
        .order_by(Trade.opened_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


# ── Logs ──────────────────────────────────────────────────────────────────────

@router.get("/{agent_id}/logs")
async def get_agent_logs(
    agent_id: int,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    from app.models.log import AgentLog
    from app.schemas.log import LogOut
    await _get_or_404(db, agent_id)
    result = await db.execute(
        select(AgentLog)
        .where(AgentLog.agent_id == agent_id)
        .order_by(AgentLog.created_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [LogOut.model_validate(log) for log in reversed(logs)]
