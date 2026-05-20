import { h } from "https://esm.sh/preact@10";
import { useRef, useState, useEffect, useLayoutEffect } from "https://esm.sh/preact@10/hooks";
import htm from "https://esm.sh/htm@3";

export const html = htm.bind(h);

export const ICONS = {
  twitter:  { viewBox: "0 0 24 24", d: ['M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'] },
  bluesky:  { viewBox: "0 0 24 24", d: ['M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364-3.911.58-7.386 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8Z'] },
  twitch:   { viewBox: "0 0 24 24", d: ['M11.571 4.714h1.715v5.143h-1.715zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z'] },
  discord:  { viewBox: "0 0 24 24", d: ['M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z'] },
  copy:     { viewBox: "0 0 16 16", d: ['M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25z', 'M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25z'] },
  open:     { viewBox: "0 0 16 16", d: ['M3.75 2h3.5a.75.75 0 010 1.5h-3.5a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-3.5a.75.75 0 011.5 0v3.5A1.75 1.75 0 0112.25 14h-8.5A1.75 1.75 0 012 12.25v-8.5C2 2.784 2.784 2 3.75 2zm6.5-1h4a.75.75 0 01.75.75v4a.75.75 0 01-1.5 0V2.56L8.28 7.78a.75.75 0 01-1.06-1.06l5.22-5.22h-3.19a.75.75 0 010-1.5z'] },
  swap:     { viewBox: "0 0 24 24", d: ['M6.99 11L3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z'] },
};

export function applyAppearance(a) {
  const r = document.documentElement.style;
  if (a.accent) r.setProperty("--accent", a.accent);
  if (a.sidebarBg) r.setProperty("--sidebar-bg", a.sidebarBg);
  if (a.sidebarWidth) r.setProperty("--sidebar-width", a.sidebarWidth + "px");
  if (a.camHeight) r.setProperty("--cam-height", a.camHeight + "px");
  if (a.nameFont) r.setProperty("--name-font", a.nameFont);
  if (a.nameFontSize) r.setProperty("--name-size", a.nameFontSize + "px");
  if (a.roundFontSize) r.setProperty("--round-size", a.roundFontSize + "px");
  if (a.gameAspect) {
    const m = /^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/.exec(a.gameAspect);
    if (m) r.setProperty("--game-aspect", `${m[1]} / ${m[2]}`);
  }
  document.body.dataset.layout = a.layout === "single" ? "single" : "dual";
}

export function useStreamState() {
  const [state, setState] = useState(null);
  const [appearance, setAppearance] = useState(null);

  useEffect(() => {
    fetch("/overlay/appearance.json")
      .then((r) => r.json())
      .then((a) => { applyAppearance(a); setAppearance(a); })
      .catch(() => { setAppearance({}); });

    fetch("/state.json")
      .then((r) => r.json())
      .then(setState)
      .catch(() => {});

    const es = new EventSource("/events");
    es.onmessage = (ev) => {
      try {
        const { state, appearance } = JSON.parse(ev.data);
        setState(state);
        applyAppearance(appearance);
        setAppearance(appearance);
      } catch {}
    };
    return () => es.close();
  }, []);

  return { state, appearance };
}

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

export function Icon({ name, class: cls }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return html`
    <svg class=${cls} viewBox=${icon.viewBox} fill="currentColor" aria-hidden="true">
      ${icon.d.map(p => html`<path d=${p} />`)}
    </svg>
  `;
}

export function CasterList({ casters }) {
  if (!casters || casters.length === 0) return null;
  return html`
    <div>
      <div class="caster-header">Casters</div>
      <div class="caster-list">
        ${casters.map((c, i) => {
    const socials = (c.socials || []).filter((s) => s.handle);
    const pronouns = c.pronouns || "";
    return html`
            <div class="caster-row" key=${i}>
              <span class="caster-name">${c.name}</span>
              ${pronouns && html`<span class="caster-pronouns">${pronouns}</span>`}
              ${socials.length > 0 && html`
                <span class="caster-socials">
                  ${socials.map((s) => html`
                    <span class="caster-social">
                      <${Icon} name=${s.icon} class="caster-social-icon" />
                      <span class="caster-social-handle">${s.handle}</span>
                    </span>
                  `)}
                </span>
              `}
            </div>
          `;
  })}
      </div>
    </div>
  `;
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
