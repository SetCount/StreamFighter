import type { OutputConfig } from "../types";
import { Card, CardHeader } from "./Card";
import "./SettingsForms.css";

type Props = {
  value: OutputConfig;
  onChange: (v: OutputConfig) => void;
  onCommit: (v: OutputConfig) => void;
};

export default function OutputSettings({ value, onChange, onCommit }: Props) {
  const set = (patch: Partial<OutputConfig>) =>
    onChange({ ...value, ...patch });
  const commit = (patch?: Partial<OutputConfig>) => {
    const next = patch ? { ...value, ...patch } : value;
    if (patch) onChange(next);
    onCommit(next);
  };
  return (
    <div className="settings-stack">
      <Card>
        <CardHeader
          title="File output"
          subtitle="Plain files OBS reads alongside the live overlay — useful as fallback Text sources or for downstream tooling."
        />

        <label className="settings-field">
          <span className="settings-label">Output directory</span>
          <input
            value={value.outputDir}
            onChange={(e) => set({ outputDir: e.target.value })}
            onBlur={() => commit()}
            placeholder="obs-output"
          />
          <span className="settings-hint">
            One <code>.txt</code> per leaf field (e.g.{" "}
            <code>entity_1_player_1_name.txt</code>) and a full{" "}
            <code>state.json</code> snapshot.
          </span>
        </label>

        <div className="settings-toggles">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={value.writeFieldFiles}
              onChange={(e) => commit({ writeFieldFiles: e.target.checked })}
            />
            Write per-field text files
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={value.writeJson}
              onChange={(e) => commit({ writeJson: e.target.checked })}
            />
            Write state.json snapshot
          </label>
        </div>
      </Card>
    </div>
  );
}
