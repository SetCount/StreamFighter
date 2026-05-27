import type { SetInfo } from "../types";
import Segmented from "./Segmented";
import { Card, CardHeader } from "./Card";
import "./SetInfoEditor.css";

type Props = {
  value: SetInfo;
  onChange: (v: SetInfo) => void;
  tournamentUrl: string;
  onTournamentUrlChange: (v: string) => void;
  onTournamentUrlBlur: () => void;
  onPickSet: () => void;
  onClear: () => void;
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
  onClear,
}: Props) {
  const set = (patch: Partial<SetInfo>) => onChange({ ...value, ...patch });

  return (
    <Card variant="accent">
      <CardHeader title="Tournament Info" />


      <label className="match-field">
        StartGG URL
        <input
          type="url"
          placeholder="https://www.start.gg/tournament/..."
          value={tournamentUrl}
          onChange={(e) => onTournamentUrlChange(e.target.value)}
          onBlur={onTournamentUrlBlur}
        />
      </label>

      <div className="match-controls">
        <label className="match-field">
          Name
          <input
            value={value.tournamentName}
            onChange={(e) => set({ tournamentName: e.target.value })}
            placeholder="The Big House 11"
          />
        </label>

        <label className="match-field">
          Round
          <input
            value={value.roundLabel}
            onChange={(e) => set({ roundLabel: e.target.value })}
            placeholder="Winners Quarter-Final"
          />
        </label>

        <div className="match-segments">
          <label>
            Best Of
            <Segmented
              value={value.bestOf}
              options={BEST_OF_OPTIONS}
              onChange={(n) => set({ bestOf: n })}
            />
          </label>
          <label>
            Format
            <Segmented
              value={value.format}
              options={FORMAT_OPTIONS}
              onChange={(f) => set({ format: f })}
            />
          </label>
        </div>
      </div>

      <div className="match-actions">
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="btn btn-primary" onClick={onPickSet}>
          Pick Set
        </button>
      </div>
    </Card>
  );
}
