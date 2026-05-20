package internal

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

// GamePack is a single game's worth of character/costume metadata
// discovered on disk under the configured games directory. Image files
// referenced by ID are served by the overlay HTTP server at
// /games/<id>/characters/<charId>/{select,portrait_NN,stock_NN}.png.
type GamePack struct {
	ID         string      `json:"id"`
	Name       string      `json:"name"`
	ShortName  string      `json:"shortName"`
	// AspectRatio is the game's native display aspect as "W:H"
	// (e.g. Melee "73:60", P+ "19:15"). Drives the overlay's center
	// game-area sizing. Optional; empty falls back to a sane default
	// in the overlay CSS.
	AspectRatio string      `json:"aspectRatio,omitempty"`
	Characters []Character `json:"characters"`
	// CharacterLayout mirrors the in-game CSS row layout: each inner
	// slice is one row of character IDs, rendered horizontally centered
	// in CharacterPicker. Optional; when empty the picker falls back to
	// an alphabetical auto-grid. Characters present on disk but missing
	// from the layout are appended as a trailing row.
	CharacterLayout [][]string `json:"characterLayout,omitempty"`
	// PortColors are the per-player slot colors offered in 1v1 and FFA
	// formats (the entity legend swatches). Optional; when empty the
	// frontend falls back to the legacy 4-color palette.
	PortColors []string `json:"portColors,omitempty"`
	// TeamColors are the per-team slot colors offered in 2v2 format.
	// Optional; when empty the frontend falls back to PortColors (or
	// the legacy palette when neither is configured).
	TeamColors []string `json:"teamColors,omitempty"`
}

// Character is one playable fighter within a GamePack.
type Character struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Costumes []Costume `json:"costumes"`
}

// Costume is one alt for a character. Index matches the on-disk dir name
// (1-based, two-digit zero-padded).
type Costume struct {
	Index int `json:"index"`
}

// gameManifest is the on-disk shape of game.json.
type gameManifest struct {
	Name            string            `json:"name"`
	ShortName       string            `json:"shortName"`
	AspectRatio     string            `json:"aspectRatio"`
	CharacterNames  map[string]string `json:"characterNames"`
	CharacterLayout [][]string        `json:"characterLayout"`
	PortColors      []string          `json:"portColors"`
	TeamColors      []string          `json:"teamColors"`
}

// portraitRE matches per-costume portrait files in a character dir.
// A costume is recognized when both portrait_NN.png and stock_NN.png
// exist for the same NN.
var portraitRE = regexp.MustCompile(`^portrait_([0-9]{2})\.png$`)

// loadGames scans dir for game packs. Each immediate subdirectory is one
// pack; malformed packs are skipped with a stderr warning so a single
// broken pack can't take the app down.
func loadGames(dir string) []GamePack {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load games: read %s: %v\n", dir, err)
		}
		return nil
	}
	packs := make([]GamePack, 0, len(entries))
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		pack, err := loadGamePack(filepath.Join(dir, e.Name()), e.Name())
		if err != nil {
			fmt.Fprintf(os.Stderr, "load game pack %s: %v\n", e.Name(), err)
			continue
		}
		packs = append(packs, pack)
	}
	sort.Slice(packs, func(i, j int) bool { return packs[i].ID < packs[j].ID })
	return packs
}

func loadGamePack(dir, id string) (GamePack, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "game.json"))
	if err != nil {
		return GamePack{}, fmt.Errorf("read game.json: %w", err)
	}
	var m gameManifest
	if err := json.Unmarshal(raw, &m); err != nil {
		return GamePack{}, fmt.Errorf("parse game.json: %w", err)
	}
	pack := GamePack{
		ID:              id,
		Name:            coalesce(m.Name, humanizeID(id)),
		ShortName:       coalesce(m.ShortName, m.Name, humanizeID(id)),
		AspectRatio:     m.AspectRatio,
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
		return GamePack{}, fmt.Errorf("read characters: %w", err)
	}
	for _, ce := range charEntries {
		if !ce.IsDir() {
			continue
		}
		char, ok := loadCharacter(filepath.Join(charsDir, ce.Name()), ce.Name(), m.CharacterNames)
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
	char := Character{ID: id, Name: coalesce(nameOverrides[id], humanizeID(id))}

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

// humanizeID turns "captain_falcon" into "Captain Falcon". Used as the
// default display name when nothing in game.json overrides it.
func humanizeID(id string) string {
	parts := strings.Split(id, "_")
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, " ")
}

func coalesce(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

// findGamePack returns the pack with the given ID or nil if not loaded.
func findGamePack(packs []GamePack, id string) *GamePack {
	for i := range packs {
		if packs[i].ID == id {
			return &packs[i]
		}
	}
	return nil
}

// characterDisplayName resolves a character ID to its display name within
// pack, or returns the ID unchanged if pack is nil or the character is
// missing. This is what gets written to OBS field files.
func characterDisplayName(pack *GamePack, charID string) string {
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
