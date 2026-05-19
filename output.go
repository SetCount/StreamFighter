package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
)

// flattenFields produces the set of per-field files written for OBS Text
// sources. Keys are filenames (relative to OutputDir), values are contents.
// gameID names the active pack (from OutputConfig.Game); packs is
// consulted to resolve character IDs into display names.
func flattenFields(s StreamState, gameID string, packs []GamePack) map[string]string {
	pack := findGamePack(packs, gameID)
	gameName := gameID
	if pack != nil {
		gameName = pack.Name
	}
	out := map[string]string{
		"tournament_name.txt": s.SetInfo.TournamentName,
		"round_label.txt":     s.SetInfo.RoundLabel,
		"best_of.txt":         strconv.Itoa(int(s.SetInfo.BestOf)),
		"format.txt":          string(s.SetInfo.Format),
		"game.txt":            gameName,
	}
	for i, c := range s.Casters {
		prefix := fmt.Sprintf("caster_%d", i+1)
		out[prefix+"_name.txt"] = c.Name
		for j, soc := range c.Socials {
			sp := fmt.Sprintf("%s_social_%d", prefix, j+1)
			out[sp+"_icon.txt"] = string(soc.Icon)
			out[sp+"_handle.txt"] = soc.Handle
		}
	}
	for i, e := range s.ScoreEntities {
		prefix := fmt.Sprintf("entity_%d", i+1)
		out[prefix+"_score.txt"] = strconv.Itoa(e.CurrentScore)
		out[prefix+"_color.txt"] = e.PortColor
		for j, p := range e.Players {
			pp := fmt.Sprintf("%s_player_%d", prefix, j+1)
			out[pp+"_name.txt"] = p.Name
			out[pp+"_pronouns.txt"] = p.Pronouns
			out[pp+"_prefix.txt"] = p.Prefix
			out[pp+"_character.txt"] = characterDisplayName(pack, p.Character)
			out[pp+"_costume.txt"] = strconv.Itoa(p.Costume)
		}
	}
	return out
}

// writeFieldFiles writes the flattened state to dir, removing any files this
// app wrote on a previous call that are no longer present in the new set.
// previous is the manifest from the last write; the returned map is the
// caller's new manifest.
func writeFieldFiles(dir string, s StreamState, gameID string, packs []GamePack, previous map[string]struct{}) (map[string]struct{}, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return previous, err
	}
	files := flattenFields(s, gameID, packs)
	written := make(map[string]struct{}, len(files))
	for name, contents := range files {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
			return previous, fmt.Errorf("write %s: %w", name, err)
		}
		written[name] = struct{}{}
	}
	for name := range previous {
		if _, kept := written[name]; kept {
			continue
		}
		_ = os.Remove(filepath.Join(dir, name))
	}
	return written, nil
}

// writeStateJSON writes the full state as a single JSON file.
func writeStateJSON(dir string, s StreamState) error {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	b, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "state.json"), b, 0o644)
}
