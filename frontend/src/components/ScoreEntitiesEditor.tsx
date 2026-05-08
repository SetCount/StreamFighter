import type { CSSProperties } from 'react';
import type { ScoreEntity, Player } from '../types';
import { winCount } from '../reshape';

type Props = {
    value: ScoreEntity[];
    onChange: (v: ScoreEntity[]) => void;
    canResize: boolean;
    format: string;
    bestOf: number;
};

// Muted port palette — Melee P1/P2/P3/P4 ordering, desaturated to sit
// next to the Adwaita-neutral chrome without screaming.
const PORT_COLORS = ['#c96a6a', '#5f8fc4', '#cdb466', '#7ab07a'] as const;

const blankPlayer = (): Player => ({
    name: '', character: '', characterColor: '',
});
const blankEntity = (): ScoreEntity => ({
    players: [blankPlayer()],
    currentScore: 0,
    portColor: PORT_COLORS[0],
});

function entityTitle(format: string, i: number): string {
    if (format === '2v2') return `Team ${i + 1}`;
    if (format === '1v1') return `Player ${i + 1}`;
    return `Entity ${i + 1}`;
}

export default function ScoreEntitiesEditor({
    value, onChange, canResize, format, bestOf,
}: Props) {
    const pipCount = winCount(bestOf);

    const setEntity = (i: number, patch: Partial<ScoreEntity>) => {
        const next = [...value];
        next[i] = { ...next[i], ...patch };
        onChange(next);
    };
    const setPlayer = (ei: number, pi: number, patch: Partial<Player>) => {
        const players = [...value[ei].players];
        players[pi] = { ...players[pi], ...patch };
        setEntity(ei, { players });
    };
    const onPipClick = (i: number, n: number) => {
        const current = value[i].currentScore;
        setEntity(i, { currentScore: current >= n ? n - 1 : n });
    };

    const addEntity = () => onChange([...value, blankEntity()]);
    const removeEntity = (i: number) => onChange(value.filter((_, idx) => idx !== i));
    const addPlayer = (ei: number) =>
        setEntity(ei, { players: [...value[ei].players, blankPlayer()] });
    const removePlayer = (ei: number, pi: number) =>
        setEntity(ei, { players: value[ei].players.filter((_, idx) => idx !== pi) });

    return (
        <>
            {value.map((e, i) => (
                <fieldset
                    key={i}
                    className="entity-card"
                    style={{ '--port-color': e.portColor || 'transparent' } as CSSProperties}
                >
                    <legend>
                        <span
                            className="legend-swatch"
                            style={{ background: e.portColor || 'transparent' }}
                        />
                        {entityTitle(format, i)}
                        {canResize && (
                            <button
                                className="icon-btn legend-action"
                                onClick={() => removeEntity(i)}
                                disabled={value.length <= 2}
                                aria-label="Remove entity"
                            >×</button>
                        )}
                    </legend>

                    <label>
                        Score ({e.currentScore} / {pipCount})
                        <div className="pips" role="group" aria-label="Score">
                            {Array.from({ length: pipCount }, (_, idx) => idx + 1).map(n => (
                                <button
                                    key={n}
                                    type="button"
                                    className="pip"
                                    aria-pressed={e.currentScore >= n}
                                    aria-label={`Score ${n}`}
                                    onClick={() => onPipClick(i, n)}
                                />
                            ))}
                        </div>
                    </label>

                    <label>
                        Port / Team Color
                        <div className="color-swatches" role="radiogroup" aria-label="Port / Team Color">
                            {PORT_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    className="color-swatch"
                                    role="radio"
                                    aria-checked={e.portColor === c}
                                    aria-label={c}
                                    style={{ background: c }}
                                    onClick={() => setEntity(i, { portColor: c })}
                                />
                            ))}
                        </div>
                    </label>

                    <div className="players">
                        {e.players.map((p, pi) => (
                            <div key={pi} className="player">
                                <div className="player-row">
                                    <input
                                        className="name"
                                        placeholder="Player name"
                                        value={p.name}
                                        onChange={ev => setPlayer(i, pi, { name: ev.target.value })}
                                    />
                                    {canResize && (
                                        <button
                                            className="icon-btn"
                                            onClick={() => removePlayer(i, pi)}
                                            disabled={e.players.length <= 1}
                                            aria-label="Remove player"
                                        >×</button>
                                    )}
                                </div>
                                <input
                                    placeholder="Character"
                                    value={p.character}
                                    onChange={ev => setPlayer(i, pi, { character: ev.target.value })}
                                />
                                <input
                                    placeholder="Character color"
                                    value={p.characterColor}
                                    onChange={ev => setPlayer(i, pi, { characterColor: ev.target.value })}
                                />
                            </div>
                        ))}
                        {canResize && (
                            <button className="add-row" onClick={() => addPlayer(i)}>+ Player</button>
                        )}
                    </div>
                </fieldset>
            ))}
            {canResize && (
                <button className="add-card" onClick={addEntity}>+ Entity</button>
            )}
        </>
    );
}
