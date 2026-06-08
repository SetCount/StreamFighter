package internal

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sync"
	"time"

	"StreamFighter/internal/gamepacks"
	"StreamFighter/internal/startgg"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

func configPath() string         { return filepath.Join(ConfigDir(), "streamfighter.config.json") }
func secretsPath() string        { return filepath.Join(ConfigDir(), "streamfighter.secrets.json") }
func hotkeyConfigPath() string   { return filepath.Join(ConfigDir(), "streamfighter.hotkeys.json") }
func statePath() string          { return filepath.Join(DataDir(), "streamfighter.state.json") }
func layoutRegistryPath() string { return filepath.Join(DataDir(), "layouts.json") }

// LayoutRegistry maps aspect ratio strings to their compatible layout IDs.
type LayoutRegistry map[string][]string

type App struct {
	ctx            context.Context
	mu             sync.RWMutex
	overlayFS      fs.FS
	state          StreamState
	config         OutputConfig
	secrets        Secrets
	hotkeyConfig   HotkeyConfig
	server         *overlayServer
	hotkeys        *hotkeyManager
	packs          []gamepacks.Pack
	layoutRegistry LayoutRegistry
	playerPresets  []PlayerPreset
	casterPresets  []CasterPreset
	fileManifest   map[string]struct{}
}

func NewApp(overlayFS fs.FS) *App {
	ensureConfigDir()
	return &App{
		overlayFS:     overlayFS,
		state:         loadJSON(statePath(), defaultState),
		config:        loadConfig(),
		secrets:       loadJSON(secretsPath(), func() Secrets { return Secrets{} }),
		hotkeyConfig:  loadHotkeyConfig(),
		playerPresets: loadPlayerPresets(),
		casterPresets: loadCasterPresets(),
		fileManifest:  map[string]struct{}{},
	}
}

// --- Persist helpers that use the generic loadJSON/saveJSON ---

func loadConfig() OutputConfig {
	cfg := defaultConfig()
	raw, err := os.ReadFile(configPath())
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

func saveConfig(cfg OutputConfig, path string) {
	saveJSON(0o644, path, cfg)
}

func defaultConfig() OutputConfig {
	return OutputConfig{
		OutputDir:       "obs-output",
		OverlayPath:     filepath.Join(DataDir(), "overlay", "index.html"),
		GamesDir:        filepath.Join(DataDir(), "games"),
		SponsorsDir:     filepath.Join(DataDir(), "sponsors"),
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

func loadHotkeyConfig() HotkeyConfig {
	cfg := HotkeyConfig{Bindings: map[string]string{}}
	raw, err := os.ReadFile(hotkeyConfigPath())
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load hotkey config: %v\n", err)
		}
		return cfg
	}
	if err := json.Unmarshal(raw, &cfg); err != nil {
		fmt.Fprintf(os.Stderr, "load hotkey config: %v (using defaults)\n", err)
		return HotkeyConfig{Bindings: map[string]string{}}
	}
	if cfg.Bindings == nil {
		cfg.Bindings = map[string]string{}
	}
	return cfg
}

func ensureConfigDir() { ensureAppDirs() }

// --- App lifecycle ---

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	if err := a.ensureOverlayDir(a.config.OverlayPath); err != nil {
		fmt.Println("seed overlay dir:", err)
	}
	a.packs = gamepacks.Load(a.config.GamesDir)
	a.layoutRegistry = loadJSON(layoutRegistryPath(), func() LayoutRegistry { return LayoutRegistry{} })
	a.startServer()
	a.hotkeys = newHotkeyManager(a)
	a.hotkeys.start()
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
	if a.hotkeys != nil {
		a.hotkeys.stop()
	}
	if a.server == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = a.server.shutdown(ctx)
}

// --- State ---

func (a *App) GetState() StreamState {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.state
}

func (a *App) SetState(s StreamState) {
	a.mu.Lock()
	a.state = s
	a.mu.Unlock()
	saveJSON(0o644, statePath(), s)
}

func (a *App) ClearState() StreamState {
	s := defaultState()
	a.mu.Lock()
	a.state = s
	a.mu.Unlock()
	saveJSON(0o644, statePath(), s)
	return s
}

// --- Config ---

func (a *App) GetConfig() OutputConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.config
}

func (a *App) SetConfig(c OutputConfig) {
	a.mu.Lock()
	a.config = c
	a.mu.Unlock()
	saveConfig(c, configPath())
	if c.EnableServer && a.server != nil {
		if msg, err := json.Marshal(OverlayMessage{State: a.GetState(), Appearance: a.effectiveAppearance()}); err == nil {
			a.server.hub.broadcast(msg)
		}
	}
}

func (a *App) effectiveAppearance() OverlayAppearance {
	a.mu.RLock()
	defer a.mu.RUnlock()
	app := a.config.Appearance
	app.GameID = a.config.Game
	if pack := gamepacks.FindPack(a.packs, a.config.Game); pack != nil && len(pack.AspectRatios) > 0 {
		if app.GameAspect == "" || !contains(pack.AspectRatios, app.GameAspect) {
			app.GameAspect = pack.AspectRatios[0]
		}
	}
	if layouts, ok := a.layoutRegistry[app.GameAspect]; ok && len(layouts) > 0 {
		if !contains(layouts, app.Layout) {
			app.Layout = layouts[0]
		}
	}
	return app
}

func contains(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

// --- URLs ---

func (a *App) GameOverlayURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/game", a.config.HTTPPort)
}

func (a *App) BetweenOverlayURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/between", a.config.HTTPPort)
}

func (a *App) AssetsBaseURL() string {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return fmt.Sprintf("http://localhost:%d/games", a.config.HTTPPort)
}

// --- Game packs ---

func (a *App) ListGames() []gamepacks.Pack {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.packs
}

func (a *App) GetLayoutRegistry() LayoutRegistry {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.layoutRegistry
}

func (a *App) ReloadGames() []gamepacks.Pack {
	a.mu.RLock()
	dir := a.config.GamesDir
	a.mu.RUnlock()
	packs := gamepacks.Load(dir)
	a.mu.Lock()
	a.packs = packs
	a.mu.Unlock()
	return packs
}

func (a *App) OpenGamesDir() error {
	a.mu.RLock()
	dir := a.config.GamesDir
	a.mu.RUnlock()
	if dir == "" {
		return errors.New("no games directory configured")
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create games dir: %w", err)
	}
	return openInFileManager(dir)
}

func openInFileManager(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", path)
	case "windows":
		cmd = exec.Command("explorer", path)
	default:
		cmd = exec.Command("xdg-open", path)
	}
	return cmd.Start()
}

// --- Secrets ---

func (a *App) GetSecrets() Secrets {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.secrets
}

func (a *App) SetSecrets(s Secrets) {
	a.mu.Lock()
	a.secrets = s
	a.mu.Unlock()
	saveJSON(0o600, secretsPath(), s)
}

// --- Hotkey config ---

func (a *App) GetHotkeyConfig() HotkeyConfig {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.hotkeyConfig
}

func (a *App) SetHotkeyConfig(cfg HotkeyConfig) {
	if cfg.Bindings == nil {
		cfg.Bindings = map[string]string{}
	}
	a.mu.Lock()
	a.hotkeyConfig = cfg
	a.mu.Unlock()
	saveJSON(0o644, hotkeyConfigPath(), cfg)
	if a.hotkeys != nil {
		a.hotkeys.rebind()
	}
}

// --- Player presets ---

func (a *App) ListPlayerPresets() []PlayerPreset {
	p := loadPlayerPresets()
	a.mu.Lock()
	a.playerPresets = p
	a.mu.Unlock()
	return p
}

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

// --- Caster presets ---

func (a *App) ListCasterPresets() []CasterPreset {
	c := loadCasterPresets()
	a.mu.Lock()
	a.casterPresets = c
	a.mu.Unlock()
	return c
}

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

// --- start.gg ---

func (a *App) FetchStartggSets(rawURL string) (startgg.SetsResult, error) {
	a.mu.RLock()
	token := a.secrets.StartggToken
	a.mu.RUnlock()
	if token == "" {
		return startgg.SetsResult{}, errors.New("no start.gg token configured (Settings → StartGG token)")
	}
	slug, err := startgg.ParseTournamentSlug(rawURL)
	if err != nil {
		return startgg.SetsResult{}, err
	}
	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := context.WithTimeout(parent, 15*time.Second)
	defer cancel()
	return startgg.NewClient(token).FetchSets(ctx, slug, 64)
}

func (a *App) FetchStartggTournament(rawURL string) (startgg.Tournament, error) {
	a.mu.RLock()
	token := a.secrets.StartggToken
	a.mu.RUnlock()
	if token == "" {
		return startgg.Tournament{}, errors.New("no start.gg token configured (Settings → StartGG token)")
	}
	slug, err := startgg.ParseTournamentSlug(rawURL)
	if err != nil {
		return startgg.Tournament{}, err
	}
	parent := a.ctx
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := context.WithTimeout(parent, 10*time.Second)
	defer cancel()
	return startgg.NewClient(token).FetchTournament(ctx, slug)
}

// --- Update ---

func (a *App) Update() error {
	a.mu.RLock()
	state := a.state
	cfg := a.config
	manifest := a.fileManifest
	a.mu.RUnlock()

	if cfg.WriteFieldFiles {
		next, err := writeFieldFiles(cfg.OutputDir, state, cfg.Game, a.packs, manifest)
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

// --- Window & defaults ---

var portColors = [4]string{
	"#c96a6a",
	"#5f8fc4",
	"#cdb466",
	"#7ab07a",
}

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
