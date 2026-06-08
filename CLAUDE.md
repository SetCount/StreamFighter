# StreamFighter

Wails (Go + React/TS) desktop tool for managing live tournament info and
pushing it to OBS overlays. Built primarily for Super Smash Bros. Melee
right now; intended to expand to other games.

## Build & dev

- `wails dev -tags webkit2_41` — live-reload dev (or `task dev`, which
  wraps the same command).
- `wails build -tags webkit2_41` — full pipeline: regen bindings, build
  frontend, link Go binary.
- `wails generate module` — regen TS bindings only, after Go API changes.
- `go build ./...` — fast Go-only sanity check (skips cgo link, no GUI).
- `cd frontend && npx tsc --noEmit` — frontend type check.
- `task format` — `prettier` over `frontend/src` + `gofmt` over the Go
  packages.

The `webkit2_41` tag is required on this system: Fedora ships
webkit2gtk-4.1 only, not the -4.0 that Wails defaults to. `go build` of
just the Go packages works without it (no cgo link), but anything that
links the Wails runtime needs it.

CI (`.github/workflows/wails.yml`) builds cross-platform and cuts a
GitHub release.

## Architecture

### Backend (Go, `internal/` package)

`main.go` (package `main`, repo root) is a thin shell: it `go:embed`s
`frontend/dist` and `overlay/`, constructs `internal.NewApp(overlayFS)`,
and runs Wails with the window options. **All real backend logic lives
in the `internal/` package**, and the Wails bindings are generated under
`frontend/wailsjs/go/internal/App` (note: `internal/App`, not the old
`main.App`).

- `internal/app.go` — `App` struct owns:
  - `state StreamState`, `config OutputConfig`, `secrets Secrets`,
    `hotkeyConfig HotkeyConfig`, `*overlayServer`, `*hotkeyManager`,
    `games []GamePack`, `layoutRegistry LayoutRegistry`,
    `playerPresets`, `casterPresets`, in-memory file manifest,
    `sync.RWMutex`.
  - Bound methods exposed to the frontend: `GetState`, `SetState`,
    `ClearState`, `GetConfig`, `SetConfig`, `GameOverlayURL`,
    `BetweenOverlayURL`, `AssetsBaseURL`, `ListGames`, `ReloadGames`,
    `OpenGamesDir`, `GetLayoutRegistry`, `Update`, `GetSecrets`,
    `SetSecrets`, `GetHotkeyConfig`, `SetHotkeyConfig`,
    `ExecuteHotkeyAction`, `ListPlayerPresets`, `SavePlayerPreset`,
    `DeletePlayerPreset`, `ListCasterPresets`, `SaveCasterPreset`,
    `DeleteCasterPreset`, `FetchStartggSets`, `FetchStartggTournament`.
  - The `overlay/` directory is `go:embed`'d in `main.go` and passed in
    as `overlayFS` — used as a **seed only**. On startup
    `ensureOverlayDir` walks the embed and writes any missing files to
    the configured `OverlayPath`'s parent directory.
  - **Persistence locations** (see `paths.go`): config, secrets, and
    hotkeys live in `ConfigDir()`; state, `layouts.json`, the preset
    JSON files, and the default overlay/games/sponsors directories live
    in `DataDir()`. Both currently resolve to
    `os.UserConfigDir()/StreamFighter` (`~/.config/StreamFighter` on
    Linux). `defaultConfig()` seeds `OverlayPath`, `GamesDir`, and
    `SponsorsDir` under `DataDir()`; `OutputDir` defaults to a plain
    cwd-relative `obs-output`.
  - `OutputConfig` → `streamfighter.config.json`, persisted on every
    `SetConfig`. `loadConfig` merges the file over `defaultConfig()` so
    newly-added fields keep their defaults until the user saves again.
    `SetConfig` also re-broadcasts appearance to connected overlays so
    visual changes land without a refresh.
  - `Secrets` → `streamfighter.secrets.json` (gitignored, mode 0600).
    Holds the start.gg API token.
  - `StreamState` → `streamfighter.state.json`. `SetState`/`ClearState`
    persist it, and `NewApp` loads it on boot, so the match survives
    restarts. `ClearState` resets to `defaultState()`.
  - `HotkeyConfig` → `streamfighter.hotkeys.json`.
  - `effectiveAppearance()` is the single source of truth for what
    overlays receive: it stamps the active `GameID` onto the persisted
    `OverlayAppearance`, snaps `GameAspect` to the pack's first
    supported ratio when unset/invalid, and snaps `Layout` to the first
    entry in the layout registry for that aspect when invalid. Every SSE
    broadcast and `/overlay/appearance.json` response goes through it.
  - Window sizing: the window opens at a fixed 1200×1000 (min 900×640,
    user-resizable; see `main.go`) and the app shell scrolls its
    content panel internally instead of resizing. There is no
    window-resize binding — the old `ResizeWindow` method and its
    frontend hook were removed.
- `internal/paths.go` — `ConfigDir()` / `DataDir()` (both
  `os.UserConfigDir()/StreamFighter` today; the names anticipate a
  future split) and `ensureAppDirs()` (mkdir on startup).
- `internal/models.go` — domain types and enums: `SetInfo`, `Caster`,
  `Player`, `ScoreEntity`, `StreamState`, `OutputConfig`,
  `OverlayMessage`, `OverlayAppearance`, `PlayerPreset`, `CasterPreset`,
  `Secrets`, `HotkeyConfig`, plus `Format`, `BestOf`, `SocialIcon`,
  `Social`.
  - `Caster.Pronouns` is optional free text (e.g. "he/him").
  - `Player.Character` holds a character ID; `Player.Costume` is a
    1-based costume index (0 = unset); `Player.Pronouns`/`Prefix` are
    optional. `Player.StartggPlayerID` (0 = unset) links a player to a
    stable start.gg account so future pulls reapply the same preset even
    if the gamer tag changes.
  - `OutputConfig.StartggTournamentURL` persists the last-pulled
    tournament URL; `OutputConfig.SponsorsDir` and the embedded
    `OverlayAppearance` round out the rig config.
  - `OverlayAppearance` now carries `Layout`, `GameID`, `GameAspect`,
    `Accent`, `SidebarBg`, `SidebarWidth`, `CamHeight`, `NameFont`,
    `NameFontSize`, `RoundFontSize`, `LogoURL`, and the `Sponsor*`
    fields (`SponsorInterval`/`Width`/`Height`/`Padding`).
  - `HotkeyConfig` is `{ enabled bool, bindings map[actionID]combo }`.
- `internal/hotkeys.go` — `hotkeyManager` plus the action-ID constants
  (`ActionScoreE1Inc`, `…E1Dec`, `…E2Inc`, `…E2Dec`,
  `ActionSwapEntities`, `ActionClear` — **keep in sync with
  `HOTKEY_ACTIONS` in `HotkeysEditor.tsx`**). `ExecuteHotkeyAction`
  mutates state under the lock (score adjust / swap / clear), persists,
  runs `Update()`, then emits a `state:changed` Wails event so the
  frontend re-syncs. **OS-level global capture is stubbed** — the
  manager logs and stores bindings but doesn't yet register with the OS
  (candidate lib noted inline: `golang.design/x/hotkey`). Today hotkeys
  only fire from the frontend's in-window key listener.
- `internal/presets.go` — file-backed preset store under `DataDir()`.
  `loadPlayerPresets()`/`savePlayerPresets()` against `players.json`,
  same shape for casters in `casters.json`. Flat JSON arrays,
  hand-editable. IDs are 8-byte hex from `crypto/rand`, assigned on
  first save. The `List*` Wails methods reload from disk on every call.
- `internal/startgg.go` — start.gg GraphQL client (stdlib `net/http`
  only). `ParseTournamentSlug` extracts the slug from any
  `start.gg/tournament/<slug>[/...]` URL or accepts a bare slug.
  `FetchTournamentSets` pulls events × recent sets in one query and
  flattens slots → entrants → players for the picker UI.
  `FetchTournament` pulls just `name` + `slug` for the URL-blur
  auto-populate. Both funnel through a private `post` helper.
- `internal/games.go` — game-pack loader. `GamePack`/`Character`/
  `Costume` types plus `loadGames(dir)`, `loadGamePack`,
  `loadCharacter`, and helpers `findGamePack`, `characterDisplayName`,
  `humanizeID`, `normalizeAspectRatios`. Walks the games directory and
  skips malformed packs with a stderr warning. `isDir` resolves
  symlinks (via `os.Stat`), so a pack — or an individual character dir —
  can be a symlink to art living elsewhere.
- `internal/output.go` — `flattenFields(s, gameID, packs)` produces the
  per-field file map and resolves character IDs to display names via the
  loaded packs; `writeFieldFiles` writes and prunes stale files via a
  passed-in manifest; `writeStateJSON` writes the snapshot.
- `internal/server.go` — stdlib `net/http` SSE hub (`sseHub`) plus
  `overlayServer`. HTML routes share a `serveHTMLFile` helper
  (read-from-disk, `Cache-Control: no-store`). Routes:
  - `GET /game` — serves `OverlayPath` (the in-game overlay).
  - `GET /between` — serves `between.html` from the same directory.
  - `GET /overlay/...` — static file server for CSS, JS, and other
    assets in the overlay directory.
  - `GET /overlay/appearance.json` — `effectiveAppearance()` (includes
    `gameId`, `layout`, `gameAspect`), `Access-Control-Allow-Origin: *`.
  - `GET /state.json` — current `StreamState` snapshot for first-paint.
  - `GET /events` — SSE stream; new clients get current state +
    appearance immediately, then every `Update()` (and `SetConfig`)
    broadcasts an `OverlayMessage`.
  - `GET /games/...` — static file server rooted at `GamesDir`, with
    `Access-Control-Allow-Origin: *`.
  - `GET /sponsors.json` — JSON array of image filenames in `SponsorsDir`
    (re-read per request; png/jpg/jpeg/gif/webp/svg).
  - `GET /sponsors/...` — static file server for sponsor images.

### Layout registry (`layouts.json`)

`DataDir()/layouts.json` maps an aspect-ratio string to the list of
overlay layout IDs valid for it, e.g.:

```json
{
  "73:60": ["dual", "single"],
  "19:15": ["dual", "single"],
  "4:3": ["dual", "single"],
  "16:9": ["widescreen"]
}
```

Loaded on startup into `App.layoutRegistry`, exposed to the frontend via
`GetLayoutRegistry`, and used by `effectiveAppearance` to keep
aspect+layout coherent. A game pack advertises which aspect ratios it
supports (`aspectRatios` in `game.json`); the registry says which
layouts each of those ratios can drive.

### Game packs (`games/<gameId>/`)

Each pack is a directory under `OutputConfig.GamesDir` (defaults to
`DataDir()/games`). The directory name **is** the game ID.

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

`game.json`:

```json
{
  "name": "Super Smash Bros. Melee",
  "shortName": "Melee",
  "aspectRatios": ["73:60", "4:3", "16:9"],
  "portColors": ["#c96a6a", "#5f8fc4", "#cdb466", "#7ab07a"],
  "teamColors": ["#c96a6a", "#5f8fc4"],
  "characterNames": {
    "mr_game_and_watch": "Mr. Game & Watch",
    "dr_mario": "Dr. Mario"
  },
  "characterLayout": [
    [
      "dr_mario",
      "mario",
      "luigi",
      "bowser",
      "peach",
      "yoshi",
      "donkey_kong",
      "captain_falcon",
      "ganondorf"
    ],
    [
      "falco",
      "fox",
      "ness",
      "ice_climbers",
      "kirby",
      "samus",
      "zelda",
      "link",
      "young_link"
    ],
    [
      "pichu",
      "pikachu",
      "jigglypuff",
      "mewtwo",
      "mr_game_and_watch",
      "marth",
      "roy"
    ]
  ]
}
```

- Costume count is implicit in the filesystem — `loadGames` enumerates
  `portrait_NN.png` files and accepts a costume only when the matching
  `stock_NN.png` is also present.
- Character display names default to `humanizeID(charId)` (snake_case →
  Title Case) and only need an entry in `characterNames` when that
  doesn't produce the right text (`Mr. Game & Watch`, `R.O.B.`).
- `aspectRatios` lists the ratios the pack ships overlays for; legacy
  singular `aspectRatio` is still accepted (`normalizeAspectRatios`).
  The first entry is the default when appearance is unset.
- `portColors` / `teamColors` are optional per-pack palettes. `portColors`
  drives 1v1/FFA entity colors and the preset swatches; `teamColors`
  drives 2v2. Both fall back to the legacy 4-color palette when omitted.
- `characterLayout` is optional. Each inner array is one row of the
  character-select screen, rendered horizontally centered in
  `CharacterPicker`. IDs not present on disk are skipped; characters on
  disk but missing from every row are appended as a trailing row. When
  omitted, the picker falls back to a single auto-fill grid.
- We deliberately **do not** ship character art. Users drop their own
  portraits/stocks into the `characters/<id>/` tree (or symlink a pack
  in). The frontend composes asset URLs as
  `${AssetsBaseURL()}/<gameId>/characters/<charId>/select.png` and
  `.../{portrait,stock}_<NN>.png`.

### Frontend (React + TypeScript, `frontend/src/`)

- `App.tsx` — state coordination, dialog refs, top-level **app-shell
  layout**. The shell is a left **sidebar** + a `.main` column:
  - **Sidebar**: brand block (eyebrow shows the active pack's short
    name), a vertical `.sidebar-nav` of five sections, and a footer with
    a server-status pill, the **game-pack picker** (a `radiogroup` of
    buttons — "No game" plus one per pack — with open-folder and refresh
    icon-buttons), driven by `OpenGamesDir` / `ReloadGames` /
    `onPickGame`.
  - **Main**: an `.appbar` (active-section title + URL chips for the
    Game and Between overlay URLs, each with copy / open-in-browser
    actions) over a `.content` tabpanel.
  - Five sections (`TabId`): **player**, **presets**, **overlay**,
    **hotkeys**, **system**. `activeTab` state selects which renders.
  - Loads state/config/urls/games/layout-registry/secrets/presets/
    hotkeys once on startup via a single `Promise.all`.
  - **Auto-push**: a `useEffect` on `state` debounces 300ms then
    `SetState` + `Update`. It skips the initial load (`loadedRef`) and
    skips echoes of Go-originated changes (`fromGoRef`).
  - **Go→frontend sync**: `EventsOn("state:changed", …)` adopts state
    mutated on the Go side (e.g. hotkey actions) and sets `fromGoRef` so
    the auto-push effect doesn't bounce it back.
  - **In-window hotkeys**: a `keydown` listener formats the combo
    (Ctrl/Alt/Shift/Meta + `e.code`), ignores typing in
    inputs/textareas/selects, and calls `ExecuteHotkeyAction` when the
    combo matches a binding and `hotkeyConfig.enabled`.
  - **Fixed window**: the window opens at a fixed 1200×1000 (set in
    `main.go`); `.app` fills `100vh` and only the `.content` panel
    scrolls (`styles/shell.css`), so long lists scroll instead of
    growing the window. The old `useWindowResize` /`ResizeObserver`
    hook has been removed.
  - `commitConfig(next)` is the shared auto-save path: `setCfg` +
    `SetConfig`, surfacing a "port/server toggle changed → restart"
    notice when those fields change.
  - **start.gg flow**: `onPickSet` → `FetchStartggSets` → `SetPicker`.
    On select, `collectAmbiguities` checks for players matching multiple
    presets; if any, it opens `PresetDisambiguator` to let the user
    choose per-player before `applyStartggSet` runs (with an `overrides`
    map).
- `types.ts` — **plain interfaces** mirroring the Wails-generated
  classes. Components use these everywhere; we cast with `as any` only
  at the `SetState`/`SetConfig` API boundary. Keep in sync with
  `models.go`/`games.go` — includes `OverlayAppearance` (with
  `DEFAULT_APPEARANCE`), `PlayerPreset`, `CasterPreset`, `Secrets`,
  `GamePack`/`Character`/`Costume`, `LayoutRegistry`, `HotkeyConfig`,
  and the `Startgg*` types.
- `reshape.ts` — `reshapeForFormat`, `clampScores`, `winCount`,
  `canResize`. Coerces score entities when format / bestOf changes.
- `startgg.ts` — `applyStartggSet(prev, tournamentName, set, presets,
portPalette, overrides?)` rebuilds `StreamState` after a Pick Set.
  `matchAllPresets` (startgg ID → name → alias) and `collectAmbiguities`
  surface multi-match cases for the disambiguator; `matchPreset` honors
  an `overrides` map keyed by start.gg player ID. Format inferred from
  entrant shape; BestOf from `set.totalGames` when 3/5/7 else preserved.
  `setStateLabel` maps state codes (1 Created, 2 Ongoing, 3 Completed,
  6 Called, 7 Ready).
- `portColors.ts` — `PORT_COLORS` legacy fallback palette plus
  `portPaletteFor(pack)` (pack `portColors` or fallback) and
  `paletteFor(pack, format)` (2v2 → pack `teamColors`, else port
  palette). Mirrored by `portColors` in `app.go`.
- `icons.tsx` — `ICONS` map + `Icon` component. Social glyphs
  (twitter/bluesky/twitch/discord) plus UI glyphs (copy, open, swap,
  player, presets, overlay, hotkeys, system, folder, refresh, chevron,
  …). Social glyphs are duplicated in `overlay/components/shared.js` —
  separate runtimes, keep in sync.
- `assets.ts` — `selectURL`, `portraitURL`, `stockURL`, `findPack`,
  `findCharacter`. Asset URLs are composed against `AssetsBaseURL()` at
  load time, so disabling `EnableServer` (or moving `HTTPPort` without a
  restart) breaks images — expected.
- `components/`
  - `Card` (`Card.tsx`) — the **universal grouping primitive**.
    `<section class="card">` with variants (`accent`, `entity`,
    `compact`, `flat`) plus `CardHeader` (eyebrow / title / subtitle /
    actions / swatch) and `CardSection` (title / hint / children). This
    replaced the old fieldset-everywhere convention; settings, editors,
    and modals are built from Cards.
  - `SetInfoEditor` — an accent `Card` with a collapse toggle. Body is
    two columns: StartGG URL + tournament Name on the left; Round label,
    `Segmented` Best-Of and Format, and Clear / Pick Set buttons on the
    right. (The Best-Of control currently offers Bo3/Bo5 and Format
    offers 1v1/2v2 — Bo7 and FFA are commented out in the options arrays
    though the models still support them.) URL persists via `SetConfig`
    on blur, and blur also calls `FetchStartggTournament` to
    auto-populate the name (silent on failure).
  - `ScoreEntitiesEditor` — a `Card` per entity. Header legend carries a
    `--port-color` swatch, the format-aware role (Player/Team/Entity),
    and a remove button. Per-player UI: name input, a clickable
    `.player-portrait` (opens `CharacterPicker`), and a `.stock-row`
    radiogroup of costume tiles. Palette comes from
    `paletteFor(pack, format)`. Owns `pickerFor: { ei, pi } | null`.
    Can save a player straight to a preset (`onSavePlayerAsPreset`).
  - `CharacterPicker` — modal `<dialog>` with a `.character-grid` honoring
    the pack's `characterLayout`, plus a "None" tile. Tiles render
    `select.png`.
  - `CastersEditor` — a `Card` with a single-column list of `.caster-row`
    divs and a `+ Caster` add button. Name input has a `<datalist>` of
    caster preset names; an exact match replaces name/pronouns/socials.
    Can save a caster to a preset (`onSaveCasterAsPreset`).
  - `SocialsEditor` — reusable list-of-handles control; owns
    `SOCIAL_PLATFORMS`. Used by `CastersEditor` and the caster preset
    rows.
  - `SystemSettings` — the **System** section (formerly `ConfigEditor`).
    Stacked Cards: Server (enable + port), Paths (overlay / games /
    sponsors), File output (output dir + write toggles), Integrations
    (start.gg token → `SetSecrets`). `value`/`onChange` (local) +
    `onCommit` (writes via `commitConfig`). Text/number inputs commit on
    blur; checkboxes commit on change. No Save button.
  - `OverlayEditor` — the **Overlay** section, scoped to
    `OverlayAppearance`. Cards for appearance (Layout: aspect-ratio +
    layout `Segmented`, shown only when more than one option exists;
    Colors; Typography; Cameras; Brand) and the Sponsor rotator
    (interval / width / height / padding). Sliders debounce their
    commit (~200ms after the last input). Takes `gameId`, `games`, and
    `layoutRegistry` to drive the aspect/layout choices.
  - `HotkeysEditor` — the **Hotkeys** section. An enable toggle plus
    grouped action rows; clicking a binding records the next key combo
    (`keydown` capture, ignores modifier-only). `HOTKEY_ACTIONS` must
    match the action-ID constants in `hotkeys.go`. Flags conflicting
    bindings. A footer notes that global (out-of-focus) hotkeys are not
    yet wired.
  - `PresetsEditor` — the **Presets** section. Player and Caster Cards
    with explicit per-row Save buttons (auto-save would race hand-edits
    to the JSON files). Player rows: name + aliases + StartGG ID +
    character (via `CharacterPicker`) + color swatches.
  - `SetPicker` — modal `<dialog>` from Pick Set. Substring filter
    across event/round/entrants plus a "Hide completed" checkbox
    (default on, drops `state === 3`). Each row shows event · round ·
    entrants · state badge.
  - `PresetDisambiguator` — modal `<dialog>` shown when a pulled set has
    players matching more than one preset. Lets the user pick the
    intended preset per ambiguous player; returns an `overrides` map
    keyed by start.gg player ID that `applyStartggSet` honors.
  - `Segmented` — generic radio quickbutton row, active via
    `aria-pressed`.
- `App.css` is now just an **import hub** for `styles/{tokens, base,
shell, cards, buttons, forms, modals}.css`. Per-component styles live
  next to their component (`SetInfoEditor.css`, `OverlayEditor.css`,
  `SettingsForms.css`, etc.) and are imported from the `.tsx`.
- `wailsjs/` — Wails-generated bindings. **Do not edit.** Regenerated by
  `wails generate module` / `wails build` / `wails dev`. Bound methods
  are under `wailsjs/go/internal/App`.

### Overlay (Preact + HTM, `overlay/`)

Browser-source overlays served by the built-in HTTP server. No build
step — scripts use `https://esm.sh` imports for Preact/HTM.

**CSS split:**

- `shared.css` — reset, design tokens (`--accent`, `--name-font`,
  `--game-aspect`, etc.), win pips, caster block, tournament name, set
  info, brand logo. Every overlay includes this.
- `dual.css` — dual-sidebar layout (cam + name + score per side).
- `single.css` — single-sidebar layout (scoreboard rows, one cam).
- `widescreen.css` — 16:9 bottom-bar layout.
- `between.css` — between-games scene (topbar matchup, caster banners).

**Component library (`components/shared.js`):**

- `useStreamState()` — connects to `/state.json` + `/events` SSE,
  fetches `/overlay/appearance.json`, applies appearance, returns
  `{ state, appearance }`.
- `useEntity(entity)` — `{ name, prefix, pronouns, score, color }` from
  a `ScoreEntity` with fallbacks.
- `WinPips`, `FitText`, `SetInfo`, `CasterList`, `TournamentName`,
  `BrandLogo`, `Icon`, `applyAppearance(a)` (sets CSS custom props,
  including `--game-aspect` parsed from `gameAspect`, and
  `body.dataset.layout`), and the `html` HTM tag.

**Layouts (`components/`):**

- `dual-layout.js` (`DualLayout`), `single-layout.js` (`SingleLayout`),
  `widescreen-layout.js` (`WidescreenLayout`) — each its own module.
- `sponsor-rotator.js` (`SponsorRotator`) — fetches `/sponsors.json` and
  cross-fades through the images on `sponsorInterval`; supports a fixed
  bottom-right placement or an `inline` mode embedded in a sidebar.

**Entry points:**

- `app.js` / `index.html` — in-game overlay; picks `WidescreenLayout` /
  `SingleLayout` / `DualLayout` from `appearance.layout`.
- `between.js` / `between.html` — between-games scene (topbar matchup,
  cam placeholder, caster banners, sponsor rotator).
- `_template.html` / `_template.js` — minimal working overlay to copy
  from.

**`OverlayAppearance` carries `gameId`**, so overlays can compose
character art URLs against `/games/${gameId}/characters/<charId>/…`.

**Icon duplication:** social-platform SVG paths live in both
`overlay/components/shared.js` (`ICONS`) and `frontend/src/icons.tsx`.
Separate runtimes — keep them in sync when adding platforms.

## Output channels

All toggleable in `OutputConfig`:

- **Per-field text files** in `OutputDir` (default `obs-output`). One
  `.txt` per leaf, e.g. `entity_1_player_1_name.txt`. Stale files are
  pruned via the in-memory manifest. Character IDs resolve to display
  names before writing (`…_character.txt` = `"Captain Falcon"`);
  `…_costume.txt` is the index; `game.txt` is the active pack's display
  name.
- **`state.json` snapshot** in the same dir.
- **SSE broadcast** at `/events` (`OverlayMessage` = state + appearance)
  for browser-source overlays. One-way by design (SSE keeps us on
  stdlib).

Defaults: HTTP port `35920` → game overlay
`http://localhost:35920/game`, between overlay
`http://localhost:35920/between`.

## UX conventions

- **Card-based grouping.** Panels, editors, and modals are built from
  the `Card` / `CardHeader` / `CardSection` components, not bare
  fieldsets. (This reverses the older fieldset-everywhere convention —
  the `.card` system is now the standard.)
- **Custom-drawn form controls.** Checkboxes, radios, range sliders,
  and color swatches are fully restyled with `appearance: none` and
  fixed pixel sizing in `styles/base.css`, so they render identically
  regardless of the host's GTK theme or default font size (the old
  native chrome scaled with system settings and looked foreign next to
  the styled app). `:root { color-scheme: dark }` still keeps
  scrollbars, dialog backdrops, and the OS color-picker popup dark.
  Number-input spinners are hidden; `datalist` autocompletes keep their
  native popup (the input itself is styled).
- **Fluid type scale.** `--font-xs/sm/md/base/lg` as `clamp(...)`.
  Inputs grow with the font.
- **Color tokens** (`--bg-page`, `--bg-bar`, `--line`, `--text-muted`,
  `--accent`, etc.) live in `styles/tokens.css`. Add new colors there,
  not inline. The palette is Adwaita-style neutral gray.
- **Score**: pip buttons, `ceil(bestOf/2)` count. Click an empty pip to
  advance; click a filled pip to roll back. Filled pips inherit the
  entity's `--port-color`.
- **Best Of / Format / radio choices**: use `<Segmented>`.
- **Port/team color**: pack-defined via `portColors`/`teamColors`,
  falling back to the legacy RGBY palette. Shared logic in
  `frontend/src/portColors.ts` (mirrored in `app.go`).
- **Format ↔ structure**: `1v1`/`2v2` lock entity and player counts
  (resize controls hide when `canResize` is false). `FFA` is the only
  structurally-flexible format. Switching format runs `reshapeForFormat`;
  switching Best Of runs `clampScores`.
- **Navigation** is the left sidebar (`.sidebar-nav`), five sections:
  Player Info, Presets, Overlay, Hotkeys, System. Active item via
  `aria-current="page"`. Config saves on blur/change — no Save button.
- **Game pack** selection lives in the sidebar footer (a `radiogroup`),
  next to open-folder / refresh actions and a server-status pill. Picking
  a game auto-saves through `commitConfig` and clears per-player
  character/costume (art is pack-specific).
- **Auto-update**: every `StreamState` change auto-pushes to OBS after a
  300ms debounce (App.tsx `useEffect`), skipping the initial load and
  Go-originated echoes. No manual Update button.
- **Fixed window**: opens at 1200×1000 (min 900×640, resizable). The
  shell owns the viewport (`.app` is `100vh`) and the `.content` panel
  scrolls internally; long preset lists scroll rather than resize the
  window.

## Presets & StartGG integration

- **`streamfighter.secrets.json`** (in `ConfigDir()`, gitignored, mode
  0600). Holds the start.gg API token, loaded once on startup, written
  on `SetSecrets`.
- **`players.json` / `casters.json`** (in `DataDir()`) are flat JSON
  arrays of presets, hand-editable. The `List*` Wails methods reload
  from disk on every call. IDs are app-assigned on first `Save*Preset`.
- **Player matching** (applying a preset to a typed name, or to a player
  pulled from start.gg): startgg ID exact match wins; falls back to name
  (case-insensitive); falls back to alias. Multiple matches surface in
  `PresetDisambiguator`. Anything unmatched becomes a blank player
  carrying the gamer tag and startgg ID.
- **Pick Set flow**: paste a `start.gg/tournament/<slug>` URL into the
  Tournament card → Pick Set → `SetPicker` lists recent sets across
  events. Picking a set (after disambiguation if needed) rebuilds
  entities (1v1/2v2/FFA inferred), populates round label and tournament
  name, and adopts BestOf from `set.totalGames` when 3/5/7 (else
  preserves prev). Tournament URL persists in `OutputConfig`.

## Known soft edges

- **Global hotkeys are not implemented.** `hotkeyManager` stores and
  logs bindings but doesn't register with the OS, so hotkeys only fire
  while the StreamFighter window is focused (frontend listener). Wiring
  `golang.design/x/hotkey` (or similar) is a future pass.
- Changing `HTTPPort` or `EnableServer` requires an app restart — the
  server boots in `Startup()` and there's no live restart path. Changing
  `GamesDir` likewise needs a restart (or a `ReloadGames()` call after
  `SetConfig`; the sidebar refresh button does exactly this).
- The file manifest is in-memory only. A mid-stream crash plus an
  entity-shrink on the next run leaves stale files on disk. Cheap fix is
  persisting the manifest to a dotfile in `OutputDir`.
- `types.ts` is hand-mirrored from `models.go` (and `games.go`). Keep
  them in sync when adding fields.
- Game-pack art is fetched from the overlay HTTP server
  (`AssetsBaseURL()`). Disabling `EnableServer` breaks every portrait and
  stock icon until restart. The sidebar status pill warns when the
  server is off, but the broken images themselves aren't called out.
- Packaged builds don't seed `games/` for end users — the binary embeds
  only `overlay/`, not the game-pack tree. Decide whether to seed on
  first run or document a manual download before public release.
- `ConfigDir()` and `DataDir()` currently resolve to the same path; the
  split exists in the API but not yet in behavior.
