package gamepacks

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// Pack is a single game's metadata discovered on disk.
type Pack struct {
	ID              string      `json:"id"`
	Name            string      `json:"name"`
	ShortName       string      `json:"shortName"`
	AspectRatios    []string    `json:"aspectRatios,omitempty"`
	CharacterLayout [][]string  `json:"characterLayout,omitempty"`
	PortColors      []string    `json:"portColors,omitempty"`
	TeamColors      []string    `json:"teamColors,omitempty"`
	Characters      []Character `json:"characters"`
}

// Character is one playable fighter within a Pack.
type Character struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Costumes []Costume `json:"costumes"`
}

// Costume is one alt for a character.
type Costume struct {
	Index int `json:"index"`
}

type manifest struct {
	Name            string            `json:"name"`
	ShortName       string            `json:"shortName"`
	AspectRatio     string            `json:"aspectRatio"`
	AspectRatios    []string          `json:"aspectRatios"`
	CharacterNames  map[string]string `json:"characterNames"`
	CharacterLayout [][]string        `json:"characterLayout"`
	PortColors      []string          `json:"portColors"`
	TeamColors      []string          `json:"teamColors"`
}

var portraitRE = regexp.MustCompile(`^portrait_([0-9]{2})\.png$`)

// Load scans dir for packs. Each immediate subdirectory is one pack.
func Load(dir string) []Pack {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load games: read %s: %v\n", dir, err)
		}
		return nil
	}
	packs := make([]Pack, 0, len(entries))
	for _, e := range entries {
		full := filepath.Join(dir, e.Name())
		if !isDir(full) {
			continue
		}
		pack, err := loadGamePack(full, e.Name())
		if err != nil {
			fmt.Fprintf(os.Stderr, "load game pack %s: %v\n", e.Name(), err)
			continue
		}
		packs = append(packs, pack)
	}
	sort.Slice(packs, func(i, j int) bool { return packs[i].ID < packs[j].ID })
	return packs
}

func loadGamePack(dir, id string) (Pack, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "game.json"))
	if err != nil {
		return Pack{}, fmt.Errorf("read game.json: %w", err)
	}
	var m manifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return Pack{}, fmt.Errorf("parse game.json: %w", err)
	}
	pack := Pack{
		ID:              id,
		Name:            coalesce(m.Name, HumanizeID(id)),
		ShortName:       coalesce(m.ShortName, m.Name, HumanizeID(id)),
		AspectRatios:    normalizeAspectRatios(m.AspectRatios, m.AspectRatio),
		CharacterLayout: m.CharacterLayout,
		PortColors:      m.PortColors,
		TeamColors:      m.TeamColors,
	}

	charsDir := filepath.Join(dir, "characters")
	charEntries, err := os.ReadDir(charsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return pack, nil
		}
		return Pack{}, fmt.Errorf("read characters: %w", err)
	}
	for _, ce := range charEntries {
		full := filepath.Join(charsDir, ce.Name())
		if !isDir(full) {
			continue
		}
		char, ok := loadCharacter(full, ce.Name(), m.CharacterNames)
		if !ok {
			continue
		}
		pack.Characters = append(pack.Characters, char)
	}
	sort.Slice(pack.Characters, func(i, j int) bool {
		return pack.Characters[i].ID < pack.Characters[j].ID
	})
	return pack, nil
}

func loadCharacter(dir, id string, nameOverrides map[string]string) (Character, bool) {
	if _, err := os.Stat(filepath.Join(dir, "select.png")); err != nil {
		fmt.Fprintf(os.Stderr, "skip character %s: missing select.png\n", id)
		return Character{}, false
	}
	char := Character{ID: id, Name: coalesce(nameOverrides[id], HumanizeID(id))}

	entries, err := os.ReadDir(dir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "skip character %s: %v\n", id, err)
		return Character{}, false
	}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		m := portraitRE.FindStringSubmatch(e.Name())
		if m == nil {
			continue
		}
		idx, err := strconv.Atoi(m[1])
		if err != nil {
			continue
		}
		stockPath := filepath.Join(dir, fmt.Sprintf("stock_%02d.png", idx))
		if _, err := os.Stat(stockPath); err != nil {
			continue
		}
		char.Costumes = append(char.Costumes, Costume{Index: idx})
	}
	sort.Slice(char.Costumes, func(i, j int) bool {
		return char.Costumes[i].Index < char.Costumes[j].Index
	})
	return char, true
}

// FindPack returns the pack with the given ID or nil.
func FindPack(packs []Pack, id string) *Pack {
	for i := range packs {
		if packs[i].ID == id {
			return &packs[i]
		}
	}
	return nil
}

// CharacterDisplayName resolves a character ID to its display name.
func CharacterDisplayName(pack *Pack, charID string) string {
	if pack == nil || charID == "" {
		return charID
	}
	for _, c := range pack.Characters {
		if c.ID == charID {
			return c.Name
		}
	}
	return charID
}

// HumanizeID turns "captain_falcon" into "Captain Falcon".
func HumanizeID(id string) string {
	parts := strings.Split(id, "_")
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

func isDir(path string) bool {
	fi, err := os.Stat(path)
	return err == nil && fi.IsDir()
}

func coalesce(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func normalizeAspectRatios(ratios []string, legacy string) []string {
	if len(ratios) > 0 {
		return ratios
	}
	if legacy != "" {
		return []string{legacy}
	}
	return nil
}
