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
 *       name:     string,
 *       pronouns: string,      // omitted when blank
 *       socials: Array<{
 *         icon:   "twitter" | "bluesky" | "twitch" | "discord",
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

import { render } from "https://esm.sh/preact@10";
import { html, useStreamState } from "./components/shared.js";
import { SingleLayout } from "./components/single-layout.js";
import { DualLayout } from "./components/dual-layout.js";
import { WidescreenLayout } from "./components/widescreen-layout.js";

function App() {
  const { state, appearance } = useStreamState();

  if (!state || !appearance) return null;
  const { scoreEntities = [], setInfo = {}, casters = [] } = state;
  const bestOf = setInfo?.bestOf ?? 3;

  if (appearance.layout === "widescreen") {
    return html`<${WidescreenLayout}
      scoreEntities=${scoreEntities} setInfo=${setInfo}
      casters=${casters} bestOf=${bestOf} appearance=${appearance}
    />`;
  }

  if (appearance.layout === "single") {
    return html`<${SingleLayout}
      scoreEntities=${scoreEntities} setInfo=${setInfo}
      casters=${casters} bestOf=${bestOf} appearance=${appearance}
    />`;
  }

  return html`<${DualLayout}
    scoreEntities=${scoreEntities} setInfo=${setInfo} casters=${casters}
    bestOf=${bestOf} appearance=${appearance}
  />`;
}

render(html`<${App} />`, document.getElementById("app"));
