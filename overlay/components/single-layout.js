import { html, WinPips, FitText, BrandLogo, CasterList, TournamentName, SetInfo, useEntity } from "./shared.js";
import { SponsorRotator } from "./sponsor-rotator.js";

function ScoreRow({ entity, bestOf }) {
  const { name, prefix, pronouns, score, color } = useEntity(entity);
  return html`
    <div class="score-row" style=${{ "--row-color": color }}>
      <div class="score-row-text">
        ${prefix && html`<span class="score-row-prefix">${prefix.toUpperCase()}</span>`}
        <${FitText} text=${name} class="score-row-name" />
        ${pronouns && html`<span class="score-row-pronouns">${pronouns}</span>`}
      </div>
      <${WinPips} score=${score} bestOf=${bestOf} color=${color} />
    </div>
  `;
}

export function SingleLayout({ scoreEntities, setInfo, casters, bestOf, appearance }) {
  return html`
    <div class="app">
      <div class="sidebar">
        <div class="panel-cam">
          <div class="cam-label">CAM</div>
        </div>
        <div class="panel-scoreboard">
          ${appearance.showSetInfo !== false && html`
            <${TournamentName} name=${setInfo?.tournamentName} />
            <div class="panel-set-info">
              ${(setInfo?.roundLabel || "") && html`
                <span class="round-label">${(setInfo.roundLabel || "").toUpperCase()}</span>
              `}
              <span class="best-of">BEST OF ${bestOf}</span>
            </div>
          `}
          ${scoreEntities.map((e, i) => html`<${ScoreRow} key=${i} entity=${e} bestOf=${bestOf} />`)}
        </div>
        <div class="sidebar-spacer"></div>
        <div class="panel-bottom">
          <${CasterList} casters=${casters} />
          <${SponsorRotator} appearance=${appearance} inline=${true} />
          ${appearance.showLogo !== false && html`<${BrandLogo} logoUrl=${appearance.logoUrl || ""} />`}
        </div>
      </div>
      <div class="game-area"></div>
    </div>
  `;
}
