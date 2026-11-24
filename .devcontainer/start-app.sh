#!/usr/bin/env bash
set -euo pipefail

cd /workspace

frontend_origin="http://localhost:5173"
if [ "${CODESPACES:-false}" = "true" ]; then
  frontend_origin="https://${CODESPACE_NAME}-5173.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
fi

export FRONTEND_ORIGIN="$frontend_origin"
if [ -z "${SECRET_KEY_BASE:-}" ]; then
  if [ ! -f /tmp/.sudoku_secret_key_base ]; then
    bundle exec rails secret > /tmp/.sudoku_secret_key_base
    chmod 600 /tmp/.sudoku_secret_key_base
  fi
  SECRET_KEY_BASE="$(cat /tmp/.sudoku_secret_key_base)"
fi
export SECRET_KEY_BASE

bundle exec rails db:prepare

if ! pgrep -f "puma.*3000|rails server" > /dev/null 2>&1; then
  setsid nohup bundle exec rails server -b 0.0.0.0 -p 3000 < /dev/null > /tmp/sudoku-rails.log 2>&1 &
fi

if ! pgrep -f "vite.*5173" > /dev/null 2>&1; then
  if ! node -e "require('./frontend/node_modules/rollup/dist/native.js')" > /dev/null 2>&1; then
    rm -rf frontend/node_modules
    npm --prefix frontend install --no-package-lock --no-audit --no-fund
  fi
  setsid nohup env VITE_API_PROXY_TARGET=http://localhost:3000 npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173 < /dev/null > /tmp/sudoku-vite.log 2>&1 &
fi

sleep 2
