import { useState, useEffect, useRef } from "react";
import type { HotkeyConfig } from "../types";
import { Card, CardHeader, CardSection } from "./Card";
import "./HotkeysEditor.css";
import "./SettingsForms.css";

type HotkeyAction = {
  id: string;
  label: string;
  group: string;
};

const HOTKEY_ACTIONS: HotkeyAction[] = [
  { id: "score_e1_inc", label: "Increment Entity 1 Score", group: "Scoring" },
  { id: "score_e1_dec", label: "Decrement Entity 1 Score", group: "Scoring" },
  { id: "score_e2_inc", label: "Increment Entity 2 Score", group: "Scoring" },
  { id: "score_e2_dec", label: "Decrement Entity 2 Score", group: "Scoring" },
  { id: "swap_entities", label: "Swap Entities", group: "Match" },
  { id: "clear", label: "Clear Information", group: "Match" },
];

function formatKeyCombo(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");

  const key = e.code;
  const isModifierOnly = [
    "ControlLeft",
    "ControlRight",
    "AltLeft",
    "AltRight",
    "ShiftLeft",
    "ShiftRight",
    "MetaLeft",
    "MetaRight",
  ].includes(key);
  if (!isModifierOnly) {
    parts.push(friendlyKeyName(key));
  }
  return parts.join("+");
}

function friendlyKeyName(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num" + code.slice(6);
  const map: Record<string, string> = {
    Space: "Space",
    Backspace: "Backspace",
    Tab: "Tab",
    Enter: "Enter",
    Escape: "Esc",
    Delete: "Del",
    Insert: "Ins",
    Home: "Home",
    End: "End",
    PageUp: "PgUp",
    PageDown: "PgDn",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Minus: "-",
    Equal: "=",
    Backquote: "`",
    F1: "F1",
    F2: "F2",
    F3: "F3",
    F4: "F4",
    F5: "F5",
    F6: "F6",
    F7: "F7",
    F8: "F8",
    F9: "F9",
    F10: "F10",
    F11: "F11",
    F12: "F12",
  };
  return map[code] ?? code;
}

function displayBinding(combo: string): string {
  if (!combo) return "";
  return combo;
}

type Props = {
  value: HotkeyConfig;
  onChange: (v: HotkeyConfig) => void;
  onCommit: (v: HotkeyConfig) => void;
};

export default function HotkeysEditor({ value, onChange, onCommit }: Props) {
  const [recording, setRecording] = useState<string | null>(null);
  const recordRef = useRef<string | null>(null);
  recordRef.current = recording;

  useEffect(() => {
    if (!recording) return;

    const onKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const isModifierOnly = ["Control", "Alt", "Shift", "Meta"].includes(
        e.key,
      );
      if (isModifierOnly) return;

      const combo = formatKeyCombo(e);
      const next = {
        ...value,
        bindings: { ...value.bindings, [recording]: combo },
      };
      onChange(next);
      onCommit(next);
      setRecording(null);
    };

    const onBlur = () => setRecording(null);

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("blur", onBlur);
    };
  }, [recording, value, onChange, onCommit]);

  const clearBinding = (actionId: string) => {
    const bindings = { ...value.bindings };
    delete bindings[actionId];
    const next = { ...value, bindings };
    onChange(next);
    onCommit(next);
  };

  const groups = HOTKEY_ACTIONS.reduce<Record<string, HotkeyAction[]>>(
    (acc, a) => {
      (acc[a.group] ??= []).push(a);
      return acc;
    },
    {},
  );

  const conflict = (actionId: string): string | undefined => {
    const combo = value.bindings[actionId];
    if (!combo) return undefined;
    const other = HOTKEY_ACTIONS.find(
      (a) => a.id !== actionId && value.bindings[a.id] === combo,
    );
    return other?.label;
  };

  return (
    <div className="settings-stack">
      <Card>
        <CardHeader
          title="Hotkeys"
          subtitle="Keyboard shortcuts for common actions. Click a binding to record a new key combination."
        />

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={value.enabled}
            onChange={(e) => {
              const next = { ...value, enabled: e.target.checked };
              onChange(next);
              onCommit(next);
            }}
          />
          Enable hotkeys
        </label>
      </Card>

      {Object.entries(groups).map(([group, actions]) => (
        <Card key={group}>
          <CardSection title={group}>
            <div className="hotkey-list">
              {actions.map((action) => {
                const bound = value.bindings[action.id] ?? "";
                const isRecording = recording === action.id;
                const conflictLabel = conflict(action.id);
                return (
                  <div key={action.id} className="hotkey-row">
                    <span className="hotkey-label">{action.label}</span>
                    <div className="hotkey-binding-group">
                      <button
                        type="button"
                        className={`hotkey-binding ${isRecording ? "is-recording" : ""} ${conflictLabel ? "is-conflict" : ""}`}
                        onClick={() =>
                          setRecording(isRecording ? null : action.id)
                        }
                        title={
                          isRecording
                            ? "Press any key combo…"
                            : "Click to rebind"
                        }
                      >
                        {isRecording
                          ? "Press a key…"
                          : bound
                            ? displayBinding(bound)
                            : "—"}
                      </button>
                      {bound && !isRecording && (
                        <button
                          type="button"
                          className="hotkey-clear"
                          onClick={() => clearBinding(action.id)}
                          title="Clear binding"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    {conflictLabel && (
                      <span className="hotkey-conflict">
                        Conflicts with: {conflictLabel}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardSection>
        </Card>
      ))}

      <Card variant="flat">
        <CardSection
          title="How it works"
          hint="Hotkeys work now when the StreamFighter window is focused. Global hotkeys (active when other apps like OBS are focused) require a platform-specific listener that will be added in a future update."
        >
          <span />
        </CardSection>
      </Card>
    </div>
  );
}
