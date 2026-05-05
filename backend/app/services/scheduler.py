"""
APScheduler-based agent cycle runner.
Each active agent gets a cron job matching its timeframe.
The scheduler is started/stopped via FastAPI lifespan.
"""
from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.agent import Agent, AgentStatus
from app.services.agent_runner import run_agent_cycle

logger = logging.getLogger(__name__)

# Timeframe string → seconds between cycles
TIMEFRAME_SECONDS: dict[str, int] = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
    "1d": 86400,
}

scheduler = AsyncIOScheduler()


async def _run_all_active_agents() -> None:
    """Called by the scheduler — runs cycles for all active agents."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Agent).where(Agent.is_active == True, Agent.status != AgentStatus.ERROR)  # noqa: E712
        )
        agents = result.scalars().all()

    for agent in agents:
        async with AsyncSessionLocal() as db:
            # Re-fetch within its own session
            fresh = await db.get(Agent, agent.id)
            if fresh and fresh.is_active:
                try:
                    await run_agent_cycle(db, fresh)
                except Exception as e:
                    logger.error(f"Scheduler: agent {agent.id} cycle failed: {e}")


def start_scheduler() -> None:
    """Register a job that fires every minute and dispatches per-agent cycles."""
    if not scheduler.running:
        scheduler.add_job(
            _run_all_active_agents,
            trigger=IntervalTrigger(seconds=60),
            id="agent_master_cycle",
            replace_existing=True,
            misfire_grace_time=30,
        )
        scheduler.start()
        logger.info("Agent scheduler started.")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Agent scheduler stopped.")
