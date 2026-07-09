#!/bin/bash
export PATH="$HOME/.local/bin:$PATH"

# current dir
DIR="$(cd "$(dirname "$0")" && pwd)"

# launch mitmproxy in background
$HOME/.local/bin/mitmdump \
    -s "$DIR/main.py" &

MITM_PID=$!

# wait for the proxy to start
sleep 2

# start Chrome with the proxy
google-chrome \
  --proxy-server="http://127.0.0.1:8080" \
  --user-data-dir="$HOME/chrome-mitm-profile"

# when Chrome is closed, kill mitmproxy
kill $MITM_PID