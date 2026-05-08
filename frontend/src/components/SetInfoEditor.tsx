import type { CSSProperties } from 'react';
import type { SetInfo } from '../types';
import Segmented from './Segmented';

type Props = {
    value: SetInfo;
    onChange: (v: SetInfo) => void;
    matchCols?: number;
};

const BEST_OF_OPTIONS = [
    { value: 3, label: 'Bo3' },
    { value: 5, label: 'Bo5' },
    { value: 7, label: 'Bo7' },
];

const FORMAT_OPTIONS = [
    { value: '1v1', label: '1v1' },
    { value: '2v2', label: '2v2' },
    { value: 'FFA', label: 'FFA' },
];

export default function SetInfoEditor({ value, onChange, matchCols }: Props) {
    const set = (patch: Partial<SetInfo>) => onChange({ ...value, ...patch });
    const style = matchCols
        ? ({ '--cols': matchCols } as CSSProperties)
        : undefined;
    return (
        <fieldset className="set-info-card" style={style}>
            <legend>Set Info</legend>
            <div className="set-info-row">
                <label className="grow">
                    Tournament
                    <input
                        value={value.tournamentName}
                        onChange={e => set({ tournamentName: e.target.value })}
                    />
                </label>
                <label className="round">
                    Round
                    <input
                        value={value.roundLabel}
                        onChange={e => set({ roundLabel: e.target.value })}
                    />
                </label>
                <label className="shrink">
                    Best Of
                    <Segmented
                        value={value.bestOf}
                        options={BEST_OF_OPTIONS}
                        onChange={n => set({ bestOf: n })}
                    />
                </label>
                <label className="shrink">
                    Format
                    <Segmented
                        value={value.format}
                        options={FORMAT_OPTIONS}
                        onChange={f => set({ format: f })}
                    />
                </label>
            </div>
        </fieldset>
    );
}
