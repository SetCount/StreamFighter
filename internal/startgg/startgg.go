package startgg

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

const endpoint = "https://api.start.gg/gql/alpha"

// Tournament is the minimal tournament identity surfaced to the frontend.
type Tournament struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// Player is a stable account from start.gg.
type Player struct {
	ID       int64  `json:"id"`
	GamerTag string `json:"gamerTag"`
	Prefix   string `json:"prefix,omitempty"`
}

// Entrant is one side of a set.
type Entrant struct {
	Name    string   `json:"name"`
	Players []Player `json:"players"`
}

// Set is one match.
type Set struct {
	ID            string    `json:"id"`
	FullRoundText string    `json:"fullRoundText"`
	EventName     string    `json:"eventName"`
	State         int       `json:"state"`
	TotalGames    int       `json:"totalGames"`
	Entrants      []Entrant `json:"entrants"`
}

// SetsResult bundles the tournament identity with a flat sets list.
type SetsResult struct {
	Tournament Tournament `json:"tournament"`
	Sets       []Set      `json:"sets"`
}

// ParseTournamentSlug extracts the slug from a start.gg URL or returns a
// bare slug unchanged.
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

// Client wraps start.gg's GraphQL API.
type Client struct {
	token string
	http  *http.Client
}

// NewClient creates a Client that uses the given personal access token.
func NewClient(token string) *Client {
	return &Client{
		token: token,
		http:  &http.Client{Timeout: 20 * time.Second},
	}
}

func (c *Client) post(ctx context.Context, query string, vars map[string]any, out any) error {
	buf, err := json.Marshal(map[string]any{"query": query, "variables": vars})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(buf))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("startgg http %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

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
						TotalGames    int         `json:"totalGames"`
						Slots         []struct {
							Entrant *struct {
								Name         string `json:"name"`
								Participants []struct {
									Prefix string `json:"prefix"`
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

const setsQuery = `
query TournamentSets($slug: String!, $perPage: Int!) {
  tournament(slug: $slug) {
    name slug
    events {
      name
      sets(perPage: $perPage, page: 1, sortType: RECENT) {
        nodes {
          id fullRoundText state totalGames
          slots {
            entrant {
              name
              participants { prefix player { id gamerTag } }
            }
          }
        }
      }
    }
  }
}`

// FetchSets returns up to perPage sets per event, flattened across every
// event in the tournament. Sets with no entrants in any slot are skipped.
func (c *Client) FetchSets(ctx context.Context, slug string, perPage int) (SetsResult, error) {
	var parsed sggResp
	if err := c.post(ctx, setsQuery, map[string]any{"slug": slug, "perPage": perPage}, &parsed); err != nil {
		return SetsResult{}, err
	}
	if len(parsed.Errors) > 0 {
		return SetsResult{}, fmt.Errorf("startgg: %s", parsed.Errors[0].Message)
	}
	if parsed.Data.Tournament == nil {
		return SetsResult{}, fmt.Errorf("tournament %q not found", slug)
	}
	return flattenSets(parsed), nil
}

func flattenSets(parsed sggResp) SetsResult {
	t := parsed.Data.Tournament
	out := SetsResult{
		Tournament: Tournament{Name: t.Name, Slug: t.Slug},
		Sets:       []Set{},
	}
	for _, ev := range t.Events {
		for _, n := range ev.Sets.Nodes {
			entrants := make([]Entrant, 0, len(n.Slots))
			for _, s := range n.Slots {
				if s.Entrant == nil {
					continue
				}
				players := make([]Player, 0, len(s.Entrant.Participants))
				for _, p := range s.Entrant.Participants {
					if p.Player == nil {
						continue
					}
					players = append(players, Player{
						ID:       p.Player.ID,
						GamerTag: p.Player.GamerTag,
						Prefix:   p.Prefix,
					})
				}
				entrants = append(entrants, Entrant{
					Name:    s.Entrant.Name,
					Players: players,
				})
			}
			if len(entrants) == 0 {
				continue
			}
			out.Sets = append(out.Sets, Set{
				ID:            n.ID.String(),
				FullRoundText: n.FullRoundText,
				EventName:     ev.Name,
				State:         n.State,
				TotalGames:    n.TotalGames,
				Entrants:      entrants,
			})
		}
	}
	return out
}

const tournamentQuery = `
query TournamentInfo($slug: String!) {
  tournament(slug: $slug) { name slug }
}`

// FetchTournament returns just the tournament identity.
func (c *Client) FetchTournament(ctx context.Context, slug string) (Tournament, error) {
	var parsed struct {
		Data struct {
			Tournament *struct {
				Name string `json:"name"`
				Slug string `json:"slug"`
			} `json:"tournament"`
		} `json:"data"`
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}
	if err := c.post(ctx, tournamentQuery, map[string]any{"slug": slug}, &parsed); err != nil {
		return Tournament{}, err
	}
	if len(parsed.Errors) > 0 {
		return Tournament{}, fmt.Errorf("startgg: %s", parsed.Errors[0].Message)
	}
	if parsed.Data.Tournament == nil {
		return Tournament{}, fmt.Errorf("tournament %q not found", slug)
	}
	return Tournament{Name: parsed.Data.Tournament.Name, Slug: parsed.Data.Tournament.Slug}, nil
}
