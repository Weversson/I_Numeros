#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

(cd backend && ./venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000) &
BACK_PID=$!
trap 'kill $BACK_PID 2>/dev/null' EXIT

cd frontend
npm run dev
