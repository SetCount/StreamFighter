import { h } from "https://esm.sh/preact@10";
import { useRef, useLayoutEffect } from "https://esm.sh/preact@10/hooks";
import htm from "https://esm.sh/htm@3";

const html = htm.bind(h);

export const PLATFORM_LABEL = {
  twitter: "𝕏",
  bluesky: "Bsky",
  twitch: "Twitch",
};

export function WinPips({ score, bestOf, color }) {
  const needed = Math.ceil(bestOf / 2);
  return html`
    <div class="win-pips">
      ${Array.from({ length: needed }, (_, i) => html`
        <div
          class=${"win-pip" + (i < score ? " filled" : "")}
          style=${{ "--pip-color": color }}
        ></div>
      `)}
    </div>
  `;
}

export function FitText(props) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.fontSize = '';
    const max = parseFloat(getComputedStyle(el).fontSize);
    if (!max || max < 1) return;
    let size = max;
    while (el.scrollWidth > el.clientWidth && size > max * 0.5) {
      size -= 0.5;
      el.style.fontSize = size + 'px';
    }
  });
  return html`<div ref=${ref} class=${props.class}>${props.text}</div>`;
}

export function BrandLogo({ logoUrl }) {
  if (logoUrl) {
    return html`
      <div class="brand-logo">
        <img src=${logoUrl} alt="Logo" />
      </div>
    `;
  }
  return html`
    <div class="brand-logo">
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="44" fill="none" stroke="var(--accent)" stroke-width="5" />
        <rect x="22" y="30" width="56" height="8" rx="2" fill="var(--accent)" />
        <rect x="22" y="30" width="8" height="32" rx="2" fill="var(--accent)" />
        <rect x="22" y="46" width="36" height="8" rx="2" fill="var(--accent)" />
        <rect x="52" y="46" width="8" height="24" rx="2" fill="var(--accent)" />
      </svg>
    </div>
  `;
}
