#!/bin/bash
# NexaCleaner Pro — Double-click this file to launch
cd "$(dirname "$0")"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  NexaCleaner Pro — Starting..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ ! -d "node_modules/electron" ]; then
  echo "  First run: installing (takes 2-3 min, only once)..."
  npm install
fi

echo "  Launching NexaCleaner..."
./node_modules/.bin/electron .
