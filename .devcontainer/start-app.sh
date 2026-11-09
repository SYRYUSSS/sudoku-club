#!/usr/bin/env bash
set -euo pipefail

cd /workspace

frontend_origin="http://localhost:5173"
if [ "${CODESPACES:-false}" = "true" ]; then
  frontend_origin="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
fi

export FRONTEND_ORIGIN="$frontend_origin"
export SECRET_KEY_BASE="${SECRET_KEY_BASE:-$(bundle exec rails secret)}"

bundle exec rails db:prepare
nohup bundle exec rails server -b 0.0.0.0 -p 3000 > /tmp/sudoku-rails.log 2>&1 &
nohup env VITE_API_PROXY_TARGET=http://localhost:3000 npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173 > /tmp/sudoku-vite.log 2>&1 &
