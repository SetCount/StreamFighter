import { useLayoutEffect, useEffect, useRef, useCallback } from "react";
import { ResizeWindow } from "../../wailsjs/go/internal/App";

export function useWindowResize() {
  const appRef = useRef<HTMLDivElement>(null);
  const lastWindowH = useRef(0);

  const syncWindowSize = useCallback(() => {
    const appEl = appRef.current;
    if (!appEl) return;
    const h = Math.ceil(appEl.offsetHeight);
    const max = window.screen.availHeight;
    const clamped = Math.min(Math.max(h, 500), max);
    if (Math.abs(clamped - lastWindowH.current) > 2) {
      lastWindowH.current = clamped;
      ResizeWindow(1280, clamped);
    }
  }, []);

  useLayoutEffect(syncWindowSize);

  useEffect(() => {
    const appEl = appRef.current;
    if (!appEl) return;
    const ro = new ResizeObserver(syncWindowSize);
    ro.observe(appEl);
    return () => ro.disconnect();
  }, [syncWindowSize]);

  return appRef;
}
