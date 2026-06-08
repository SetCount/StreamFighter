import { render } from "https://esm.sh/preact@10";
import { html, useStreamState, WinPips, Icon } from "./components/shared.js";
import { SponsorRotator } from "./components/sponsor-rotator.js";

function TopBar({ setInfo, scoreEntities }) {
  const { tournamentName = "", roundLabel = "", bestOf = 3 } = setInfo || {};
  const [left, right] = scoreEntities || [];

  const leftName = left?.players?.[0]?.name || "???";
  const rightName = right?.players?.[0]?.name || "???";
  const leftPrefix = left?.players?.[0]?.prefix || "";
  const rightPrefix = right?.players?.[0]?.prefix || "";
  const leftScore = left?.currentScore ?? 0;
  const rightScore = right?.currentScore ?? 0;
  const leftColor = left?.portColor || "var(--accent)";
  const rightColor = right?.portColor || "var(--accent)";

  return html`
    <div class="bg-topbar">
      <div class="bg-tournament">
        ${tournamentName &&
        html`<span class="bg-tournament-name">${tournamentName}</span>`}
        ${roundLabel &&
        html`<span class="bg-round">${roundLabel.toUpperCase()}</span>`}
      </div>
      <div class="bg-matchup">
        <div class="bg-player">
          ${leftPrefix &&
          html`<span class="bg-player-prefix">${leftPrefix}</span>`}
          <span class="bg-player-name">${leftName}</span>
        </div>
        <${WinPips} score=${leftScore} bestOf=${bestOf} color=${leftColor} />
        <span class="bg-vs">VS</span>
        <${WinPips} score=${rightScore} bestOf=${bestOf} color=${rightColor} />
        <div class="bg-player">
          ${rightPrefix &&
          html`<span class="bg-player-prefix">${rightPrefix}</span>`}
          <span class="bg-player-name">${rightName}</span>
        </div>
      </div>
    </div>
  `;
}

function CasterBanner({ caster }) {
  const socials = (caster.socials || []).filter((s) => s.handle);
  const pronouns = caster.pronouns || "";
  return html`
    <div class="bg-caster-banner">
      <div class="caster-name">${caster.name}</div>
      ${pronouns && html`<div class="caster-pronouns">${pronouns}</div>`}
      ${socials.length > 0 &&
      html`
        <div class="caster-socials">
          ${socials.map(
            (s) => html`
              <span class="caster-social">
                <${Icon} name=${s.icon} class="caster-social-icon" />
                <span class="caster-social-handle">${s.handle}</span>
              </span>
            `,
          )}
        </div>
      `}
    </div>
  `;
}

function App() {
  const { state, appearance } = useStreamState();

  if (!state || !appearance) return null;
  const { scoreEntities = [], setInfo = {}, casters = [] } = state;

  return html`
    <div class="bg-app">
      <${TopBar} setInfo=${setInfo} scoreEntities=${scoreEntities} />
      <div class="bg-cam-area">
        <span class="bg-cam-label">CAM</span>
      </div>
      <div class="bg-caster-row">
        ${casters.map((c, i) => html`<${CasterBanner} key=${i} caster=${c} />`)}
      </div>
      <${SponsorRotator} appearance=${appearance} />
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
