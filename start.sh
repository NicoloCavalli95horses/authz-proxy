#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR/src/logs"

# read from .env
if [ -f "$DIR/.env" ]; then
  export $(grep -v '^#' "$DIR/.env" | xargs)
fi

echo "Using mitmproxy port: $MITM_PORT"
echo "Using Chrome debug port: $CHROME_DEBUG_PORT"

cleanup() {
  trap - EXIT SIGINT SIGTERM
  echo "Cleaning up..."

  kill "$PLAYWRIGHT_PID" 2>/dev/null || true
  kill "$CHROME_PID" 2>/dev/null || true
  kill "$MITM_PID" 2>/dev/null || true

  wait 2>/dev/null || true
}

trap cleanup SIGINT SIGTERM EXIT

# Start mitmdump
$DIR/.venv/bin/mitmdump \
    --listen-port "$MITM_PORT" \
    -s "$DIR/main.py" \
    > "$DIR/src/logs/mitm.log" 2>&1 &

MITM_PID=$!

sleep 2

# Start Chrome
google-chrome \
  --remote-debugging-port="$CHROME_DEBUG_PORT" \
  --proxy-server="http://127.0.0.1:$MITM_PORT" \
  --user-data-dir="$HOME/chrome-mitm-profile" \
  > "$DIR/src/logs/chrome.log" 2>&1 &

CHROME_PID=$!

sleep 3

# Build injectable bundle
(
  cd "$DIR/src/playwright"
  npx esbuild src/injectable/index.js \
    --bundle \
    --format=iife \
    --platform=browser \
    --minify \
    --sourcemap \
    --outfile=dist/injectable.min.js
) || exit 1

# Start Playwright
(
  cd "$DIR/src/playwright"
  node index.js > "$DIR/src/logs/playwright.log" 2>&1
) &

PLAYWRIGHT_PID=$!

# Wait until Chrome exits (or Ctrl+C is pressed)
wait "$CHROME_PID"