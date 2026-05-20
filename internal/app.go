package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sync"
	"time"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

const configPath = "streamfighter.config.json"

const secretsPath = "streamfighter.secrets.json"

const statePath = "streamfighter.state.json"

type App struct {
	ctx           context.Context
	mu            sync.RWMutex
	overlayFS     fs.FS
	state         StreamState
	config        OutputConfig
	secrets       Secrets
	server        *overlayServer
	games         []GamePack
	playerPresets []PlayerPreset
	casterPresets []CasterPreset
	fileManifest  map[string]struct{}
}

func NewApp(overlayFS fs.FS) *App {
	return &App{
		overlayFS:     overlayFS,
		state:         loadState(),
		config:        loadConfig(),
		secrets:       loadSecrets(),
		playerPresets: loadPlayerPresets(),
		casterPresets: loadCasterPresets(),
		fileManifest:  map[string]struct{}{},
	}
}

// loadConfig returns the persisted OutputConfig from configPath, falling
// back to defaultConfig() when the file is missing or malformed.
// Unmarshaling over a pre-populated struct gives forward-compat: fields
// added since the file was written keep their default values.
func loadConfig() OutputConfig {
	cfg := defaultConfig()
	raw, err := os.ReadFile(configPath)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load config: %v\n", err)
		}
		return cfg
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		fmt.Fprintf(os.Stderr, "load config: %v (using defaults)\n", err)
		return defaultConfig()
	}
	return cfg
}

// saveConfig writes the OutputConfig to configPath. Errors are logged
// to stderr; we never fail SetConfig over a bad write.
func saveConfig(cfg OutputConfig) {
	b, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "save config: %v\n", err)
		return
	}
	if err := os.WriteFile(configPath, b, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "save config: %v\n", err)
	}
}

func loadState() StreamState {
	s := defaultState()
	raw, err := os.ReadFile(statePath)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load state: %v\n", err)
		}
		return s
	}
	if err := json.Unmarshal(raw, &s); err != nil {
		fmt.Fprintf(os.Stderr, "load state: %v (using defaults)\n", err)
		return defaultState()
	}
	return s
}

func saveState(s StreamState) {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "save state: %v\n", err)
		return
	}
	if err := os.WriteFile(statePath, b, 0o644); err != nil {
		fmt.Fprintf(os.Stderr, "save state: %v\n", err)
	}
}

func loadSecrets() Secrets {
	var s Secrets
	raw, err := os.ReadFile(secretsPath)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load secrets: %v\n", err)
		}
		return s
	}
	if err := json.Unmarshal(raw, &s); err != nil {
		fmt.Fprintf(os.Stderr, "load secrets: %v (using empty)\n", err)
		return Secrets{}
	}
	return s
}

func saveSecrets(s Secrets) {
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "save secrets: %v\n", err)
		return
	}
	if err := os.WriteFile(secretsPath, b, 0o600); err != nil {
		fmt.Fprintf(os.Stderr, "save secrets: %v\n", err)
	}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	if err := a.ensureOverlayDir(a.config.OverlayPath); err != nil {
		fmt.Println("seed overlay dir:", err)
	}
	a.games = loadGames(a.config.GamesDir)
	a.startServer()
}

func (a *App) ensureOverlayDir(htmlPath string) error {
	if htmlPath == "" || a.overlayFS == nil {
		return nil
	}
	dir := filepath.Dir(htmlPath)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	return fs.WalkDir(a.overlayFS, "overlay", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel("overlay", path)
		dst := filepath.Join(dir, rel)
		if d.IsDir() {
			return os.MkdirAll(dst, 0o755)
		}
		if _, statErr := os.Stat(dst); statErr == nil {
			return nil
		} else if !os.IsNotExist(statErr) {
			return statErr
		}
		data, err := fs.ReadFile(a.overlayFS, path)
		if err != nil {
			return err
		}
		return os.WriteFile(dst, data, 0o644)
	})
}

func (a *App) Shutdown(_ context.Context) {
	if a.server == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = a.server.shutdown(ctx)
}

// GetState returns the current stream state to the frontend.
func (a *App) GetState() StreamState {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.state
}

// SetState replaces the in-memory state from the frontend and persists
// it to disk so it survives restarts.
func (a *App) SetState(s StreamState) {
	a.mu.Lock()
	a.state = s
	a.mu.Unlock()
	saveState(s)
}

// ClearState resets the stream state to defaults and persists the change.
func (a *App) ClearState() StreamState {
	s := defaultState()
	a.mu.Lock()
	a.state = s
	a.mu.Unlock()
	saveState(s)
	return s
}

// GetConfig returns the current output configuration.
func (a *App) GetConfig() OutputConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.config
}

// SetConfig replaces the output configuration and persists it to
// configPath. Changing HTTPPort or EnableServer takes effect on the
// next app start.
func (a *App) SetConfig(c OutputConfig) {
	a.mu.Lock()
	a.config = c
	a.mu.Unlock()
	saveConfig(c)
	// Push appearance changes to connected overlays immediately.
	if c.EnableServer && a.server != nil {
		if msg, err := json.Marshal(OverlayMessage{State: a.GetState(), Appearance: a.effectiveAppearance()}); err == nil {
			a.server.hub.broadcast(msg)
		}
	}
}

// effectiveAppearance returns the persisted appearance with GameAspect
// overridden by the active game pack's aspect when the pack declares
// one. Always source the game-area aspect from the pack so changing
// games re-shapes the overlay without manual config.
func (a *App) effectiveAppearance() OverlayAppearance {
	a.mu.RLock()
	defer a.mu.RUnlock()
	app := a.config.Appearance
	app.GameID = a.config.Game
	if pack := findGamePack(a.games, a.config.Game); pack != nil && pack.AspectRatio != "" {
		app.GameAspect = pack.AspectRatio
	}
	return app
}

// GameOverlayURL is the address for the in-game OBS browser source.
func (a *App) GameOverlayURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/game", a.config.HTTPPort)
}

// BetweenOverlayURL is the address for the between-games OBS browser source.
func (a *App) BetweenOverlayURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/between", a.config.HTTPPort)
}

// AssetsBaseURL is the prefix the frontend (and OBS overlay) prepends to
// game-pack image paths, e.g. `${base}/melee/characters/fox/select.png`.
func (a *App) AssetsBaseURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/games", a.config.HTTPPort)
}

// ListGames returns the currently-loaded game packs.
func (a *App) ListGames() []GamePack {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.games
}

// ReloadGames re-scans GamesDir. Call after dropping new art into a
// pack so the UI picks it up without an app restart.
func (a *App) ReloadGames() []GamePack {
	a.mu.RLock()
	dir := a.config.GamesDir
	a.mu.RUnlock()
	packs := loadGames(dir)
	a.mu.Lock()
	a.games = packs
	a.mu.Unlock()
	return packs
}

// GetSecrets returns the current secrets to the frontend. The token
// field is sent in the clear; the dialog input should mask it.
func (a *App) GetSecrets() Secrets {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.secrets
}

// SetSecrets updates the in-memory secrets and persists them to
// secretsPath. Empty token clears the file's value.
func (a *App) SetSecrets(s Secrets) {
	a.mu.Lock()
	a.secrets = s
	a.mu.Unlock()
	saveSecrets(s)
}

// ListPlayerPresets reloads from players.json on every call so a
// hand-edit of the file shows up immediately on the next refresh.
func (a *App) ListPlayerPresets() []PlayerPreset {
	p := loadPlayerPresets()
	a.mu.Lock()
	a.playerPresets = p
	a.mu.Unlock()
	return p
}

// SavePlayerPreset upserts by ID, assigning a new ID when blank, and
// returns the saved preset (with the assigned ID) so the frontend can
// adopt it for subsequent edits.
func (a *App) SavePlayerPreset(p PlayerPreset) (PlayerPreset, error) {
	if p.ID == "" {
		p.ID = newPresetID()
	}
	list := loadPlayerPresets()
	replaced := false
	for i, existing := range list {
		if existing.ID == p.ID {
			list[i] = p
			replaced = true
			break
		}
	}
	if !replaced {
		list = append(list, p)
	}
	if err := savePlayerPresets(list); err != nil {
		return p, err
	}
	a.mu.Lock()
	a.playerPresets = list
	a.mu.Unlock()
	return p, nil
}

// DeletePlayerPreset removes by ID. Missing IDs are a no-op.
func (a *App) DeletePlayerPreset(id string) error {
	list := loadPlayerPresets()
	out := list[:0]
	for _, p := range list {
		if p.ID != id {
			out = append(out, p)
		}
	}
	if err := savePlayerPresets(out); err != nil {
		return err
	}
	a.mu.Lock()
	a.playerPresets = out
	a.mu.Unlock()
	return nil
}

// ListCasterPresets reloads from casters.json on every call.
func (a *App) ListCasterPresets() []CasterPreset {
	c := loadCasterPresets()
	a.mu.Lock()
	a.casterPresets = c
	a.mu.Unlock()
	return c
}

// SaveCasterPreset upserts by ID, assigning a new ID when blank.
func (a *App) SaveCasterPreset(c CasterPreset) (CasterPreset, error) {
	if c.ID == "" {
		c.ID = newPresetID()
	}
	list := loadCasterPresets()
	replaced := false
	for i, existing := range list {
		if existing.ID == c.ID {
			list[i] = c
			replaced = true
			break
		}
	}
	if !replaced {
		list = append(list, c)
	}
	if err := saveCasterPresets(list); err != nil {
		return c, err
	}
	a.mu.Lock()
	a.casterPresets = list
	a.mu.Unlock()
	return c, nil
}

// FetchStartggSets pulls the tournament's recent sets from start.gg
// using the saved API token. The frontend uses the result to populate
// the Pick Set dialog.
func (a *App) FetchStartggSets(rawURL string) (StartggSetsResult, error) {
	a.mu.RLock()
	token := a.secrets.StartggToken
	a.mu.RUnlock()
	if token == "" {
		return StartggSetsResult{}, errors.New("no start.gg token configured (Settings → StartGG token)")
	}
	slug, err := ParseTournamentSlug(rawURL)
	if err != nil {
		return StartggSetsResult{}, err
	}
	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := context.WithTimeout(parent, 15*time.Second)
	defer cancel()
	return newStartggClient(token).FetchTournamentSets(ctx, slug, 64)
}

// FetchStartggTournament pulls just the tournament's name + slug. Wired
// to the URL-blur auto-populate in the Tournament card so we don't pay
// the full FetchStartggSets cost just to fill in the name field.
func (a *App) FetchStartggTournament(rawURL string) (StartggTournament, error) {
	a.mu.RLock()
	token := a.secrets.StartggToken
	a.mu.RUnlock()
	if token == "" {
		return StartggTournament{}, errors.New("no start.gg token configured (Settings → StartGG token)")
	}
	slug, err := ParseTournamentSlug(rawURL)
	if err != nil {
		return StartggTournament{}, err
	}
	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := context.WithTimeout(parent, 10*time.Second)
	defer cancel()
	return newStartggClient(token).FetchTournament(ctx, slug)
}

// DeleteCasterPreset removes by ID. Missing IDs are a no-op.
func (a *App) DeleteCasterPreset(id string) error {
	list := loadCasterPresets()
	out := list[:0]
	for _, c := range list {
		if c.ID != id {
			out = append(out, c)
		}
	}
	if err := saveCasterPresets(out); err != nil {
		return err
	}
	a.mu.Lock()
	a.casterPresets = out
	a.mu.Unlock()
	return nil
}

// Update writes the current state out through every enabled channel:
// per-field text files, a JSON snapshot, and an SSE broadcast.
func (a *App) Update() error {
	a.mu.Lock()
	state := a.state
	cfg := a.config
	manifest := a.fileManifest
	packs := a.games
	a.mu.Unlock()

	if cfg.WriteFieldFiles {
		next, err := writeFieldFiles(cfg.OutputDir, state, cfg.Game, packs, manifest)
		if err != nil {
			return fmt.Errorf("field files: %w", err)
		}
		a.mu.Lock()
		a.fileManifest = next
		a.mu.Unlock()
	}
	if cfg.WriteJSON {
		if err := writeStateJSON(cfg.OutputDir, state); err != nil {
			return fmt.Errorf("state.json: %w", err)
		}
	}
	if cfg.EnableServer && a.server != nil {
		if msg, err := json.Marshal(OverlayMessage{State: state, Appearance: a.effectiveAppearance()}); err == nil {
			a.server.hub.broadcast(msg)
		}
	}
	return nil
}

func (a *App) startServer() {
	if !a.config.EnableServer {
		return
	}
	getOverlayPath := func() string {
		a.mu.RLock()
		defer a.mu.RUnlock()
		return a.config.OverlayPath
	}
	getGamesDir := func() string {
		a.mu.RLock()
		defer a.mu.RUnlock()
		return a.config.GamesDir
	}
	getSponsorsDir := func() string {
		a.mu.RLock()
		defer a.mu.RUnlock()
		return a.config.SponsorsDir
	}
	getAppearance := func() OverlayAppearance {
		return a.effectiveAppearance()
	}
	a.server = newOverlayServer(a.config.HTTPPort, getOverlayPath, getGamesDir, getSponsorsDir, a.GetState, getAppearance)
	a.server.start()
}

// Muted port palette in Melee P1/P2/P3/P4 order. Mirrors
// frontend/src/portColors.ts — keep them in sync when adjusting.
var portColors = [4]string{
	"#c96a6a", // P1 red
	"#5f8fc4", // P2 blue
	"#cdb466", // P3 yellow
	"#7ab07a", // P4 green
}

// ResizeWindow sets the native window dimensions. Called from the frontend
// when the match format changes (1v1 → 600 tall, 2v2 → 1100 tall).
func (a *App) ResizeWindow(width, height int) {
	wailsruntime.WindowSetSize(a.ctx, width, height)
}

func defaultState() StreamState {
	return StreamState{
		SetInfo: SetInfo{
			BestOf: BestOf3,
			Format: Format1v1,
		},
		Casters: []Caster{},
		ScoreEntities: []ScoreEntity{
			{Players: []Player{{}}, PortColor: portColors[0]},
			{Players: []Player{{}}, PortColor: portColors[1]},
		},
	}
}

func defaultConfig() OutputConfig {
	return OutputConfig{
		OutputDir:       "obs-output",
		OverlayPath:     "overlay/index.html",
		GamesDir:        "games",
		SponsorsDir:     "sponsors",
		HTTPPort:        35920,
		WriteFieldFiles: true,
		WriteJSON:       true,
		EnableServer:    true,
		Appearance: OverlayAppearance{
			Layout:          "dual",
			GameAspect:      "4:3",
			Accent:          "#e8711a",
			SidebarBg:       "#18100a",
			SidebarWidth:    240,
			CamHeight:       300,
			NameFont:        `"Arial Black", Impact, "Arial Narrow", sans-serif`,
			NameFontSize:    30,
			RoundFontSize:   30,
			SponsorInterval: 5,
			SponsorWidth:    200,
			SponsorHeight:   0,
			SponsorPadding:  16,
		},
	}
}

