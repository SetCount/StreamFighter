package internal

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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
	outdated := latest.TagName != "" && compareVersions(latest.TagName, Version) > 0
	return UpdateInfo{
		Current:  Version,
		Latest:   latest.TagName,
		URL:      latest.HTMLURL,
		Outdated: outdated,
	}
}

// compareVersions reports whether version a is newer (1), the same (0), or
// older (-1) than version b. It understands the `git describe` format that dev
// builds carry (e.g. "v1.1.0-8-gf105123"), so a build 8 commits past a tag is
// correctly treated as newer than the bare release of that tag.
func compareVersions(a, b string) int {
	aCore, aAhead := parseVersion(a)
	bCore, bAhead := parseVersion(b)
	for i := 0; i < 3; i++ {
		if aCore[i] != bCore[i] {
			if aCore[i] > bCore[i] {
				return 1
			}
			return -1
		}
	}
	// Same MAJOR.MINOR.PATCH — whichever has more commits past the tag is newer.
	switch {
	case aAhead > bAhead:
		return 1
	case aAhead < bAhead:
		return -1
	default:
		return 0
	}
}

// parseVersion splits a version string into its [major, minor, patch] core and
// the number of commits past the tag (the "-N-gHASH" git-describe suffix, 0 if
// absent). Unparseable segments fall back to 0.
func parseVersion(v string) (core [3]int, ahead int) {
	v = strings.TrimPrefix(strings.TrimSpace(v), "v")
	// Strip a trailing git-describe suffix: "1.1.0-8-gf105123" -> core "1.1.0",
	// ahead 8. A bare prerelease ("-rc1") leaves ahead at 0.
	if dash := strings.Index(v, "-"); dash >= 0 {
		rest := v[dash+1:]
		v = v[:dash]
		if commits := strings.SplitN(rest, "-", 2)[0]; commits != "" {
			if n, err := strconv.Atoi(commits); err == nil {
				ahead = n
			}
		}
	}
	for i, part := range strings.SplitN(v, ".", 3) {
		if i > 2 {
			break
		}
		n, _ := strconv.Atoi(part)
		core[i] = n
	}
	return core, ahead
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
