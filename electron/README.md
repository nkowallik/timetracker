# TimeTracker desktop

Self-contained desktop version for Windows 10/11, Linux and macOS. An Electron
shell starts the SvelteKit server on a loopback port and opens a window on it.
No Docker and no separate server are needed.

Your data lives outside the install directory, so updates and reinstalls never
touch it:

- Windows: `%APPDATA%\TimeTracker\timetracker.db`
- Linux: `~/.config/TimeTracker/timetracker.db`
- macOS: `~/Library/Application Support/TimeTracker/timetracker.db`

Day boundaries use the machine's local timezone.

## Building

The build bundles the production output of the web app, so run it from a
checkout of the whole repository with Node.js LTS installed.

### Everything at once (Linux)

```sh
./build-all.sh
```

This rebuilds the web app, copies it into `app/build/` together with the
database migrations, and packages a Windows installer (`.exe`, needs `wine`),
a Linux AppImage and two macOS zips (Apple Silicon and Intel). Output lands in
`dist/`. Bump `version` in `package.json` to change the file names.

### One platform

```sh
cd .. && npm run build && cd electron
rm -rf app/build drizzle && mkdir -p app && cp -r ../build app/build && cp -r ../drizzle drizzle
npm install
npm run dist:win      # or dist:linux
```

`npm start` runs the app directly without packaging.

`npm install` downloads a prebuilt SQLite binary for Electron. If it fails with
compiler errors on Windows, install the Visual Studio Build Tools ("Desktop
development with C++") and Python, then rerun it. If npm reports that install
scripts are blocked, approve them:

```sh
npm install-scripts approve electron
npm install-scripts approve electron-winstaller
npm install-scripts approve better-sqlite3
npm install
```

## Installing

- **Windows**: run `dist\TimeTracker Setup <version>.exe`. The installer is
  unsigned, so SmartScreen warns on first run. Choose "More info", then "Run
  anyway".
- **Linux**: `chmod +x dist/TimeTracker-<version>.AppImage` and run it.
- **macOS**: unzip and drag `TimeTracker.app` to Applications. The app is not
  signed or notarized, so clear the quarantine flag once:

  ```sh
  xattr -cr /Applications/TimeTracker.app
  ```

  The macOS build has not been tested on a Mac.

## Moving data from the Docker setup

Stop the container first so the write-ahead log is checkpointed, then copy
`data/timetracker.db` from the repository to the data path listed above.

## How it works

`main.js` picks a free loopback port (preferring 45832), sets `DB_PATH`,
`PORT`, `HOST` and `ORIGIN`, and imports the SvelteKit server inside the
Electron main process. Migrations run at startup. Exports are saved to the
Downloads folder and revealed in the file manager.

`better-sqlite3` ships prebuilt binaries for every platform, so nothing is
compiled at build time and the macOS packages can be built on Linux.

No custom icon is configured. To add one, place `build/icon.ico` and
`build/icon.png` (512×512) in this folder and add `icon` entries to the `win`
and `linux` sections of `package.json`.
