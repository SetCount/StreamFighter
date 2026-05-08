# StreamAssist

Wails (Go + React/TS) desktop tool for managing live tournament info and
pushing it to OBS overlays. Built primarily for Super Smash Bros. Melee
right now; intended to expand to other games.

## Build & dev

- `wails dev -tags webkit2_41` — live-reload dev
- `wails build -tags webkit2_41` — full pipeline: regen bindings, build
  frontend, link Go binary
- `wails generate module` — regen TS bindings only, after Go API changes
- `go build ./...` — fast Go-only sanity check (skips cgo link, no GUI)
- `cd frontend && npx tsc --noEmit` — frontend type check

The `webkit2_41` tag is required on this system: Fedora ships
webkit2gtk-4.1 only, not the -4.0 that Wails defaults to. `go build` of
just the Go packages works without it (no cgo link), but anything that
links the Wails runtime needs it.

## Architecture

### Backend (Go, repo root)
- `main.go` — Wails options, window size, embedded frontend dist,
  `OnStartup` / `OnShutdown` hooks.
- `app.go` — `App` struct owns:
  - `state StreamState`, `config OutputConfig`, `secrets Secrets`,
    `*overlayServer`, `games []GamePack`, `playerPresets`,
    `casterPresets`, in-memory file manifest, `sync.RWMutex`.
  - Bound methods exposed to the frontend: `GetState`, `SetState`,
    `GetConfig`, `SetConfig`, `OverlayURL`, `AssetsBaseURL`, `ListGames`,
    `ReloadGames`, `Update`, `GetSecrets`, `SetSecrets`,
    `ListPlayerPresets`, `SavePlayerPreset`, `DeletePlayerPreset`,
    `ListCasterPresets`, `SaveCasterPreset`, `DeleteCasterPreset`,
    `FetchStartggSets`.
  - `defaultOverlayHTML` is `go:embed`'d — used as a **seed only**.
  - `OutputConfig` is persisted to a cwd-relative
    `streamassist.config.json` on every `SetConfig`. `loadConfig` merges
    the file over `defaultConfig()` so newly-added fields keep their
    defaults until the user saves again.
  - `Secrets` is persisted separately to `streamassist.secrets.json`
    (gitignored, mode 0600). Holds the start.gg API token. Same
    forward-compat unmarshal pattern as `loadConfig`.
- `models.go` — domain types and enums: `SetInfo`, `Caster`, `Player`,
  `ScoreEntity`, `StreamState`, `OutputConfig`, `PlayerPreset`,
  `CasterPreset`, `Secrets`, plus `Format`, `BestOf`, `SocialIcon`.
  `Player.Character` holds a character ID; `Player.Costume` is a 1-based
  costume index (0 = unset). `Player.StartggPlayerID` (0 = unset) links
  a player to a stable start.gg user account so future Pull-from-StartGG
  passes can reapply the same preset even if the gamer tag changes.
  `OutputConfig.StartggTournamentURL` persists the most-recently-pulled
  tournament URL across runs.
- `presets.go` — file-backed preset store. `loadPlayerPresets()` /
  `savePlayerPresets()` against `players.json`, same shape for casters
  in `casters.json`. Both files are flat JSON arrays, hand-editable.
  IDs are 8-byte hex from `crypto/rand`, assigned on first save. The
  `List*` Wails methods reload from disk on every call so a hand-edit
  shows up on the next refresh.
- `startgg.go` — start.gg GraphQL client (stdlib `net/http` only, no
  external deps). `ParseTournamentSlug` extracts the slug from any
  `start.gg/tournament/<slug>[/...]` URL or accepts a bare slug.
  `FetchTournamentSets` pulls events × recent sets in one query and
  flattens slots → entrants → players for the picker UI.
- `games.go` — game-pack loader. `GamePack`/`Character`/`Costume` types
  plus `loadGames(dir)`, which walks the configured games directory and
  skips malformed packs with a stderr warning. Display names default to
  `humanizeID()` of the dir name and can be overridden by
  `characterNames` in `game.json`.
- `output.go` — `flattenFields(s, packs)` produces the per-field file
  map and resolves character IDs to display names via the loaded packs;
  `writeFieldFiles` writes and prunes stale files via a passed-in
  manifest; `writeStateJSON` writes the snapshot.
- `server.go` — stdlib `net/http` SSE hub (`sseHub`) plus `overlayServer`
  with four routes:
  - `GET /overlay` — reads `OverlayPath` from disk on every request with
    `Cache-Control: no-store`, so user edits show up on a browser-source
    refresh.
  - `GET /state.json` — current snapshot for first-paint.
  - `GET /events` — SSE stream; new clients get current state
    immediately, then every `Update()` broadcasts.
  - `GET /games/...` — static file server rooted at `GamesDir`, with
    `Access-Control-Allow-Origin: *` so the Wails frontend (different
    origin) and the OBS browser source can both `<img>`-load assets.
- `overlay.html` — the seed file. On startup, if `OverlayPath` doesn't
  exist, the embedded contents are written there. **Existing files are
  never overwritten.** The server always reads from disk.

### Game packs (`games/<gameId>/`)

Each pack is a directory under `OutputConfig.GamesDir` (default
`games/`, cwd-relative). The directory name **is** the game ID.

```
games/<gameId>/
  game.json                     # required manifest
  characters/
    <charId>/
      select.png                # required: CSS button portrait
      portrait_01.png           # one pair per costume, NN is 01-padded
      stock_01.png
      portrait_02.png
      stock_02.png
```

`game.json` is small and stable:
```json
{
  "name": "Super Smash Bros. Melee",
  "shortName": "Melee",
  "characterNames": {
    "mr_game_and_watch": "Mr. Game & Watch",
    "dr_mario": "Dr. Mario"
  }
}
```

- Costume count is implicit in the filesystem — `loadGames` enumerates
  `portrait_NN.png` files and accepts a costume only when the matching
  `stock_NN.png` is also present.
- Character display names default to `humanizeID(charId)` (snake_case →
  Title Case) and only need an entry in `characterNames` when that
  doesn't produce the right text (`Mr. Game & Watch`, `R.O.B.`).
- We deliberately **do not** ship character art. `games/melee/` and
  `games/pplus/` only contain `game.json` skeletons; users drop their
  own portraits/stocks into the `characters/<id>/<NN>/` tree.
- The frontend composes asset URLs as
  `${AssetsBaseURL()}/<gameId>/characters/<charId>/select.png` and
  `${AssetsBaseURL()}/<gameId>/characters/<charId>/{portrait,stock}_<NN>.png`.

### Frontend (React + TypeScript, `frontend/src/`)
- `App.tsx` — state coordination, dialog refs, top-level layout. Owns
  the picker dialog state and preset lists (loaded once on startup,
  refreshed by row save/delete).
- `types.ts` — **plain interfaces** mirroring the Wails-generated
  classes. Components use these everywhere. The generated
  `main.StreamState` etc. are classes with a `convertValues` method that
  breaks spread/literal updates — we cast with `as any` only at the
  `SetState` / `SetConfig` API boundary. Keep this file in sync when
  adding fields to Go models — `Player.startggPlayerId`,
  `OutputConfig.startggTournamentUrl`, `PlayerPreset`, `CasterPreset`,
  `Secrets`, and the `Startgg*` types all live here.
- `reshape.ts` — `reshapeForFormat`, `clampScores`, `winCount`,
  `canResize`. Coerces score entities when format / bestOf changes.
- `startgg.ts` — `applyStartggSet(prev, tournamentName, set, presets)`
  rebuilds `StreamState` after a Pick Set. Match priority: startgg ID
  → name (case-insensitive) → alias → blank player carrying gamerTag
  + startggPlayerId. Format inferred from entrant shape; BestOf is
  preserved (start.gg doesn't expose it reliably).
- `portColors.ts` — shared `PORT_COLORS` palette used by the entity
  editor, reshape defaults, and preset color swatches.
- `components/`
  - `SetInfoEditor` — tournament + round inputs, segmented Bo3/5/7,
    segmented 1v1/2v2/FFA, plus a second row with the StartGG URL
    input and a Pick Set button. URL persists via `SetConfig` on
    blur. Wrapped in a `<fieldset>` with `<legend>Set Info</legend>`.
    Game selection lives in `ConfigEditor`, not here — it's a property
    of the rig that rarely changes mid-session.
  - `ScoreEntitiesEditor` — **returns a Fragment** of
    `<fieldset class="entity-card">` elements (no outer wrapper). Each
    legend carries a `.legend-swatch` colored from `--port-color` plus
    the format-aware title (Player/Team/Entity) and a remove × button
    (`.legend-action`). Pip score control reads `--port-color` from the
    fieldset's inline style. Per-player UI: name input on top, a
    clickable `.player-portrait` showing
    `portrait_<NN>.png` (or a placeholder), and a `.stock-row`
    radiogroup of `stock_<NN>.png` tiles below. Clicking the portrait
    opens the `CharacterPicker` dialog; clicking a stock swaps the
    player's costume index. Selected stock border uses `--port-color`.
    Owns the `pickerFor: { ei, pi } | null` state that drives the
    picker; on character change the first available costume index is
    auto-selected.
  - `CharacterPicker` — modal `<dialog class="character-picker">` with a
    `.character-grid` of `.character-tile` buttons (one per character in
    the active pack, plus a "None" tile at the start). Tiles render the
    character's `select.png`. Falls back to friendly empty/no-pack
    messages when the active pack has no characters loaded.
  - `assets.ts` — small helper module exporting `selectURL`,
    `portraitURL`, `stockURL`, `findPack`, `findCharacter`. Asset URLs
    are composed against the value returned by `AssetsBaseURL()` at
    load time, so flipping `EnableServer` off (or moving HTTPPort
    without a restart) breaks images — that's expected.
  - `CastersEditor` — outer `<fieldset><legend>Casters</legend>` with a
    single-column list of plain `<div class="caster">` rows separated by
    a top divider (same lightweight pattern as `.player` rows in the
    entity editor — nested fieldsets stacked too much UA chrome and
    padding for the narrow column). `+ Caster` is an `add-row` button at
    the bottom, matching `+ Player` / `+ Social`. The name input has a
    `<datalist>`-driven dropdown of caster preset names; an exact-match
    type or selection replaces both name and socials from the preset.
  - `SocialsEditor` — small reusable list-of-handles control. Owns
    `SOCIAL_PLATFORMS` (Twitter/Bluesky/Twitch/Discord glyph paths).
    Used by both `CastersEditor` and the caster preset rows in
    `PresetsEditor`.
  - `ConfigEditor` — `<fieldset>` inside the Settings `<dialog>`. Save
    Config + optional × close live in a `.dialog-actions` row above the
    fields. Holds the StartGG token (password input, persisted on blur
    via `SetSecrets` to `streamassist.secrets.json`), paths, port, and
    server toggles only — Game selection is in the topbar (auto-saves
    via `SetConfig` on change so it persists without opening Settings).
  - `PresetsEditor` — sibling of `ConfigEditor` inside the Settings
    `<dialog>`. Two `<fieldset>` sections (Player Presets, Caster
    Presets) with explicit Save buttons per row — auto-save would race
    with hand-edits to the JSON files. Player rows have name + aliases
    + StartGG ID + character (via `CharacterPicker`) + color swatches
    (with a "no preference" clear option).
  - `SetPicker` — modal `<dialog class="set-picker">` opened from
    SetInfoEditor's Pick Set button. Substring filter across event,
    round, and entrant tags. Each row shows event · round · entrants ·
    state badge. Mirrors the `CharacterPicker` ref/effect pattern.
  - `Segmented` — generic radio quickbutton row, active state via
    `aria-pressed`.
- `wailsjs/` — Wails-generated bindings. **Do not edit.** Regenerated by
  `wails generate module` / `wails build` / `wails dev`.

## Output channels

All toggleable in `OutputConfig`:
- **Per-field text files** in `OutputDir` (default `obs-output`). One
  `.txt` per leaf, e.g. `entity_1_player_1_name.txt`. OBS Text sources
  read these directly. Stale files (entities/casters that shrank) are
  pruned via the in-memory manifest. Player character IDs are resolved
  to display names against the loaded `GamePack` before writing —
  `entity_1_player_1_character.txt` contains `"Captain Falcon"`, not
  `"captain_falcon"`. `entity_1_player_1_costume.txt` is the costume
  index as a string (`0` = unset). A `game.txt` carries the active game
  pack's display name.
- **`state.json` snapshot** in the same dir.
- **SSE broadcast** at `/events` for browser-source overlays.
  Deliberately one-way — WebSocket would have been the bidirectional
  alternative; SSE keeps us on stdlib.

Defaults: HTTP port `35920` → overlay URL
`http://localhost:35920/overlay`. `OverlayPath` is cwd-relative
(`overlay.html`), so the file lands wherever the binary launches from.

## UX conventions

- **Native form controls preferred.** `:root { color-scheme: dark }`
  makes WebKit/GTK render selects, scrollbars, dialog backdrops, and
  checkboxes in dark mode. We add layout-only CSS (sizing, gap,
  alignment) — don't override `background`/`border`/`color` on form
  elements unless there's a real reason.
- **Native section grouping via `<fieldset>` / `<legend>`.** Every
  panel/card in the app is a fieldset; the UA stylesheet draws the
  border and legend tab. There is no `.card` / `.card-head` class — do
  not add one back. Layout-only rules (`fieldset { min-width: 0 }`,
  `legend { display: flex }`) are in `App.css`. Same rule applies to
  fieldsets as to other native form controls: don't override their
  `background` / `border` / `color`.
- **Fluid type scale.** `--font-xs/sm/md/base/lg` defined as
  `clamp(min, calc(Nvw + Mpx), max)`. Inputs use `min-height: 2.2em` and
  `padding: 0.4em 0.6em` so they grow with the font.
- **Color tokens** (`--bg-page`, `--bg-bar`, `--line`, `--text-muted`,
  `--accent`, etc.) live at `:root` in `App.css`. The palette is
  Adwaita-style neutral grays so the bits we *do* paint (topbar,
  segmented control, dashed add-row buttons) sit next to native fieldset
  chrome without clashing. Add new colors here, not inline.
- **Score**: pip buttons, `ceil(bestOf/2)` count. Click an empty pip to
  advance to it; click a filled pip to roll back to one less. Filled
  pips inherit the entity's `--port-color`.
- **Best Of / Format / future radio choices**: use `<Segmented>`.
- **Port/team color**: RGBY only for now (Melee). `PORT_COLORS` lives
  in `frontend/src/portColors.ts` (and a mirrored `portColors` in
  `app.go`). When expanding to other games, gate the palette on
  game/format inside that shared module.
- **Format ↔ structure**: `1v1` and `2v2` lock entity and player counts
  (the +/× controls hide when `canResize` is false). `FFA` is the only
  structurally-flexible format. Switching format runs `reshapeForFormat`;
  switching Best Of runs `clampScores`.
- **Settings** lives in a native `<dialog>`, opened from the topbar.
- **Topbar** carries (in order): title, OBS source URL,
  `<select class="game-select">` for the active game pack, Settings
  button, Update button. The Game select auto-saves: changing it calls
  `SetConfig` immediately, which persists to
  `streamassist.config.json`. So if a user only ever streams P+, they
  pick once and never see it again.

## Presets & StartGG integration

- **`streamassist.secrets.json`** (gitignored, mode 0600). Holds the
  start.gg API token. Loaded once on startup, written on `SetSecrets`.
  Same forward-compat unmarshal pattern as `streamassist.config.json`.
- **`players.json` / `casters.json`** are flat JSON arrays of presets,
  cwd-relative, hand-editable. The `List*` Wails methods reload from
  disk on every call, so a hand-edit shows up on the next refresh
  (close & reopen Settings, or pick a set). IDs are app-assigned the
  first time `Save*Preset` is called for a row; copying a row in your
  text editor is fine as long as you blank or change the ID.
- **Player matching** when applying a preset to a typed name (in
  `ScoreEntitiesEditor`) or to a player pulled from start.gg (in
  `applyStartggSet`): startgg ID exact match wins; falls back to name
  case-insensitive; falls back to alias case-insensitive. Anything
  unmatched becomes a blank player carrying the gamer tag and startgg
  ID so a future preset can be made from it.
- **Pick Set flow**: paste a `https://www.start.gg/tournament/<slug>`
  URL into Set Info → click Pick Set → modal lists recent sets across
  events. Picking a set rebuilds entities (1v1/2v2/FFA inferred),
  populates round label and tournament name, preserves BestOf.
  Tournament URL persists in `OutputConfig` so it survives restarts.

## Known soft edges

- Changing `HTTPPort` or `EnableServer` requires an app restart — the
  server boots in `startup()` and there's no live restart path.
  Changing `GamesDir` likewise needs a restart (or a `ReloadGames()`
  call after `SetConfig`).
- The file manifest is in-memory only. A mid-stream crash plus an
  entity-shrink on the next run leaves stale files on disk. Cheap fix is
  persisting the manifest to a dotfile in `OutputDir`.
- `types.ts` is hand-mirrored from `models.go` (and `games.go`). Keep
  them in sync when adding fields. (We don't use the Wails-generated
  classes directly because they fight spread updates.)
- Game-pack art is fetched from the overlay HTTP server (`AssetsBaseURL()`).
  If the user disables `EnableServer` in Settings, every portrait and
  stock icon goes broken-image until the app restarts with the server
  re-enabled. We don't currently surface this in the UI — consider an
  inline warning if it bites users in practice.
- Packaged builds don't seed `games/` for end users — the repo ships
  skeletons in dev, but the binary has no embed for the game-pack tree.
  Decide whether to seed-on-first-run (like `overlay.html`) or document
  a manual download before public release.
