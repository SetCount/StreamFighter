package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const startggEndpoint = "https://api.start.gg/gql/alpha"

// StartggTournament is the minimal tournament identity we surface to
// the frontend after a fetch.
type StartggTournament struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// StartggPlayer is a stable account: ID is the start.gg player ID, the
// thing we use for ID-based preset matching.
type StartggPlayer struct {
	ID       int64  `json:"id"`
	GamerTag string `json:"gamerTag"`
}

// StartggEntrant is one side of a set: a single player in 1v1 or a
// team/multi-player slot in 2v2 or FFA.
type StartggEntrant struct {
	Name    string          `json:"name"`
	Players []StartggPlayer `json:"players"`
}

// StartggSet is one match. EventName is flattened from the parent
// event so the picker UI can render "Singles · WR2 — A vs B" inline.
// State follows start.gg's set state: 1=created, 2=ongoing, 3=completed.
type StartggSet struct {
	ID            string           `json:"id"`
	FullRoundText string           `json:"fullRoundText"`
	EventName     string           `json:"eventName"`
	State         int              `json:"state"`
	Entrants      []StartggEntrant `json:"entrants"`
}

// StartggSetsResult bundles the tournament identity and a flat sets
// list so a single Wails call covers both header and rows.
type StartggSetsResult struct {
	Tournament StartggTournament `json:"tournament"`
	Sets       []StartggSet      `json:"sets"`
}

// ParseTournamentSlug pulls the tournament slug out of any start.gg
// URL of the form `https?://(www.)?start.gg/tournament/<slug>[/...]`.
// Bare slugs (already-extracted) are accepted too.
func ParseTournamentSlug(raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", errors.New("tournament URL is empty")
	}
	if !strings.Contains(raw, "/") && !strings.Contains(raw, "://") {
		return raw, nil
	}
	if !strings.Contains(raw, "://") {
		raw = "https://" + raw
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("parse url: %w", err)
	}
	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	for i, p := range parts {
		if p == "tournament" && i+1 < len(parts) {
			return parts[i+1], nil
		}
	}
	return "", fmt.Errorf("no /tournament/<slug> segment in %q", raw)
}

type startggClient struct {
	token string
	http  *http.Client
}

func newStartggClient(token string) *startggClient {
	return &startggClient{
		token: token,
		http:  &http.Client{Timeout: 20 * time.Second},
	}
}

// startgg's GraphQL response shape — separate from the public types so
// we can mold it into something flatter for the frontend.
type sggResp struct {
	Data struct {
		Tournament *struct {
			Name   string `json:"name"`
			Slug   string `json:"slug"`
			Events []struct {
				Name string `json:"name"`
				Sets struct {
					Nodes []struct {
						ID            json.Number `json:"id"`
						FullRoundText string      `json:"fullRoundText"`
						State         int         `json:"state"`
						Slots         []struct {
							Entrant *struct {
								Name         string `json:"name"`
								Participants []struct {
									Player *struct {
										ID       int64  `json:"id"`
										GamerTag string `json:"gamerTag"`
									} `json:"player"`
								} `json:"participants"`
							} `json:"entrant"`
						} `json:"slots"`
					} `json:"nodes"`
				} `json:"sets"`
			} `json:"events"`
		} `json:"tournament"`
	} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

const sggSetsQuery = `
query TournamentSets($slug: String!, $perPage: Int!) {
  tournament(slug: $slug) {
    name slug
    events {
      name
      sets(perPage: $perPage, page: 1, sortType: RECENT) {
        nodes {
          id fullRoundText state
          slots {
            entrant {
              name
              participants { player { id gamerTag } }
            }
          }
        }
      }
    }
  }
}`

// FetchTournamentSets returns up to perPage sets per event, flattened
// across every event in the tournament. Sets with no entrants in any
// slot are skipped — the picker shouldn't waste a row on TBD vs TBD.
func (c *startggClient) FetchTournamentSets(
	ctx context.Context, slug string, perPage int,
) (StartggSetsResult, error) {
	body := map[string]any{
		"query":     sggSetsQuery,
		"variables": map[string]any{"slug": slug, "perPage": perPage},
	}
	buf, err := json.Marshal(body)
	if err != nil {
		return StartggSetsResult{}, err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", startggEndpoint, bytes.NewReader(buf))
	if err != nil {
		return StartggSetsResult{}, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return StartggSetsResult{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return StartggSetsResult{}, fmt.Errorf("startgg http %d", resp.StatusCode)
	}

	var parsed sggResp
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return StartggSetsResult{}, fmt.Errorf("decode startgg: %w", err)
	}
	if len(parsed.Errors) > 0 {
		return StartggSetsResult{}, fmt.Errorf("startgg: %s", parsed.Errors[0].Message)
	}
	if parsed.Data.Tournament == nil {
		return StartggSetsResult{}, fmt.Errorf("tournament %q not found", slug)
	}

	t := parsed.Data.Tournament
	out := StartggSetsResult{
		Tournament: StartggTournament{Name: t.Name, Slug: t.Slug},
		Sets:       []StartggSet{},
	}
	for _, ev := range t.Events {
		for _, n := range ev.Sets.Nodes {
			entrants := make([]StartggEntrant, 0, len(n.Slots))
			for _, s := range n.Slots {
				if s.Entrant == nil {
					continue
				}
				ents := make([]StartggPlayer, 0, len(s.Entrant.Participants))
				for _, p := range s.Entrant.Participants {
					if p.Player == nil {
						continue
					}
					ents = append(ents, StartggPlayer{
						ID:       p.Player.ID,
						GamerTag: p.Player.GamerTag,
					})
				}
				entrants = append(entrants, StartggEntrant{
					Name:    s.Entrant.Name,
					Players: ents,
				})
			}
			if len(entrants) == 0 {
				continue
			}
			out.Sets = append(out.Sets, StartggSet{
				ID:            n.ID.String(),
				FullRoundText: n.FullRoundText,
				EventName:     ev.Name,
				State:         n.State,
				Entrants:      entrants,
			})
		}
	}
	return out, nil
}
