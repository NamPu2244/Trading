#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Trading AI — First-time setup script for macOS
# Run once: bash scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERR]${NC}  $1"; exit 1; }

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ── 1. Check macOS prerequisites ──────────────────────────────────────────────
info "Checking prerequisites..."

command -v brew >/dev/null 2>&1 || error "Homebrew not found. Install from https://brew.sh"
command -v python3 >/dev/null 2>&1 || { warn "Python 3 not found — installing via Homebrew..."; brew install python@3.12; }
command -v node >/dev/null 2>&1 || { warn "Node.js not found — installing via Homebrew..."; brew install node; }

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1-2)
info "Python: $(python3 --version)"
info "Node:   $(node --version)"
info "npm:    $(npm --version)"

# ── 2. Backend Python virtual environment ─────────────────────────────────────
info "Setting up Python virtual environment..."
cd "$ROOT_DIR/backend"

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    success "Virtual environment created."
fi

source .venv/bin/activate
pip install --upgrade pip --quiet
# Install packages individually to avoid version conflict issues (pandas-ta numba issues on Apple Silicon)
pip install greenlet pydantic-settings fastapi "uvicorn[standard]" python-multipart \
    sqlalchemy aiosqlite litellm anthropic openai ccxt \
    pandas ta numpy cryptography python-dotenv "passlib[bcrypt]" \
    websockets httpx aiohttp psutil apscheduler \
    pydantic "python-jose[cryptography]" --quiet
success "Backend dependencies installed."

# ── 3. Backend .env ───────────────────────────────────────────────────────────
if [ ! -f ".env" ]; then
    cp .env.example .env
    # Generate a random SECRET_KEY
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/change-me-to-a-random-32-char-string-for-production/$SECRET/" .env
    else
        sed -i "s/change-me-to-a-random-32-char-string-for-production/$SECRET/" .env
    fi
    success ".env created with generated SECRET_KEY."
else
    warn ".env already exists — skipping."
fi

deactivate

# ── 4. Frontend Next.js setup ─────────────────────────────────────────────────
info "Setting up Next.js frontend..."
cd "$ROOT_DIR/frontend"

if [ ! -d "node_modules" ]; then
    npm install --silent
    success "Frontend dependencies installed."
else
    warn "node_modules already exists — skipping npm install."
fi

if [ ! -f ".env.local" ]; then
    cp .env.local.example .env.local
    success ".env.local created."
else
    warn ".env.local already exists — skipping."
fi

# ── 5. Optional: Check Ollama ─────────────────────────────────────────────────
echo ""
if command -v ollama >/dev/null 2>&1; then
    success "Ollama is installed: $(ollama --version 2>/dev/null || echo 'version unknown')"
else
    warn "Ollama not found. To use local AI models, install from https://ollama.ai"
    warn "Then run: ollama pull llama3.2"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Setup complete! Run: bash scripts/start.sh${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
