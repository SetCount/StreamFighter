import { h, render } from "https://esm.sh/preact@10";
import { useState, useEffect } from "https://esm.sh/preact@10/hooks";
import htm from "https://esm.sh/htm@3";
import { SponsorRotator } from "./components/sponsor-rotator.js";

const html = htm.bind(h);

function applyAppearance(a) {
  const r = document.documentElement.style;
  if (a.accent) r.setProperty("--accent", a.accent);
  if (a.nameFont) r.setProperty("--name-font", a.nameFont);
  if (a.nameFontSize) r.setProperty("--name-size", a.nameFontSize + "px");
  if (a.roundFontSize) r.setProperty("--round-size", a.roundFontSize + "px");
}

const PLATFORM_LABEL = {
  twitter: "𝕏",
  bluesky: "Bsky",
  twitch: "Twitch",
  discord: "Discord",
};

function ScorePips({ score, bestOf, color }) {
  const needed = Math.ceil(bestOf / 2);
  return html`
    <div class="bg-pips">
      ${Array.from({ length: needed }, (_, i) => html`
        <div
          class=${"bg-pip" + (i < score ? " filled" : "")}
          style=${{ "--pip-color": color }}
        ></div>
      `)}
    </div>
  `;
}

function TopBar({ setInfo, scoreEntities }) {
  const { tournamentName = "", roundLabel = "", bestOf = 3 } = setInfo || {};
  const [left, right] = scoreEntities || [];

  const leftName = left?.players?.[0]?.name || "???";
  const rightName = right?.players?.[0]?.name || "???";
  const leftScore = left?.currentScore ?? 0;
  const rightScore = right?.currentScore ?? 0;
  const leftColor = left?.portColor || "var(--accent)";
  const rightColor = right?.portColor || "var(--accent)";

  return html`
    <div class="bg-topbar">
      <div class="bg-tournament">
        ${tournamentName && html`<span class="bg-tournament-name">${tournamentName}</span>`}
        ${roundLabel && html`<span class="bg-round">${roundLabel.toUpperCase()}</span>`}
      </div>
      <div class="bg-matchup">
        <span class="bg-player-name">${leftName}</span>
        <${ScorePips} score=${leftScore} bestOf=${bestOf} color=${leftColor} />
        <span class="bg-vs">VS</span>
        <${ScorePips} score=${rightScore} bestOf=${bestOf} color=${rightColor} />
        <span class="bg-player-name">${rightName}</span>
      </div>
    </div>
  `;
}

function CasterBanner({ caster }) {
  const socials = (caster.socials || []).filter((s) => s.handle);
  return html`
    <div class="bg-caster-banner">
      <div class="bg-caster-name">${caster.name}</div>
      ${socials.length > 0 && html`
        <div class="bg-caster-socials">
          ${socials.map((s) => html`
            <span class="bg-caster-social">
              <span class="bg-social-platform">${PLATFORM_LABEL[s.icon] || s.icon}</span>
              <span class="bg-social-handle">${s.handle}</span>
            </span>
          `)}
        </div>
      `}
    </div>
  `;
}

function App() {
  const [state, setState] = useState(null);
  const [appearance, setAppearance] = useState({});

  useEffect(() => {
    fetch("/overlay/appearance.json")
      .then((r) => r.json())
      .then((a) => { applyAppearance(a); setAppearance(a); })
      .catch(() => { });

    fetch("/state.json").then((r) => r.json()).then(setState).catch(() => { });
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

  if (!state) return null;
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
