package internal

import (
	"fmt"
	"os"
	"path/filepath"
)

// ConfigDir returns the XDG config directory for StreamFighter config.
// On Linux this respects $XDG_CONFIG_HOME (default ~/.config);
// on macOS ~/Library/Application Support; on Windows %AppData%.
func ConfigDir() string {
	d, err := os.UserConfigDir()
	if err != nil {
		return "."
	}
	return filepath.Join(d, "StreamFighter")
}

// DataDir returns the XDG data directory for StreamFighter application data.
// On Linux this respects $XDG_DATA_HOME (default ~/.local/share);
// on macOS ~/Library/Application Support; on Windows %AppData%.
func DataDir() string {
	d, err := os.UserConfigDir()
	if err != nil {
		return "."
	}
	return filepath.Join(d, "StreamFighter")
}

// ensureAppDirs creates ConfigDir and DataDir, then migrates any existing
// cwd files to their new homes on first run.
func ensureAppDirs() {
	mkdir := func(dir string) {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "ensure app dir: %v\n", err)
		}
	}
	mkdir(ConfigDir())
	mkdir(DataDir())
}
