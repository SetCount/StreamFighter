package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

// configPath is the cwd-relative file we persist OutputConfig to so
// settings (game pack, paths, port toggles) survive across launches.
const configPath = "streamassist.config.json"

// defaultOverlayHTML is written to OverlayPath on first run if no file
// exists there. The server always reads from disk afterwards so user
// edits are picked up on the next browser-source refresh.
//
//go:embed overlay.html
var defaultOverlayHTML []byte

// App struct
type App struct {
	ctx    context.Context
	mu     sync.RWMutex
	state  StreamState
	config OutputConfig
	server *overlayServer
	games  []GamePack
	// fileManifest tracks which per-field files we wrote on the previous
	// Update so we can clean up entries that have since gone away.
	fileManifest map[string]struct{}
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		state:        defaultState(),
		config:       loadConfig(),
		fileManifest: map[string]struct{}{},
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

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := ensureOverlayFile(a.config.OverlayPath); err != nil {
		fmt.Println("seed overlay file:", err)
	}
	a.games = loadGames(a.config.GamesDir)
	a.startServer()
}

// ensureOverlayFile writes the bundled default overlay to path if nothing
// exists there yet. Existing files are never touched.
func ensureOverlayFile(path string) error {
	if path == "" {
		return nil
	}
	if _, err := os.Stat(path); err == nil {
		return nil
	} else if !os.IsNotExist(err) {
		return err
	}
	return os.WriteFile(path, defaultOverlayHTML, 0o644)
}

// shutdown gracefully tears down the overlay HTTP server.
func (a *App) shutdown(_ context.Context) {
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

// SetState replaces the in-memory state from the frontend. It does not
// persist to disk — call Update for that.
func (a *App) SetState(s StreamState) {
	a.mu.Lock()
	a.state = s
	a.mu.Unlock()
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
}

// OverlayURL is the address an OBS browser source should point at.
func (a *App) OverlayURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/overlay", a.config.HTTPPort)
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
		if msg, err := marshalJSON(state); err == nil {
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
	a.server = newOverlayServer(a.config.HTTPPort, getOverlayPath, getGamesDir, a.GetState)
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
		OverlayPath:     "overlay.html",
		GamesDir:        "games",
		HTTPPort:        35920,
		WriteFieldFiles: true,
		WriteJSON:       true,
		EnableServer:    true,
	}
}

