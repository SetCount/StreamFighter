/*
 * StreamFighter Overlay API reference
 * =====================================
 * Connect to the StreamFighter server (default http://localhost:35920) with:
 *
 *   fetch('/state.json')          — one-shot snapshot for first paint
 *   new EventSource('/events')    — SSE stream; each message is the full state
 *
 * Both deliver a StreamState object:
 *
 *   {
 *     setInfo: {
 *       tournamentName: string,
 *       roundLabel:     string,
 *       bestOf:         3 | 5 | 7,
 *       format:         "1v1" | "2v2" | "FFA",
 *     },
 *
 *     casters: Array<{
 *       name:    string,
 *       socials: Array<{
 *         icon:   "twitter" | "bluesky" | "twitch",
 *         handle: string,
 *       }>,
 *     }>,
 *
 *     scoreEntities: Array<{      // length 2 for 1v1/2v2, variable for FFA
 *       players: Array<{          // length 1 for 1v1/FFA, 2 for 2v2
 *         name:      string,
 *         pronouns:  string,      // omitted when blank
 *         team:      string,      // omitted when blank
 *         character: string,      // game-pack ID, e.g. "captain_falcon"
 *                                 // NOT the display name — that's only in .txt files
 *         costume:   number,      // 1-based; 0 = unset
 *       }>,
 *       currentScore: number,
 *       portColor:    string,     // CSS color string, e.g. "#c96a6a"
 *     }>,
 *   }
 *
 * Character art
 * -------------
 * Served at /games/<gameId>/characters/<charId>/:
 *   select.png        — character select portrait
 *   portrait_NN.png   — full portrait for costume NN (zero-padded, e.g. "01")
 *   stock_NN.png      — stock icon for costume NN
 *
 * gameId is not included in the state payload — hard-code it in your overlay
 * (e.g. const GAME = "melee") to compose asset URLs.
 */

import { h, render } from "https://esm.sh/preact@10";
import { useState, useEffect } from "https://esm.sh/preact@10/hooks";
import htm from "https://esm.sh/htm@3";

const html = htm.bind(h);

function applyAppearance(a) {
  const r = document.documentElement.style;
  if (a.accent)        r.setProperty("--accent",        a.accent);
  if (a.sidebarBg)     r.setProperty("--sidebar-bg",    a.sidebarBg);
  if (a.sidebarWidth)  r.setProperty("--sidebar-width", a.sidebarWidth + "px");
  if (a.camHeight)     r.setProperty("--cam-height",    a.camHeight + "px");
  if (a.nameFont)      r.setProperty("--name-font",     a.nameFont);
  if (a.nameFontSize)  r.setProperty("--name-size",     a.nameFontSize + "px");
  if (a.roundFontSize) r.setProperty("--round-size",    a.roundFontSize + "px");
}

// ── Overlay components ────────────────────────────────────────────────────────

function WinPips({ score, bestOf, color }) {
  const needed = Math.ceil(bestOf / 2);
  return html`
    <div class="win-pips">
      ${Array.from({ length: needed }, (_, i) => html`
        <div
          class=${"win-pip" + (i < score ? " filled" : "")}
          style=${{ "--pip-color": color }}
        ></div>
      `)}
    </div>
  `;
}

function PlayerPanel({ entity, bestOf }) {
  const player = entity?.players?.[0];
  const name = (player?.name || "???").toUpperCase();
  const score = entity?.currentScore ?? 0;
  const color = entity?.portColor ?? "var(--accent)";

  return html`
    <div class="player-panel">
      <div class="cam-area">
        <div class="cam-label">CAM</div>
      </div>
      <div class="name-strip">
        <span class="player-name">${name}</span>
      </div>
      <div class="score-strip">
        <${WinPips} score=${score} bestOf=${bestOf} color=${color} />
      </div>
    </div>
  `;
}

function SetInfo({ setInfo }) {
  const round = (setInfo?.roundLabel || "").toUpperCase();
  const bestOf = setInfo?.bestOf ?? 3;
  return html`
    <div class="set-info">
      ${round && html`<div class="round-label">${round}</div>`}
      <div class="best-of">BEST OF ${bestOf}</div>
    </div>
  `;
}

function BrandLogo({ logoUrl }) {
  if (logoUrl) {
    return html`
      <div class="brand-logo">
        <img src=${logoUrl} alt="Logo" />
      </div>
    `;
  }
  return html`
    <div class="brand-logo">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" stroke-width="5" />
        <rect x="22" y="30" width="56" height="8" rx="2" fill="var(--accent)" />
        <rect x="22" y="30" width="8" height="32" rx="2" fill="var(--accent)" />
        <rect x="22" y="46" width="36" height="8" rx="2" fill="var(--accent)" />
        <rect x="52" y="46" width="8" height="24" rx="2" fill="var(--accent)" />
      </svg>
    </div>
  `;
}

// ── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [state, setState] = useState(null);
  const [appearance, setAppearance] = useState(null);

  useEffect(() => {
    fetch("/overlay/appearance.json")
      .then((r) => r.json())
      .then((a) => { applyAppearance(a); setAppearance(a); })
      .catch(() => { setAppearance({}); });

    fetch("/state.json")
      .then((r) => r.json())
      .then(setState)
      .catch(() => { });

    const es = new EventSource("/events");
    es.onmessage = (ev) => {
      try {
        const { state, appearance } = JSON.parse(ev.data);
        setState(state);
        applyAppearance(appearance);
        setAppearance(appearance);
      } catch { }
    };
    return () => es.close();
  }, []);

  if (!state || !appearance) return null;
  const { scoreEntities = [], setInfo = {} } = state;
  const bestOf = setInfo?.bestOf ?? 3;
  const [left, right] = scoreEntities;

  return html`
    <div class="app">
      <div class="sidebar sidebar-left">
        <${PlayerPanel} entity=${left} bestOf=${bestOf} />
        <div class="sidebar-spacer"></div>
        <div class="sidebar-bottom">
          ${appearance.showSetInfo !== false && html`<${SetInfo} setInfo=${setInfo} />`}
        </div>
      </div>

      <div class="game-area"></div>

      <div class="sidebar sidebar-right">
        <${PlayerPanel} entity=${right} bestOf=${bestOf} />
        <div class="sidebar-spacer"></div>
        <div class="sidebar-bottom">
          ${appearance.showLogo !== false && html`<${BrandLogo} logoUrl=${appearance.logoUrl || ""} />`}
        </div>
      </div>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
