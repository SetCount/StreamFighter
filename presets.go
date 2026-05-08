package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
)

const (
	playersPath = "players.json"
	castersPath = "casters.json"
)

// newPresetID returns a stable random hex string used as a preset's ID.
// IDs are app-assigned on first save so users can copy-paste rows in
// the JSON files without ID collisions.
func newPresetID() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return ""
	}
	return hex.EncodeToString(b[:])
}

func loadPlayerPresets() []PlayerPreset {
	out := []PlayerPreset{}
	raw, err := os.ReadFile(playersPath)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load players.json: %v\n", err)
		}
		return out
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		fmt.Fprintf(os.Stderr, "load players.json: %v (returning empty list)\n", err)
		return []PlayerPreset{}
	}
	return out
}

func savePlayerPresets(p []PlayerPreset) error {
	b, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(playersPath, b, 0o644)
}

func loadCasterPresets() []CasterPreset {
	out := []CasterPreset{}
	raw, err := os.ReadFile(castersPath)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load casters.json: %v\n", err)
		}
		return out
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		fmt.Fprintf(os.Stderr, "load casters.json: %v (returning empty list)\n", err)
		return []CasterPreset{}
	}
	return out
}

func saveCasterPresets(c []CasterPreset) error {
	b, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(castersPath, b, 0o644)
}
