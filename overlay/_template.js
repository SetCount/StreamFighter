/*
 * StreamFighter — Minimal Custom Overlay Template
 * =================================================
 * Copy _template.html + _template.js, rename them, and edit to taste.
 * Register your new HTML in OBS as a browser source pointed at the
 * server (default http://localhost:35920/overlay/_template.html —
 * rename to match your filename).
 *
 * DATA
 * ----
 * useStreamState() connects to the server and returns:
 *   { state, appearance }
 *
 * `state` is a StreamState object (players, scores, casters, set info).
 * `appearance` has theming (accent color, fonts, sizes) plus `gameId`
 * so you can build character art URLs dynamically:
 *   `/games/${appearance.gameId}/characters/${charId}/portrait_01.png`
 *
 * SHARED COMPONENTS (from components/shared.js)
 * ------
 *   useStreamState()  — SSE hook, returns { state, appearance }
 *   useEntity(entity) — extract name/prefix/pronouns/score/color
 *   WinPips           — score pips: <WinPips score=2 bestOf=5 color="#c96a6a" />
 *   FitText           — auto-shrinking text: <FitText text="MANG0" class="name" />
 *   SetInfo           — round label + best-of: <SetInfo setInfo=${setInfo} />
 *   CasterList        — full caster block with socials
 *   TournamentName    — tournament name display
 *   BrandLogo         — logo with fallback SVG
 *   Icon              — social platform SVG icons
 *
 * See the full StreamState shape documented at the top of app.js.
 */

import { render } from "https://esm.sh/preact@10";
import {
  html,
  useStreamState,
  useEntity,
  WinPips,
  FitText,
  SetInfo,
  CasterList,
  TournamentName,
} from "./components/shared.js";

function PlayerRow({ entity, bestOf }) {
  const { name, prefix, pronouns, score, color } = useEntity(entity);
  return html`
    <div style="margin: 12px 0;">
      ${prefix &&
      html`<div style="font-size: 14px; color: var(--accent);">${prefix}</div>`}
      <${FitText} text=${name} class="tournament-name" />
      ${pronouns &&
      html`<div style="font-size: 12px; color: #999;">${pronouns}</div>`}
      <${WinPips} score=${score} bestOf=${bestOf} color=${color} />
    </div>
  `;
}

function App() {
  const { state, appearance } = useStreamState();

  if (!state || !appearance) return null;
  const { scoreEntities = [], setInfo = {}, casters = [] } = state;
  const bestOf = setInfo?.bestOf ?? 3;

  return html`
    <div style="padding: 24px;">
      <${TournamentName} name=${setInfo?.tournamentName} />
      <${SetInfo} setInfo=${setInfo} />

      ${scoreEntities.map(
        (e, i) => html`
          <${PlayerRow} key=${i} entity=${e} bestOf=${bestOf} />
        `,
      )}

      <${CasterList} casters=${casters} />
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
