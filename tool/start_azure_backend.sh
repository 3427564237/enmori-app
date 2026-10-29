#!/bin/sh
# Azure's Linux image provides the managed HTTPS edge; this is the internal worker.
set -eu
cd /home/site/wwwroot
export PLAYWRIGHT_BROWSERS_PATH=/home/site/wwwroot/browsers
# Use the already approved pinned Playwright release's OS dependency list.
# Do not log settings, tokens or downloaded page contents.
if ! ./bin/node node_modules/playwright/cli.js install-deps chromium > /tmp/enmori-browser-deps.log 2>&1; then
  echo '{"phase":"browser-dependencies","category":"dependency-unavailable"}' >&2
  exit 1
fi
exec xvfb-run -a --server-args='-screen 0 1280x720x24' ./bin/node tool/azure_backend.mjs
