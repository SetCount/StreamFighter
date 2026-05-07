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

// Player is a single competitor.
type Player struct {
	Name           string `json:"name"`
	Character      string `json:"character"`
	CharacterColor string `json:"characterColor"`
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
// the match state since it's a property of the rig, not the match.
type OutputConfig struct {
	OutputDir       string `json:"outputDir"`
	OverlayPath     string `json:"overlayPath"`
	HTTPPort        int    `json:"httpPort"`
	WriteFieldFiles bool   `json:"writeFieldFiles"`
	WriteJSON       bool   `json:"writeJson"`
	EnableServer    bool   `json:"enableServer"`
}
