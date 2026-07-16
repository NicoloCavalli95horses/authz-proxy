#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"

# current dir
DIR="$(cd "$(dirname "$0")" && pwd)"

# load env
if [ -f "$DIR/.env" ]; then
  export $(grep -v '^#' "$DIR/.env" | xargs)
fi

echo "Using mitmproxy port: $MITM_PORT"

# logs dir
mkdir -p "$DIR/logs"

# start mitmproxy
$HOME/.local/bin/mitmdump \
    --listen-port "$MITM_PORT" \
    -s "$DIR/main.py" \
    > "$DIR/logs/mitm.log" 2>&1 &

MITM_PID=$!

# wait for the proxy to start
sleep 2

# start Chrome
google-chrome \
  --remote-debugging-port="$CHROME_DEBUG_PORT" \
  --proxy-server="http://127.0.0.1:$MITM_PORT" \
  --user-data-dir="$HOME/chrome-mitm-profile" \
  > logs/chrome.log 2>&1 &

CHROME_PID=$!

sleep 3

# start playwright
(
  cd "$DIR/playwright"
  node index.js > "$DIR/logs/playwright.log" 2>&1
)

# End session
wait $CHROME_PID
kill $MITM_PID