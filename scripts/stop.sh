#!/usr/bin/env bash
# Kill any running uvicorn and next-server processes
pkill -f "uvicorn app.main:app" 2>/dev/null && echo "Backend stopped." || echo "Backend not running."
pkill -f "next-server" 2>/dev/null && echo "Frontend stopped." || echo "Frontend not running."
pkill -f "next dev" 2>/dev/null || true
