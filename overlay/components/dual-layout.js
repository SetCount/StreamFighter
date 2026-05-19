import { h } from "https://esm.sh/preact@10";
import htm from "https://esm.sh/htm@3";
import { WinPips, FitText, BrandLogo, CasterList } from "./shared.js";
import { SponsorRotator } from "./sponsor-rotator.js";

const html = htm.bind(h);

function PlayerPanel({ entity, bestOf }) {
  const player = entity?.players?.[0];
  const name = (player?.name || "???").toUpperCase();
  const prefix = player?.prefix || "";
  const pronouns = player?.pronouns || "";
  const score = entity?.currentScore ?? 0;
  const color = entity?.portColor ?? "var(--accent)";

  return html`
    <div class="player-panel">
      <div class="cam-area">
        <div class="cam-label">CAM</div>
      </div>
      <div class="name-strip">
        ${prefix && html`<div class="player-prefix">${prefix.toUpperCase()}</div>`}
        <${FitText} text=${name} class="player-name" />
        ${pronouns && html`<div class="player-pronouns">${pronouns}</div>`}
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

export function DualLayout({ scoreEntities, setInfo, casters, bestOf, appearance }) {
  const [left, right] = scoreEntities;

  return html`
    <div class="app">
      <div class="sidebar sidebar-left">
        <${PlayerPanel} entity=${left} bestOf=${bestOf} />
        <div class="sidebar-spacer"></div>
        <div class="sidebar-bottom">
          <${CasterList} casters=${casters} />
          ${appearance.showSetInfo !== false && html`<${SetInfo} setInfo=${setInfo} />`}
        </div>
      </div>

      <div class="game-area"></div>

      <div class="sidebar sidebar-right">
        <${PlayerPanel} entity=${right} bestOf=${bestOf} />
        <div class="sidebar-spacer"></div>
        <div class="sidebar-bottom">
          <${SponsorRotator} appearance=${appearance} inline=${true} />
          ${appearance.showLogo !== false && html`<${BrandLogo} logoUrl=${appearance.logoUrl || ""} />`}
        </div>
      </div>
    </div>
  `;
}
