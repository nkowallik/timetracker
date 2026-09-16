#!/usr/bin/env bash
# Rebuild the web app and package Windows, Linux and macOS builds into dist/.
# Needs node and wine (for the Windows installer).
set -euo pipefail
cd "$(dirname "$0")"

echo "==> Building SvelteKit app"
(cd .. && npm run build)

echo "==> Refreshing bundled app/build and drizzle/"
rm -rf app/build drizzle
mkdir -p app
cp -r ../build app/build
cp -r ../drizzle drizzle

if [ ! -d node_modules ]; then
	echo "==> Installing Electron dependencies"
	npm install
fi

echo "==> Packaging Windows installer + Linux AppImage + macOS zips"
npx electron-builder --win --linux --mac

echo
echo "Done:"
ls -lh dist/*.exe dist/*.AppImage dist/*-mac.zip
