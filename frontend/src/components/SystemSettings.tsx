import type { OutputConfig } from "../types";
import { Card, CardHeader, CardSection } from "./Card";
import "./SettingsForms.css";

type Props = {
  value: OutputConfig;
  onChange: (v: OutputConfig) => void;
  onCommit: (v: OutputConfig) => void;
  startggToken: string;
  onTokenChange: (v: string) => void;
  onTokenBlur: () => void;
};

export default function SystemSettings({
  value,
  onChange,
  onCommit,
  startggToken,
  onTokenChange,
  onTokenBlur,
}: Props) {
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
          title="Server"
          subtitle="OBS browser source connects over HTTP. Toggling or changing the port requires an app restart."
        />

        <div className="settings-row">
          <label className="checkbox-row settings-row-grow">
            <input
              type="checkbox"
              checked={value.enableServer}
              onChange={(e) => commit({ enableServer: e.target.checked })}
            />
            Run overlay HTTP server
          </label>
          <label className="settings-field settings-field-narrow">
            <span className="settings-label">HTTP port</span>
            <input
              type="number"
              value={value.httpPort}
              onChange={(e) => set({ httpPort: Number(e.target.value) })}
              onBlur={() => commit()}
            />
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Paths"
          subtitle="All paths are relative to wherever StreamFighter is launched from."
        />

        <CardSection
          title="Overlay"
          hint={
            <>
              HTML file served at <code>/game</code> for the OBS browser source.
            </>
          }
        >
          <label className="settings-field">
            <span className="settings-label sr-only">Overlay HTML path</span>
            <input
              value={value.overlayPath}
              onChange={(e) => set({ overlayPath: e.target.value })}
              onBlur={() => commit()}
              placeholder="overlay/index.html"
            />
          </label>
        </CardSection>

        <CardSection
          title="Game packs"
          hint={
            <>
              One folder per game (e.g. <code>melee/</code>, <code>pplus/</code>
              ) with character art and <code>game.json</code>.
            </>
          }
        >
          <label className="settings-field">
            <span className="settings-label sr-only">Games directory</span>
            <input
              value={value.gamesDir}
              onChange={(e) => set({ gamesDir: e.target.value })}
              onBlur={() => commit()}
              placeholder="games"
            />
          </label>
        </CardSection>

        <CardSection
          title="Sponsors"
          hint="PNGs in this folder rotate in the overlay's sponsor module."
        >
          <label className="settings-field">
            <span className="settings-label sr-only">Sponsors directory</span>
            <input
              value={value.sponsorsDir ?? ""}
              onChange={(e) => set({ sponsorsDir: e.target.value })}
              onBlur={() => commit()}
              placeholder="sponsors"
            />
          </label>
        </CardSection>
      </Card>

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

      <Card>
        <CardHeader
          title="Integrations"
          subtitle="External services StreamFighter pulls match data from."
        />

        <label className="settings-field">
          <span className="settings-label">start.gg token</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="from start.gg/admin/profile/developer"
            value={startggToken}
            onChange={(e) => onTokenChange(e.target.value)}
            onBlur={onTokenBlur}
          />
          <span className="settings-hint">
            Personal token used by Pick Set. Stored locally in{" "}
            <code>streamfighter.secrets.json</code> (mode 0600).
          </span>
        </label>
      </Card>
    </div>
  );
}
