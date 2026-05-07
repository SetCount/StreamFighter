package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
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
	hub             *sseHub
	srv             *http.Server
	getState        func() StreamState
	getOverlayPath  func() string
}

func newOverlayServer(port int, getOverlayPath func() string, getState func() StreamState) *overlayServer {
	o := &overlayServer{
		hub:            newSSEHub(),
		getState:       getState,
		getOverlayPath: getOverlayPath,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/overlay", o.handleOverlay)
	mux.HandleFunc("/state.json", o.handleState)
	mux.HandleFunc("/events", o.handleEvents)
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

func (o *overlayServer) handleOverlay(w http.ResponseWriter, _ *http.Request) {
	path := o.getOverlayPath()
	body, err := os.ReadFile(path)
	if err != nil {
		http.Error(w, fmt.Sprintf("overlay file %q: %v", path, err), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	_, _ = w.Write(body)
}

func (o *overlayServer) handleState(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	s := o.getState()
	if err := writeJSON(w, s); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
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

	// Send the current state immediately so a freshly-connected overlay
	// renders without waiting for the next Update.
	if msg, err := marshalJSON(o.getState()); err == nil {
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
