import { html, WinPips, FitText, SetInfo, useEntity } from "./shared.js";

function PlayerStrip({ entity, bestOf, side }) {
  const { name, prefix, score, color } = useEntity(entity);
  return html`
    <div class="ws-player ws-${side}">
      <div class="ws-name-block">
        ${prefix &&
        html`<span class="ws-prefix">${prefix.toUpperCase()}</span>`}
        <${FitText} text=${name} class="ws-name" />
      </div>
      <${WinPips} score=${score} bestOf=${bestOf} color=${color} />
    </div>
  `;
}

export function WidescreenLayout({ scoreEntities, setInfo, bestOf }) {
  const [left, right] = scoreEntities;
  return html`
    <div class="ws-app">
      <div class="ws-bottom-bar">
        <${PlayerStrip} entity=${left} bestOf=${bestOf} side="left" />
        <div class="ws-center">
          <${SetInfo} setInfo=${setInfo} />
        </div>
        <${PlayerStrip} entity=${right} bestOf=${bestOf} side="right" />
      </div>
    </div>
  `;
}
