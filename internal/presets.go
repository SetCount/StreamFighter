package internal

import (
	"crypto/rand"
	"encoding/hex"
	"path/filepath"
)

const (
	playersFile = "players.json"
	castersFile = "casters.json"
)

func playersPath() string { return filepath.Join(DataDir(), playersFile) }
func castersPath() string { return filepath.Join(DataDir(), castersFile) }

func newPresetID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	return hex.EncodeToString(b[:])
}

func loadPlayerPresets() []PlayerPreset {
	return loadJSON(playersPath(), func() []PlayerPreset { return []PlayerPreset{} })
}

func savePlayerPresets(p []PlayerPreset) error {
	saveJSON(0o644, playersPath(), p)
	return nil
}

func loadCasterPresets() []CasterPreset {
	return loadJSON(castersPath(), func() []CasterPreset { return []CasterPreset{} })
}

func saveCasterPresets(c []CasterPreset) error {
	saveJSON(0o644, castersPath(), c)
	return nil
}
