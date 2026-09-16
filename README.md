# TimeTracker

[![CI](https://github.com/nkowallik/timetracker/actions/workflows/ci.yml/badge.svg)](https://github.com/nkowallik/timetracker/actions/workflows/ci.yml)

A local, single-user work-time tracker with two columns: **Job** on the left and
**PhD** on the right.

## Why this exists

I work as a research assistant and am pursuing a PhD at the same time. The
position is supposed to leave room for the doctorate, but I never managed to
find that time. I built this tool to find out where the hours actually went:
how much of my working time was really spent on the job, how much on the PhD,
and how far that was from the split I had intended. It grew into a general
flexitime tracker along the way, with vacation and sick-day handling and German
public holidays, because those were the things that kept skewing my numbers.

It is a personal project. It works for me, on my machine, for my situation.
See [No warranty](#no-warranty) below.

## What it does

- **One-click timers** per side. Starting one side stops the other. The running
  timer lives in the database, so reloads and restarts never lose time, and a
  timer left running overnight is split at midnight.
- **Manual entries** with start, end and an optional note. Same-side overlaps
  are rejected.
- **Job/PhD split** for the current week and all-time, compared against a
  target split you choose. The target is informational only.
- **Flexitime balance** against a weekly hour target, computed over completed
  weeks. Days you never tracked do not count against you.
- **Daily progress** against a daily hour target, with an alarm when you cross
  it.
- **Days off**: sick leave, vacation and public holidays, individually or as a
  date range. A marked day counts as fully worked for the balance.
- **Public holidays** for a German federal state, generated locally for the
  current and next year. No network access is needed.
- **Home office** marks that label a day without changing any totals.
- **Month overview** showing each day as a signed difference against the
  scheduled time.
- **Exports** to CSV, JSON (which also serves as a full backup) and a PDF
  report, filterable by date range and side.
- **PhD tracking off**: hide the PhD column and all split displays to use it
  as a plain single-job tracker. Nothing is deleted when you switch.
- Light, dark and system theme.

## Running it

### Docker

```sh
docker compose up -d --build
```

Open <http://localhost:3000>. The SQLite database is stored in `./data/` on
the host, so it survives container and image deletion. Set `TZ` in
`docker-compose.yml` to your timezone. It decides where midnight falls.

### Desktop app

The [`electron/`](electron/) folder wraps the same app in an Electron shell for
Windows 10/11, Linux and macOS. It starts the server on a loopback port and
opens a window on it, so once built it needs neither Docker nor Node.js. Your
data is stored outside the install directory and survives updates:

- Windows: `%APPDATA%\TimeTracker\timetracker.db`
- Linux: `~/.config/TimeTracker/timetracker.db`
- macOS: `~/Library/Application Support/TimeTracker/timetracker.db`

Day boundaries follow the machine's local timezone. Exports are saved to your
Downloads folder.

To build all installers on Linux (Windows needs `wine`):

```sh
cd electron && ./build-all.sh
```

This produces an NSIS installer for Windows, an AppImage for Linux and zips for
Apple Silicon and Intel Macs in `electron/dist/`. The builds are unsigned, so
Windows SmartScreen and macOS Gatekeeper warn on first launch. The macOS build
has not been tested on a Mac. Per-platform builds, data migration from Docker
and troubleshooting are in [`electron/README.md`](electron/README.md).

### From source

```sh
npm install
npm run dev
```

The dev server uses `./data/timetracker.db`.

## Using it

### Tracking time

The main page shows one day. Use the arrows or the ←/→ keys to move between
days. On today's page each column has a start/stop button. On any day you can
add a window by hand with "+ add window", and click an existing row to edit or
delete it. Deleting offers an undo for a few seconds.

Windows that end and start within a minute of each other are shown as one row.

### Targets and balance

Everything here is optional and set under **Settings** (the ⚙ menu in the
header):

- **Target split** (default 50/50) draws a marker on the split bars and drives
  the "to balance" chip above the columns.
- **Weekly hour target** enables the flexitime balance. Each tracked Monday to
  Friday adds one fifth of the weekly target to what is expected. Saturdays and
  Sundays are never expected. The current week is excluded until it ends.
- **Starting overtime** carries a balance you had before you started using the
  app. It may be negative.
- **Daily hour target** enables the progress bar under the date and the
  overtime alarm.
- **Week starts on** decides where weeks begin for the summary and the balance.

### Days off

Under the date, "mark this day" lets you flag the viewed day as Sick, Vacation,
Holiday or Home office. A day marked Sick, Vacation or Holiday counts as if the
scheduled time had been worked: it adds no tracked hours and is dropped from
the weekly target, so your balance is unaffected. Time you did track on such a
day still counts.

For longer absences use **Settings → Add vacation…** or **Add sick leave…**
and enter a date range. Weekends and public holidays in the range are skipped.

Home office is a label only. The day stays an ordinary working day.

### Public holidays

Pick your **Bundesland** under Settings → Public holidays. The state-wide
public holidays of the current and the next year are marked as Holiday
automatically. Each new year is added the first time you open the app that
year. Holidays on weekends are not marked. Days you marked by hand are never
overwritten.

Only the sixteen German federal states are supported. Regional holidays that
apply to parts of a state only, such as Mariä Himmelfahrt in Catholic parts of
Bavaria or Fronleichnam in parts of Saxony and Thuringia, are not generated.
Mark those by hand. Removing a generated holiday keeps it removed until the
state setting changes or a new year begins.

### PhD tracking

Settings → **PhD tracking** switches the PhD column on or off. With it off the
tracker shows a single list, and the split bars, the target slider and the
balance chip disappear. Existing PhD entries stay in the list, the totals and
every export. Switching it back on restores the two-column view.

### Month overview

Settings → **Month overview…** opens a calendar. Each day shows its worked
time as a signed difference against the scheduled day, green when over and
red when under. Vacation, sick leave, holidays and home-office days appear as
labelled bars. Click a day to jump to it. ←/→ switch months.

### Exports and backups

**Export as…** in the header produces CSV, JSON and PDF for a date range and,
optionally, one side. The JSON export contains every window, every day mark
and every setting, so it is a complete record of your data. Day marks appear
in all three formats.

There is no import. To back up, copy the SQLite database file while the app is
stopped. To restore, copy it back.

## Limitations

- Single user, no authentication. Do not expose it to the internet.
- Public holidays are limited to the German federal states.
- The overtime model assumes a five-day week with equal daily hours.
- Day boundaries follow the server's timezone. Client and server should be in
  the same one.
- The desktop build is unsigned. Windows and macOS will warn on first launch.

## Development

```sh
npm install
npm run dev        # dev server
npm test           # unit tests
npm run check      # type check
npm run build      # production build
```

Schema changes: edit `src/lib/server/db/schema.ts`, then run
`npx drizzle-kit generate`. Migrations in `drizzle/` run at startup.

Built with SvelteKit (Svelte 5), SQLite via Drizzle ORM and better-sqlite3,
Tailwind CSS 4 and pdfmake. Every push and pull request runs the type check, the unit tests and a
production build on GitHub Actions. The badge at the top links to the runs.

## No warranty

This software is provided as is, without warranty of any kind, express or
implied. It was written for my own use and has not been tested beyond that.
Time and balance figures it produces are not suitable as a legal record of
working hours. Use it at your own risk and keep your own backups.
