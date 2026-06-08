import { useEffect, useRef } from "react";
import type { HotkeyConfig } from "../types";
import { ExecuteHotkeyAction } from "../../wailsjs/go/internal/App";

function formatKeyCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");
  const key = e.code;
  if (
    ![
      "ControlLeft",
      "ControlRight",
      "AltLeft",
      "AltRight",
      "ShiftLeft",
      "ShiftRight",
      "MetaLeft",
      "MetaRight",
    ].includes(key)
  ) {
    let name = key;
    if (key.startsWith("Key")) name = key.slice(3);
    else if (key.startsWith("Digit")) name = key.slice(5);
    else if (key.startsWith("Numpad")) name = "Num" + key.slice(6);
    parts.push(name);
  }
  return parts.join("+");
}

export { formatKeyCombo };

export function useHotkeyListener(hotkeyConfig: HotkeyConfig) {
  const configRef = useRef(hotkeyConfig);
  configRef.current = hotkeyConfig;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const cfg = configRef.current;
      if (!cfg.enabled) return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT"
      )
        return;
      if (target.isContentEditable) return;

      const combo = formatKeyCombo(e);
      if (!combo) return;

      for (const [action, binding] of Object.entries(cfg.bindings)) {
        if (binding === combo) {
          e.preventDefault();
          ExecuteHotkeyAction(action);
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
