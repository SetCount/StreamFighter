package main

import (
	"context"
	_ "embed"
	"fmt"
	"os"
	"sync"
	"time"
)

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
	// fileManifest tracks which per-field files we wrote on the previous
	// Update so we can clean up entries that have since gone away.
	fileManifest map[string]struct{}
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		state:        defaultState(),
		config:       defaultConfig(),
		fileManifest: map[string]struct{}{},
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	if err := ensureOverlayFile(a.config.OverlayPath); err != nil {
		fmt.Println("seed overlay file:", err)
	}
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

// SetConfig replaces the output configuration. Changing HTTPPort or
// EnableServer takes effect on the next app start.
func (a *App) SetConfig(c OutputConfig) {
	a.mu.Lock()
	a.config = c
	a.mu.Unlock()
}

// OverlayURL is the address an OBS browser source should point at.
func (a *App) OverlayURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/overlay", a.config.HTTPPort)
}

// Update writes the current state out through every enabled channel:
// per-field text files, a JSON snapshot, and an SSE broadcast.
func (a *App) Update() error {
	a.mu.Lock()
	state := a.state
	cfg := a.config
	manifest := a.fileManifest
	a.mu.Unlock()

	if cfg.WriteFieldFiles {
		next, err := writeFieldFiles(cfg.OutputDir, state, manifest)
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
	a.server = newOverlayServer(a.config.HTTPPort, getOverlayPath, a.GetState)
	a.server.start()
}

func defaultState() StreamState {
	return StreamState{
		SetInfo: SetInfo{
			BestOf: BestOf3,
			Format: Format1v1,
		},
		Casters: []Caster{},
		ScoreEntities: []ScoreEntity{
			{Players: []Player{{}}, PortColor: "red"},
			{Players: []Player{{}}, PortColor: "blue"},
		},
	}
}

func defaultConfig() OutputConfig {
	return OutputConfig{
		OutputDir:       "obs-output",
		OverlayPath:     "overlay.html",
		HTTPPort:        35920,
		WriteFieldFiles: true,
		WriteJSON:       true,
		EnableServer:    true,
	}
}

