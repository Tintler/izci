# İzci — Usage Guide

A walkthrough of every screen, button and setting in the app.

## Contents

1. [First run](#first-run)
2. [The Drives screen](#the-drives-screen)
3. [Adding a drive](#adding-a-drive)
4. [Indexing a drive](#indexing-a-drive)
5. [Browsing a drive](#browsing-a-drive)
6. [Searching](#searching)
7. [Sorting and column widths](#sorting-and-column-widths)
8. [Labels](#labels)
9. [Language](#language)
10. [Where your data lives](#where-your-data-lives)
11. [Building an executable](#building-an-executable)
12. [Running the tests](#running-the-tests)
13. [Project layout](#project-layout)
14. [Tips and limitations](#tips-and-limitations)

---

## First run

When you launch İzci nothing is indexed yet, so the *Drives* screen is empty.
That is expected — indexing is always something **you** opt into.

The app does not watch for drive changes in the background. It reads the list of
connected drives only when you press **Refresh**. Nothing runs while the app is
closed.

## The Drives screen

This is the main screen and it shows **only the drives you have chosen to index**.

- The bar at the top summarises your indexed drives: how many there are, how many
  are currently connected, total capacity, used space and free space.
- Each drive appears as a card showing:
  - its label (your custom label if you set one, otherwise the volume label),
  - the drive letter badge (e.g. `F:`),
  - the filesystem type,
  - a fullness bar,
  - used / free / total size,
  - a **Connected / Not connected** badge.

A drive you indexed earlier but that is currently unplugged still shows here, with
a "not connected" badge — that is the whole point of the app.

## Adding a drive

Open **Add drive** in the left sidebar. This lists **every drive currently
connected**, indexed or not.

- Each card has an **Index** switch. Turn it on to add the drive to your indexed
  set; it then appears on the *Drives* screen.
- Turn the switch off to remove it from your indexed set. Its data stays in the
  database until you re-index, but it no longer appears on the main screen.

Press **Refresh** (top right) to re-read the connected drives. Use this after
plugging or unplugging a drive.

> Your system drive (usually `C:`) will show up here like any other. It is **not**
> indexed unless you turn its switch on.

## Indexing a drive

On the *Drives* screen, an indexed card has a **↻** (Scan now) button.

1. Make sure the drive is plugged in.
2. Press **↻**. A progress note appears under the card ("Scanning… N entries").
3. When it finishes, a summary tells you how many entries were found, how many
   were newly written, how many were skipped (unchanged) and how many were removed.

**Re-scanning is incremental.** The second scan of an unchanged drive reports
`Written: 0` and a large `Skipped` count — it does not rewrite what has not
changed.

You do not have to re-index to keep using the app; the index is only as fresh as
your last scan.

## Browsing a drive

Click anywhere on an indexed drive card (on the *Drives* screen) to open the
**Browse** view for that drive.

- Folders and files are listed; folders come first.
- Each row shows a type icon, the name, whether it is a folder or a file, the
  parent folder and the size.
- **Click a folder** to go into it.
- Use the **← Back** button or the breadcrumb trail at the top to move back up the
  tree. Clicking any breadcrumb segment jumps straight to that folder.

Browsing works while the drive is unplugged.

## Searching

Type in the search box at the top and press **Enter**.

- Search runs across **all indexed drives**.
- Matching is prefix-based and case-insensitive (`film` finds `film_2024.mkv`).
- Matches are highlighted in the name and path columns.
- The summary line shows how many results were found.
- Clearing the box clears the results.
- Folders are listed before files.

Large result sets are rendered with virtual scrolling — only the rows on screen
are drawn — so tens of thousands of hits stay smooth.

## Sorting and column widths

In both the *Search* and *Browse* views:

- **Click a column header** to sort by it. Click again to reverse the order. The
  current sort direction is shown with an arrow.
  - **Name** — alphabetical.
  - **Type** — folders, then images, video, audio, then other files (Browse view).
  - **Size** — ascending / descending.
- The default sort is **by name, ascending**.
- Folders are always kept above files, regardless of the sort key.

**Column widths:** drag the divider at the right edge of a header to resize it.
The neighbouring column adjusts so the total stays the same, and each column has a
minimum width. Your widths are **remembered** between sessions.

## Labels

Each drive can have a **custom label** that lives only inside İzci and is
independent of the volume label on the disk.

- On a drive card, click the **✎** (Edit label) button.
- Type a name (e.g. "Backup 4TB") and save. Saving an empty value clears the label.
- The custom label is shown on the card and used as the drive name in search and
  browse results. It is visible even when the drive is unplugged.

## Language

Use the **TR / EN** selector in the top-right corner to switch the interface
language. Your choice is remembered and restored on the next launch.

## Where your data lives

The database (`izci.db`, SQLite) is stored **outside** the indexed drives so it is
always available:

- **Portable executable:** `izci.db` is created **next to the `.exe`**.
- **Running from source:** `%APPDATA%\izci\izci.db`.

Because the two modes use different locations, they keep separate indexes. To move
an existing index to a portable build, copy the `izci.db` file next to the
executable.

## Building an executable

Build a portable, single-file Windows executable with:

```
npm run dist
```

The output is written to `release/izci.exe`. Its database is created **next to the
`.exe`**, so the whole thing is self-contained and can live on a USB stick.

The application icon is taken from `build/izci.ico`. Replace that file if you want
a different icon.

> The database location differs by mode: the portable build writes `izci.db`
> beside the `.exe`, while running from source writes to `%APPDATA%\izci\izci.db`.

## Running the tests

```
npm test
```

Uses the built-in `node:test` runner — no extra test dependencies. All non-UI
logic lives in `src/core/` as pure modules and is covered by unit tests.

## Project layout

```
src/
  core/      pure logic (db, scan parsing, search, browse, sorting, columns, i18n)
  main/      Electron main process, preload bridge, PowerShell probe, indexer
  renderer/  UI (HTML/CSS/JS), built by Vite
  shared/    IPC channel names
tests/       node:test unit tests
build/       app icon and SVG sources used for packaging
```

## Tips and limitations

- **No background watching.** The app reads drive status only when you press
  *Refresh*. There is no polling and no device-change listener.
- **Scanning large drives takes time.** The first full scan of a drive with many
  files can be slow, because every directory is visited. Subsequent scans are
  faster to write but still visit every directory.
- **NTFS is the target.** Drive metadata is read via PowerShell on Windows.
- **Administrator rights** are not required for the current indexing method.
- **A portable build placed in a read-only folder** cannot create its database
  next to the executable.
