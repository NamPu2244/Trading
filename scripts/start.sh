#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Trading AI — Start backend + frontend concurrently
# Run: bash scripts/start.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down...${NC}"
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    echo -e "${GREEN}Stopped.${NC}"
}
trap cleanup INT TERM

# ── Backend ───────────────────────────────────────────────────────────────────
echo -e "${BLUE}Starting FastAPI backend on http://localhost:8000 ...${NC}"
cd "$ROOT_DIR/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
deactivate

# ── Frontend ──────────────────────────────────────────────────────────────────
echo -e "${BLUE}Starting Next.js frontend on http://localhost:3000 ...${NC}"
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Backend:  http://localhost:8000${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}  API Docs: http://localhost:8000/docs${NC}"
echo -e "${GREEN}  Press Ctrl+C to stop both servers${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

wait
