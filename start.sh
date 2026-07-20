#!/bin/bash
set -e

DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$DIR/logs"

if [ -f "$DIR/.env" ]; then
  export $(grep -v '^#' "$DIR/.env" | xargs)
fi

echo "Using mitmproxy port: $MITM_PORT"
echo "Using Chrome debug port: $CHROME_DEBUG_PORT"

cleanup() {
    echo "Cleaning up..."

    [[ -n "$CHROME_PID" ]] && kill "$CHROME_PID" 2>/dev/null || true
    [[ -n "$MITM_PID" ]] && kill "$MITM_PID" 2>/dev/null || true
    pkill -f "mitmdump.*$MITM_PORT" 2>/dev/null || true

    exit 0
}

trap cleanup SIGINT SIGTERM EXIT


$HOME/.local/bin/mitmdump \
    --listen-port "$MITM_PORT" \
    -s "$DIR/main.py" \
    > "$DIR/logs/mitm.log" 2>&1 &

MITM_PID=$!

sleep 2


google-chrome \
    --remote-debugging-port="$CHROME_DEBUG_PORT" \
    --proxy-server="http://127.0.0.1:$MITM_PORT" \
    --user-data-dir="$HOME/chrome-mitm-profile" \
    > "$DIR/logs/chrome.log" 2>&1 &

CHROME_PID=$!

sleep 3

(
  cd "$DIR/playwright"
  node index.js > "$DIR/logs/playwright.log" 2>&1
)