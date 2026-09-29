#!/bin/bash
# usage: shot.sh <warp-seconds> <out.png> [w] [h]
cd "$(dirname "$0")/.."
PORT=8765
if ! curl -s -o /dev/null http://localhost:$PORT/index.html; then
  python3 -m http.server $PORT >/dev/null 2>&1 &
  sleep 1
fi
W=${3:-1600}; H=${4:-900}
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu-sandbox \
  --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist \
  --window-size=$W,$H --hide-scrollbars --virtual-time-budget=4000 \
  --enable-logging=stderr --v=0 \
  --screenshot="$2" "http://localhost:$PORT/index.html?warp=$1" 2>&1 | grep -iE "error|uncaught|console" | head -20
ls -la "$2"
