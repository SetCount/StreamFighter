import type { SetInfo } from "../types";
import Segmented from "./Segmented";

type Props = {
  value: SetInfo;
  onChange: (v: SetInfo) => void;
  tournamentUrl: string;
  onTournamentUrlChange: (v: string) => void;
  onTournamentUrlBlur: () => void;
  onPickSet: () => void;
};

const BEST_OF_OPTIONS = [
  { value: 3, label: "Bo3" },
  { value: 5, label: "Bo5" },
  // { value: 7, label: "Bo7" },
];

const FORMAT_OPTIONS = [
  { value: "1v1", label: "1v1" },
  { value: "2v2", label: "2v2" },
  // { value: 'FFA', label: 'FFA' },
];

export default function SetInfoEditor({
  value,
  onChange,
  tournamentUrl,
  onTournamentUrlChange,
  onTournamentUrlBlur,
  onPickSet,
}: Props) {
  const set = (patch: Partial<SetInfo>) => onChange({ ...value, ...patch });
  return (
    <div className="set-info-bar">
      <fieldset className="set-info-card">
        <legend>Tournament</legend>
        <div className="set-info-row">
          <label className="grow">
            Name
            <input
              value={value.tournamentName}
              onChange={(e) => set({ tournamentName: e.target.value })}
            />
          </label>
        </div>

        <details className="startgg-details">
          <summary>StartGG URL</summary>
          <label>
            <input
              type="url"
              placeholder="https://www.start.gg/tournament/<slug>"
              value={tournamentUrl}
              onChange={(e) => onTournamentUrlChange(e.target.value)}
              onBlur={onTournamentUrlBlur}
            />
          </label>
        </details>
      </fieldset>

      <fieldset className="set-info-card">
        <legend>Set Info</legend>
        <div>
          <label className="grow">
            Round
            <input
              value={value.roundLabel}
              onChange={(e) => set({ roundLabel: e.target.value })}
            />
          </label>
          <div className="set-info-row">
            <label className="shrink">
              <button
                type="button"
                className="pick-set-btn"
                onClick={onPickSet}
              >
                Pick Set
              </button>
            </label>
            <label className="shrink">
              Best Of
              <Segmented
                value={value.bestOf}
                options={BEST_OF_OPTIONS}
                onChange={(n) => set({ bestOf: n })}
              />
            </label>
            <label className="shrink">
              Format
              <Segmented
                value={value.format}
                options={FORMAT_OPTIONS}
                onChange={(f) => set({ format: f })}
              />
            </label>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
