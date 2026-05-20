import { html, WinPips, FitText, BrandLogo, CasterList, TournamentName, SetInfo, useEntity } from "./shared.js";
import { SponsorRotator } from "./sponsor-rotator.js";

function PlayerPanel({ entity, bestOf }) {
  const { name, prefix, pronouns, score, color } = useEntity(entity);

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
          <${TournamentName} name=${setInfo?.tournamentName} />
        </div>
      </div>
    </div>
  `;
}
