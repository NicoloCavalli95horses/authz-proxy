#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"

# current dir
DIR="$(cd "$(dirname "$0")" && pwd)"

# logs dir
mkdir -p "$DIR/logs"

# start mitmproxy
$HOME/.local/bin/mitmdump \
    -s "$DIR/main.py" \
    > "$DIR/logs/mitm.log" 2>&1 &

MITM_PID=$!

# wait for the proxy to start
sleep 2

# start Chrome
google-chrome \
  --remote-debugging-port=9222 \
  --proxy-server="http://127.0.0.1:8080" \
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