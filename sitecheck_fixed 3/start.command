#!/bin/bash
cd "$(dirname "$0")"
echo "Starting The Melt Studio…"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node.js 20+ and run this file again."
  read -n 1 -s -r -p "Press any key to close…"
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install
fi
npm start
