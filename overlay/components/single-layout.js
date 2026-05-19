import { h } from "https://esm.sh/preact@10";
import htm from "https://esm.sh/htm@3";
import { WinPips, FitText, BrandLogo, PLATFORM_LABEL } from "./shared.js";
import { SponsorRotator } from "./sponsor-rotator.js";

const html = htm.bind(h);

function ScoreRow({ entity, bestOf }) {
  const player = entity?.players?.[0];
  const name = (player?.name || "???").toUpperCase();
  const prefix = player?.prefix || "";
  const pronouns = player?.pronouns || "";
  const score = entity?.currentScore ?? 0;
  const color = entity?.portColor ?? "var(--accent)";
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

function CasterList({ casters }) {
  if (!casters || casters.length === 0) return null;
  return html`
    <div class="caster-list">
      ${casters.map((c, i) => {
    const socials = (c.socials || []).filter((s) => s.handle);
    return html`
          <div class="caster-row" key=${i}>
            <span class="caster-name">${c.name}</span>
            ${socials.length > 0 && html`
              <span class="caster-socials">
                ${socials.map((s) => html`
                  <span class="caster-social">
                    <span class="caster-social-platform">${PLATFORM_LABEL[s.icon] || s.icon}</span>
                    <span class="caster-social-handle">${s.handle}</span>
                  </span>
                `)}
              </span>
            `}
          </div>
        `;
  })}
    </div>
  `;
}

export function SingleLayout({ scoreEntities, setInfo, casters, bestOf, appearance }) {
  return html`
    <div class="app app-single">
      <div class="panel panel-left">
        <div class="panel-cam">
          <div class="cam-label">CAM</div>
        </div>
        <div class="panel-scoreboard">
          ${appearance.showSetInfo !== false && html`
            <div class="panel-set-info">
              ${(setInfo?.roundLabel || "") && html`
                <span class="round-label">${(setInfo.roundLabel || "").toUpperCase()}</span>
              `}
              <span class="best-of">BEST OF ${bestOf}</span>
            </div>
          `}
          ${scoreEntities.map((e, i) => html`<${ScoreRow} key=${i} entity=${e} bestOf=${bestOf} />`)}
        </div>
        <${CasterList} casters=${casters} />
        <div class="panel-spacer"></div>
        <div class="panel-bottom">
          <${SponsorRotator} appearance=${appearance} inline=${true} />
          ${appearance.showLogo !== false && html`<${BrandLogo} logoUrl=${appearance.logoUrl || ""} />`}
        </div>
      </div>
      <div class="game-area"></div>
    </div>
  `;
}
