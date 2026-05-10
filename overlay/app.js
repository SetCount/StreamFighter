import { h, render } from "https://esm.sh/preact@10";
import { useState, useEffect } from "https://esm.sh/preact@10/hooks";
import htm from "https://esm.sh/htm@3";

const html = htm.bind(h);

function Entity({ entity }) {
  const { players = [], currentScore = 0, portColor = "#888" } = entity;
  const names = players.map((p) => p.name || "???").join(" / ");
  const chars = players
    .map((p) => p.character)
    .filter(Boolean)
    .join(" / ");
  return html`
    <div
      class="entity"
      style=${{
        borderLeft: `4px solid ${portColor}`,
        paddingLeft: "8px",
      }}
    >
      <div class="players">${names}</div>
      <div class="score">${currentScore}</div>
      <div style=${{ fontSize: "12px", opacity: 0.7 }}>${chars}</div>
    </div>
  `;
}

function Casters({ casters }) {
  if (!casters.length) return null;
  const text = casters
    .map(
      (c) =>
        c.name +
        (c.socials?.length
          ? " (" + c.socials.map((s) => s.handle).join(", ") + ")"
          : ""),
    )
    .join(" | ");
  return html`<div class="casters">${text}</div>`;
}

function App() {
  const [state, setState] = useState(null);

  useEffect(() => {
    fetch("/state.json")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});
    const es = new EventSource("/events");
    es.onmessage = (ev) => {
      try {
        setState(JSON.parse(ev.data));
      } catch {}
    };
    return () => es.close();
  }, []);

  if (!state) return null;
  const { scoreEntities = [], setInfo = {}, casters = [] } = state;

  return html`
    <div>
      <div class="scoreboard">
        ${scoreEntities.map(
          (e, i) => html`<${Entity} key=${i} entity=${e} />`,
        )}
        <div class="meta">
          <div>${setInfo.tournamentName}</div>
          <div>${setInfo.roundLabel} - Bo${setInfo.bestOf}</div>
        </div>
      </div>
      <${Casters} casters=${casters} />
    </div>
  `;
}

render(html`<${App} />`, document.getElementById("app"));
