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
 *         prefix:    string,      // omitted when blank
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
import { SingleLayout } from "./components/single-layout.js";
import { DualLayout } from "./components/dual-layout.js";

const html = htm.bind(h);

function applyAppearance(a) {
  const r = document.documentElement.style;
  if (a.accent) r.setProperty("--accent", a.accent);
  if (a.sidebarBg) r.setProperty("--sidebar-bg", a.sidebarBg);
  if (a.sidebarWidth) r.setProperty("--sidebar-width", a.sidebarWidth + "px");
  if (a.camHeight) r.setProperty("--cam-height", a.camHeight + "px");
  if (a.nameFont) r.setProperty("--name-font", a.nameFont);
  if (a.nameFontSize) r.setProperty("--name-size", a.nameFontSize + "px");
  if (a.roundFontSize) r.setProperty("--round-size", a.roundFontSize + "px");
  if (a.gameAspect) {
    const m = /^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/.exec(a.gameAspect);
    if (m) r.setProperty("--game-aspect", `${m[1]} / ${m[2]}`);
  }
  document.body.dataset.layout = a.layout === "single" ? "single" : "dual";
}

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
  const { scoreEntities = [], setInfo = {}, casters = [] } = state;
  const bestOf = setInfo?.bestOf ?? 3;

  if (appearance.layout === "single") {
    return html`<${SingleLayout}
      scoreEntities=${scoreEntities} setInfo=${setInfo}
      casters=${casters} bestOf=${bestOf} appearance=${appearance}
    />`;
  }

  return html`<${DualLayout}
    scoreEntities=${scoreEntities} setInfo=${setInfo}
    bestOf=${bestOf} appearance=${appearance}
  />`;
}

render(html`<${App} />`, document.getElementById("app"));
