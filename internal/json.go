package internal

import (
	"encoding/json"
	"io"
)

func marshalJSON(v any) ([]byte, error) {
	return json.Marshal(v)
}

func writeJSON(w io.Writer, v any) error {
	return json.NewEncoder(w).Encode(v)
}
