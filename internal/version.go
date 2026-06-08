package internal

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Version is the current version of StreamFighter (injected by ldflags at build time).
var Version = "0.0.0-dev"

const githubRepoOwner = "SetCount"
const githubRepoName = "StreamFighter"

// GitHubRelease is a minimal representation of a GitHub release.
type GitHubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

// UpdateInfo is the result of checking GitHub for a newer release.
type UpdateInfo struct {
	Current  string `json:"current"`
	Latest   string `json:"latest"`
	URL      string `json:"url"`
	Outdated bool   `json:"outdated"`
}

// GetVersion exposes the current built-in version to the frontend.
func (a *App) GetVersion() string {
	return Version
}

// CheckUpdate queries GitHub for the latest StreamFighter release and compares it
// to the built-in version. The frontend calls this on startup and on demand.
func (a *App) CheckUpdate() UpdateInfo {
	latest, err := fetchLatestRelease()
	if err != nil {
		println("CheckUpdate:", err.Error())
		return UpdateInfo{Current: Version, Outdated: false}
	}
	outdated := latest.TagName != "" && latest.TagName != Version
	return UpdateInfo{
		Current:  Version,
		Latest:   latest.TagName,
		URL:      latest.HTMLURL,
		Outdated: outdated,
	}
}

func fetchLatestRelease() (GitHubRelease, error) {
	url := "https://api.github.com/repos/" + githubRepoOwner + "/" + githubRepoName + "/releases/latest"
	cli := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return GitHubRelease{}, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("User-Agent", "StreamFighter")
	req.Header.Set("Accept", "application/vnd.github+json")
	resp, err := cli.Do(req)
	if err != nil {
		return GitHubRelease{}, fmt.Errorf("fetch latest release: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return GitHubRelease{}, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	var rel GitHubRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return GitHubRelease{}, fmt.Errorf("decode release json: %w", err)
	}
	return rel, nil
}
