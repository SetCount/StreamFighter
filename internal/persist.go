package internal

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// loadJSON reads path, unmarshals into v, or calls defaultFn and
// returns that value when the file is missing. Unmarshal errors trigger
// a stderr warning and return the result of defaultFn.
func loadJSON[T any](path string, defaultFn func() T) T {
	zero := defaultFn()
	raw, err := os.ReadFile(path)
	if err != nil {
		if !os.IsNotExist(err) {
			fmt.Fprintf(os.Stderr, "load %s: %v\n", path, err)
		}
		return zero
	}
	if err := json.Unmarshal(raw, &zero); err != nil {
		fmt.Fprintf(os.Stderr, "parse %s: %v (using defaults)\n", path, err)
		return defaultFn()
	}
	return zero
}

// saveJSON marshals v and writes it to path. Missing parent directories
// are created with perm (and all ancestors with 0755). Errors are
// logged; the caller doesn't need to handle them.
func saveJSON(filePerm os.FileMode, path string, v any) {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "save %s: marshal: %v\n", path, err)
		return
	}
	if filePerm != 0 {
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "save %s: mkdir: %v\n", path, err)
			return
		}
	}
	if err := os.WriteFile(path, b, filePerm); err != nil {
		fmt.Fprintf(os.Stderr, "save %s: %v\n", path, err)
	}
}
