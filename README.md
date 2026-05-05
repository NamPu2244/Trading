# Trading AI — Multi-Agent Algorithmic Trading Platform

A web-based AI trading bot platform for macOS. Create and manage multiple AI Trading Agents, each with their own strategy, risk parameters, and AI model (Cloud or Local via Ollama).

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Lightweight Charts |
| Backend | Python 3.12, FastAPI, SQLAlchemy, SQLite |
| AI Routing | LiteLLM (Anthropic, OpenAI, Ollama) |
| Broker/Data | CCXT (crypto), pandas-ta (indicators) |

## Quick Start

```bash
# 1. First-time setup (installs all dependencies)
bash scripts/setup.sh

# 2. Start both servers (backend + frontend)
bash scripts/start.sh

# 3. Open in browser
open http://localhost:3000

# Stop everything
bash scripts/stop.sh
```

## URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

## Prerequisites

- macOS (Apple Silicon or Intel)
- [Homebrew](https://brew.sh)
- Python 3.12+
- Node.js 20+
- [Ollama](https://ollama.ai) (optional, for local AI models)

## Project Structure

```
trading-ai/
├── backend/        # FastAPI backend
├── frontend/       # Next.js frontend
└── scripts/        # Setup & startup scripts
```
# Trading
