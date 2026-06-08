# StreamFighter

A desktop tool for managing live tournament info and pushing it to your OBS
overlays. Type in players, scores, characters, and casters once, and
StreamFighter feeds the data to OBS text sources and browser-source overlays
automatically — no more editing scenes mid-set.

Built primarily for **Super Smash Bros. Melee**, with support for other games
through drop-in game packs.

## Getting started

### 1. Install

Grab the latest build for your OS from the
[Releases page](https://github.com/SetCount/StreamFighter/releases) and run it:

- **Windows** — `StreamFighter.exe`
- **Linux** — `StreamFighter`

StreamFighter keeps its settings, presets, hotkeys, saved match state, and
game packs in a per-user folder managed by your OS:

- **Windows** — `%AppData%\StreamFighter`
- **macOS** — `~/Library/Application Support/StreamFighter`
- **Linux** — `~/.config/StreamFighter` (respects `$XDG_CONFIG_HOME`)

The only thing written next to the binary is the `obs-output/` folder of
plain-text source files (see step 3), so where you launch from only matters if
you use those.

### 2. Add character art (game packs)

StreamFighter **does not include character art**. Each game is a folder inside
the app's `games/` directory (under the per-user folder above). The quickest
way to get there is the **Open games folder** button in the app's sidebar —
after dropping in art, hit the refresh button next to it so the app re-scans.

Each game folder holds a `game.json` manifest plus a `characters/` tree:

```
<game>/
  game.json                       # character names + select-screen layout
  characters/<character>/
    select.png                    # character-select button
    portrait_01.png               # one pair per costume (01, 02, ...)
    stock_01.png
```

A costume only shows up once both its `portrait_NN.png` and `stock_NN.png`
exist. You supply the `game.json` and the images.

### 3. Point OBS at the overlays

Start StreamFighter, then add **Browser** sources in OBS pointing at:

- In-game overlay: `http://localhost:35920/game`
- Between-games scene: `http://localhost:35920/between`

You can copy the source URL straight from the bar at the top of the app. The
overlays update live as you type — no need to refresh.

Prefer plain text sources? StreamFighter also writes one `.txt` file per field
into the `obs-output/` folder (e.g. `entity_1_player_1_name.txt`). Point OBS
**Text (GDI+)** sources at those if you'd rather build your own layout.

## Using the app

The window has a sidebar with five sections:

- **Player Info** — the main screen. Set the tournament name, round, format,
  and best-of, then fill in players: name, character (click the portrait to
  pick), costume, and score. Click the score pips to advance or roll back a
  score. Casters go in the panel on the right.
- **Presets** — save players and casters you use often, so you can re-apply
  them by name later. Player presets can store aliases, a character, color, and
  a start.gg ID.
- **Overlay** — the look of the browser-source overlay: layout, colors, fonts,
  camera sizing, and the sponsor rotator.
- **Hotkeys** — keyboard shortcuts for scoring and other common actions (active
  while the StreamFighter window is focused).
- **System** — paths, ports, server toggle, file output, and your start.gg API
  token.

The active **game pack** is chosen in the sidebar footer, next to the buttons
that open the game-packs folder and refresh after you add art.

Everything auto-saves and auto-pushes to OBS as you change it — there's no
"Update" button to remember.

### Pulling sets from start.gg (optional)

1. In **System**, paste your start.gg API token.
2. On the **Player Info** section, paste a tournament URL
   (`https://www.start.gg/tournament/<slug>`) into the Tournament field — the
   name auto-fills.
3. Click **Pick Set** to browse recent sets and load one. Players, round,
   format, and best-of populate automatically; matching presets are applied.

## A few things to know

- Changing the **HTTP port**, **server on/off**, or **games folder** in System
  requires restarting the app to take effect. (Dropping in new art doesn't —
  use the refresh button by the game picker.)
- Character art is served by the built-in web server. If you turn the server
  off in System, portraits and stock icons go blank until you restart with it
  back on.

## Building from source

Requires [Go](https://go.dev/) 1.24+, [Node](https://nodejs.org/), and the
[Wails CLI](https://wails.io/docs/gettingstarted/installation).

```sh
wails dev      # live-reload development
wails build    # production binary in build/bin/
```

On Fedora (which ships webkit2gtk-4.1 instead of 4.0), add the build tag:

```sh
wails dev -tags webkit2_41
wails build -tags webkit2_41
```
