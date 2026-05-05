import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_db
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="Trading AI",
    description="Multi-agent AI trading platform API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.routers import agents, api_keys, market_data, orders, ai_engine, system, websocket, broker  # noqa: E402

app.include_router(agents.router,      prefix="/api/agents",  tags=["agents"])
app.include_router(api_keys.router,    prefix="/api/keys",    tags=["api-keys"])
app.include_router(market_data.router, prefix="/api/market",  tags=["market"])
app.include_router(orders.router,      prefix="/api/trades",  tags=["trades"])
app.include_router(ai_engine.router,   prefix="/api/ai",      tags=["ai"])
app.include_router(system.router,      prefix="/api/system",  tags=["system"])
app.include_router(broker.router,      prefix="/api/broker",  tags=["broker"])
app.include_router(websocket.router,                          tags=["websocket"])


@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "version": "0.1.0"}
