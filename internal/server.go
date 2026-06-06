package internal

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// sseHub fans broadcast messages out to every connected SSE client.
type sseHub struct {
	mu      sync.Mutex
	clients map[chan []byte]struct{}
}

func newSSEHub() *sseHub {
	return &sseHub{clients: map[chan []byte]struct{}{}}
}

func (h *sseHub) add() chan []byte {
	ch := make(chan []byte, 8)
	h.mu.Lock()
	h.clients[ch] = struct{}{}
	h.mu.Unlock()
	return ch
}

func (h *sseHub) remove(ch chan []byte) {
	h.mu.Lock()
	if _, ok := h.clients[ch]; ok {
		delete(h.clients, ch)
		close(ch)
	}
	h.mu.Unlock()
}

func (h *sseHub) broadcast(msg []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.clients {
		select {
		case ch <- msg:
		default:
			// Slow client: drop the update rather than block the broadcast.
		}
	}
}

// overlayServer wraps the SSE hub with the HTTP routes the OBS browser
// source connects to.
type overlayServer struct {
	hub            *sseHub
	srv            *http.Server
	getState       func() StreamState
	getOverlayPath func() string
	getGamesDir    func() string
	getSponsorsDir func() string
	getAppearance  func() OverlayAppearance
}

func newOverlayServer(
	port int,
	getOverlayPath, getGamesDir, getSponsorsDir func() string,
	getState func() StreamState,
	getAppearance func() OverlayAppearance,
) *overlayServer {
	o := &overlayServer{
		hub:            newSSEHub(),
		getState:       getState,
		getOverlayPath: getOverlayPath,
		getGamesDir:    getGamesDir,
		getSponsorsDir: getSponsorsDir,
		getAppearance:  getAppearance,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/game", o.handleOverlay)
	mux.HandleFunc("/between", o.handleBetween)
	mux.Handle("/overlay/", o.handleOverlayAssets())
	mux.HandleFunc("/state.json", o.handleState)
	mux.HandleFunc("/overlay/appearance.json", o.handleAppearance)
	mux.HandleFunc("/events", o.handleEvents)
	mux.Handle("/games/", http.StripPrefix("/games/", o.handleGameAsset()))
	mux.HandleFunc("/sponsors.json", o.handleSponsorsList)
	mux.Handle("/sponsors/", http.StripPrefix("/sponsors/", o.handleSponsorAsset()))
	o.srv = &http.Server{
		Addr:              fmt.Sprintf(":%d", port),
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	return o
}

func (o *overlayServer) start() {
	go func() {
		if err := o.srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Println("overlay server error:", err)
		}
	}()
}

func (o *overlayServer) shutdown(ctx context.Context) error {
	return o.srv.Shutdown(ctx)
}

func serveHTMLFile(w http.ResponseWriter, path string) {
	body, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, fmt.Sprintf("overlay file %q: %v", path, err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(body)
}

func (o *overlayServer) handleOverlay(w http.ResponseWriter, _ *http.Request) {
	serveHTMLFile(w, o.getOverlayPath())
}

func (o *overlayServer) handleBetween(w http.ResponseWriter, _ *http.Request) {
	overlayPath := o.getOverlayPath()
	if overlayPath == "" {
		http.Error(w, "overlay path not configured", http.StatusInternalServerError)
		return
	}
	serveHTMLFile(w, filepath.Join(filepath.Dir(overlayPath), "between.html"))
}

// handleOverlayAssets serves the CSS, JS, and any other files in the
// same directory as OverlayPath so relative imports from index.html work.
func (o *overlayServer) handleOverlayAssets() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := o.getOverlayPath()
		if path == "" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		http.StripPrefix("/overlay/", http.FileServer(http.Dir(filepath.Dir(path)))).ServeHTTP(w, r)
	})
}

func (o *overlayServer) handleState(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	s := o.getState()
	if err := json.NewEncoder(w).Encode(s); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

func (o *overlayServer) handleAppearance(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	a := o.getAppearance()
	if err := json.NewEncoder(w).Encode(a); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

// handleGameAsset serves files under the configured games directory so
// both the Wails frontend and the OBS browser source can <img>-load
// character art without going through the bindings.
func (o *overlayServer) handleGameAsset() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dir := o.getGamesDir()
		if dir == "" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		http.FileServer(http.Dir(dir)).ServeHTTP(w, r)
	})
}

// handleSponsorsList returns a JSON array of image filenames in SponsorsDir.
// Re-reads the directory on every request so adding/removing files takes
// effect on the next rotation cycle without a restart.
func (o *overlayServer) handleSponsorsList(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	dir := o.getSponsorsDir()
	if dir == "" {
		_ = json.NewEncoder(w).Encode([]string{})
		return
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		_ = json.NewEncoder(w).Encode([]string{})
		return
	}
	files := []string{}
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		switch strings.ToLower(filepath.Ext(e.Name())) {
		case ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg":
			files = append(files, e.Name())
		}
	}
	_ = json.NewEncoder(w).Encode(files)
}

// handleSponsorAsset serves image files from SponsorsDir.
func (o *overlayServer) handleSponsorAsset() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		dir := o.getSponsorsDir()
		if dir == "" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Access-Control-Allow-Origin", "*")
		http.FileServer(http.Dir(dir)).ServeHTTP(w, r)
	})
}

func (o *overlayServer) handleEvents(w http.ResponseWriter, r *http.Request) {
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Connection", "keep-alive")

	ch := o.hub.add()
	defer o.hub.remove(ch)

	// Send the current state and appearance immediately so a freshly-connected
	// overlay renders without waiting for the next Update.
	if msg, err := json.Marshal(OverlayMessage{State: o.getState(), Appearance: o.getAppearance()}); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", msg)
		flusher.Flush()
	}

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-r.Context().Done():
			return
		}
	}
}
