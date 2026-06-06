package internal

import (
	"fmt"
	"math"
	"os"

	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// Hotkey action IDs — keep in sync with HOTKEY_ACTIONS in HotkeysEditor.tsx.
const (
	ActionScoreE1Inc   = "score_e1_inc"
	ActionScoreE1Dec   = "score_e1_dec"
	ActionScoreE2Inc   = "score_e2_inc"
	ActionScoreE2Dec   = "score_e2_dec"
	ActionSwapEntities = "swap_entities"
	ActionClear        = "clear"
)

// hotkeyManager owns the lifecycle of OS-level global hotkey registrations.
// Currently a skeleton: bindings are persisted and the action dispatch works,
// but actual keypress capture requires a platform-specific library
// (e.g. golang.design/x/hotkey) and will be wired in a future pass.
type hotkeyManager struct {
	app      *App
	bindings map[string]string // action → key combo
	stopCh   chan struct{}
}

func newHotkeyManager(app *App) *hotkeyManager {
	return &hotkeyManager{
		app:      app,
		bindings: map[string]string{},
	}
}

// start reads the current HotkeyConfig and registers global hotkeys.
// Called from App.Startup after the context is available.
func (hm *hotkeyManager) start() {
	cfg := hm.app.GetHotkeyConfig()
	if !cfg.Enabled {
		return
	}
	hm.bindings = cfg.Bindings
	hm.stopCh = make(chan struct{})

	// TODO: For each binding, translate the key combo string (e.g.
	// "Ctrl+Shift+Digit1") into platform-specific modifiers + virtual
	// key code, then register with the OS. When a hotkey fires, call
	// hm.app.ExecuteHotkeyAction(actionID).
	//
	// Candidate library: golang.design/x/hotkey
	//   hk := hotkey.New(mods, key)
	//   hk.Register()
	//   go func() { for range hk.Keydown() { hm.app.executeHotkeyAction(id) } }()
	//
	// For now the bindings are saved and the dispatch layer below works;
	// only the OS registration is stubbed.
	fmt.Fprintf(os.Stderr, "hotkey manager: started with %d binding(s) (OS capture not yet wired)\n", len(hm.bindings))
}

// stop unregisters all global hotkeys.
func (hm *hotkeyManager) stop() {
	if hm.stopCh != nil {
		close(hm.stopCh)
		hm.stopCh = nil
	}
	// TODO: unregister each OS-level hotkey here.
}

// rebind tears down and re-registers hotkeys after a config change.
func (hm *hotkeyManager) rebind() {
	hm.stop()
	hm.start()
}

// ExecuteHotkeyAction dispatches an action triggered by a global hotkey
// or by the frontend's in-app key listener. Mutates state, persists,
// pushes to OBS, and emits a Wails event so the frontend stays in sync.
func (a *App) ExecuteHotkeyAction(actionID string) {
	a.mu.Lock()
	switch actionID {
	case ActionScoreE1Inc:
		a.adjustScore(0, 1)
	case ActionScoreE1Dec:
		a.adjustScore(0, -1)
	case ActionScoreE2Inc:
		a.adjustScore(1, 1)
	case ActionScoreE2Dec:
		a.adjustScore(1, -1)
	case ActionSwapEntities:
		a.swapEntities()
	case ActionClear:
		a.state = defaultState()
	default:
		a.mu.Unlock()
		return
	}
	state := a.state
	a.mu.Unlock()

	saveState(state, statePath())
	_ = a.Update()
	a.emitStateChanged()
}

// adjustScore increments or decrements the score of the entity at idx.
// Must be called with a.mu held.
func (a *App) adjustScore(entityIdx, delta int) {
	if entityIdx >= len(a.state.ScoreEntities) {
		return
	}
	maxScore := int(math.Ceil(float64(a.state.ScoreEntities[entityIdx].CurrentScore)))
	_ = maxScore
	winTarget := int(math.Ceil(float64(a.state.SetInfo.BestOf) / 2.0))
	score := a.state.ScoreEntities[entityIdx].CurrentScore + delta
	if score < 0 {
		score = 0
	}
	if score > winTarget {
		score = winTarget
	}
	a.state.ScoreEntities[entityIdx].CurrentScore = score
}

// swapEntities swaps the first two score entities (players/teams).
// Must be called with a.mu held.
func (a *App) swapEntities() {
	if len(a.state.ScoreEntities) < 2 {
		return
	}
	a.state.ScoreEntities[0], a.state.ScoreEntities[1] = a.state.ScoreEntities[1], a.state.ScoreEntities[0]
}

// emitStateChanged fires a Wails event so the frontend can re-fetch
// state after a Go-side mutation (e.g. hotkey action).
func (a *App) emitStateChanged() {
	if a.ctx == nil {
		return
	}
	wailsruntime.EventsEmit(a.ctx, "state:changed", a.GetState())
}
