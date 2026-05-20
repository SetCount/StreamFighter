import { useState, useEffect } from "https://esm.sh/preact@10/hooks";
import { html } from "./shared.js";

export function SponsorRotator({ appearance, inline = false }) {
  const intervalMs = (appearance?.sponsorInterval ?? 5) * 1000;
  const width      = appearance?.sponsorWidth  ?? 200;
  const height     = appearance?.sponsorHeight ?? 0;
  const corner     = appearance?.sponsorCorner ?? "bottom-right";
  const padding    = appearance?.sponsorPadding ?? 16;

  const [images, setImages] = useState([]);
  const [index, setIndex]   = useState(0);
  const [faded, setFaded]   = useState(false);

  useEffect(() => {
    fetch("/sponsors.json")
      .then(r => r.json())
      .then(list => { setImages(list); setIndex(0); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      setFaded(true);
      setTimeout(() => {
        setIndex(i => (i + 1) % images.length);
        setFaded(false);
      }, 400);
    }, intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  const baseStyle = {
    width:         width  ? width  + "px" : "auto",
    height:        height ? height + "px" : "auto",
    opacity:       faded ? 0 : 1,
    transition:    "opacity 0.4s ease",
    pointerEvents: "none",
    objectFit:     "contain",
  };

  const style = inline
    ? { ...baseStyle, display: "block", margin: "0 auto" }
    : (() => {
        const vPos = corner.includes("top")  ? { top: padding + "px" }  : { bottom: padding + "px" };
        const hPos = corner.includes("left") ? { left: padding + "px" } : { right: padding + "px" };
        return { ...baseStyle, position: "fixed", ...vPos, ...hPos };
      })();

  return html`<img src=${"/sponsors/" + images[index]} style=${style} alt="" />`;
}
