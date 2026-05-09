package main

// Format describes the match composition.
type Format string

const (
	Format1v1 Format = "1v1"
	Format2v2 Format = "2v2"
	FormatFFA Format = "FFA"
)

// BestOf is the win target for a set (first to ceil(N/2)).
type BestOf int

const (
	BestOf3 BestOf = 3
	BestOf5 BestOf = 5
	BestOf7 BestOf = 7
)

// SocialIcon identifies which platform glyph to render next to a handle.
type SocialIcon string

const (
	SocialTwitter   SocialIcon = "twitter"
	SocialBluesky   SocialIcon = "bluesky"
	SocialYouTube   SocialIcon = "youtube"
	SocialTwitch    SocialIcon = "twitch"
	SocialDiscord   SocialIcon = "discord"
	SocialInstagram SocialIcon = "instagram"
	SocialTikTok    SocialIcon = "tiktok"
)

// Social is a single platform handle for a caster.
type Social struct {
	Icon   SocialIcon `json:"icon"`
	Handle string     `json:"handle"`
}

// Caster is a commentator on the broadcast.
type Caster struct {
	Name    string   `json:"name"`
	Socials []Social `json:"socials"`
}

// Player is a single competitor. Character holds the character ID
// within the active game pack (e.g. "captain_falcon"); Costume is the
// 1-based costume index matching the on-disk NN dir, with 0 meaning
// "unset". StartggPlayerID, when non-zero, links this player to a
// stable start.gg user account so future Pull-from-StartGG passes can
// reapply the same preset even if the gamer tag changes.
type Player struct {
	Name            string `json:"name"`
	Pronouns        string `json:"pronouns,omitempty"`
	Team            string `json:"team,omitempty"`
	Character       string `json:"character"`
	Costume         int    `json:"costume"`
	StartggPlayerID int64  `json:"startggPlayerId,omitempty"`
}

// ScoreEntity is one side of the scoreboard: a player (1v1), a team (2v2),
// or a single competitor in a free-for-all.
type ScoreEntity struct {
	Players      []Player `json:"players"`
	CurrentScore int      `json:"currentScore"`
	PortColor    string   `json:"portColor"`
}

// SetInfo is the metadata describing the match being played.
type SetInfo struct {
	TournamentName string `json:"tournamentName"`
	RoundLabel     string `json:"roundLabel"`
	BestOf         BestOf `json:"bestOf"`
	Format         Format `json:"format"`
}

// StreamState is the full payload bound to the UI and written out on Update.
type StreamState struct {
	SetInfo       SetInfo       `json:"setInfo"`
	Casters       []Caster      `json:"casters"`
	ScoreEntities []ScoreEntity `json:"scoreEntities"`
}

// OutputConfig controls where Update sends data. Persisted separately from
// the match state since it's a property of the rig, not the match. Game
// is the ID of a pack discovered under GamesDir; an empty string means
// no pack is selected yet.
type OutputConfig struct {
	OutputDir            string `json:"outputDir"`
	OverlayPath          string `json:"overlayPath"`
	GamesDir             string `json:"gamesDir"`
	Game                 string `json:"game"`
	HTTPPort             int    `json:"httpPort"`
	WriteFieldFiles      bool   `json:"writeFieldFiles"`
	WriteJSON            bool   `json:"writeJson"`
	EnableServer         bool   `json:"enableServer"`
	StartggTournamentURL string `json:"startggTournamentUrl,omitempty"`
}

// PlayerPreset is a reusable, hand-editable record for a competitor.
// Persisted to players.json. Aliases lets one preset match multiple
// gamer tags; StartggPlayerID, when set, takes priority over names
// when matching a player pulled from start.gg.
type PlayerPreset struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Pronouns        string   `json:"pronouns,omitempty"`
	Team            string   `json:"team,omitempty"`
	Aliases         []string `json:"aliases,omitempty"`
	StartggPlayerID int64    `json:"startggPlayerId,omitempty"`
	Character       string   `json:"character,omitempty"`
	Costume         int      `json:"costume,omitempty"`
	PortColor       string   `json:"portColor,omitempty"`
}

// CasterPreset is a reusable record for a commentator. Persisted to
// casters.json.
type CasterPreset struct {
	ID      string   `json:"id"`
	Name    string   `json:"name"`
	Socials []Social `json:"socials"`
}

// Secrets holds credentials we don't want to commit. Persisted to
// streamfighter.secrets.json (gitignored). StartggToken is a personal
// access token from https://start.gg/admin/profile/developer.
type Secrets struct {
	StartggToken string `json:"startggToken,omitempty"`
}
