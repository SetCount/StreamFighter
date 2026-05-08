import { useState, type CSSProperties } from 'react';
import type { ScoreEntity, Player, GamePack } from '../types';
import { winCount } from '../reshape';
import { findPack, findCharacter, portraitURL, stockURL } from '../assets';
import { PORT_COLORS } from '../portColors';
import CharacterPicker from './CharacterPicker';

type Props = {
    value: ScoreEntity[];
    onChange: (v: ScoreEntity[]) => void;
    canResize: boolean;
    format: string;
    bestOf: number;
    games: GamePack[];
    gameId: string;
    assetsBase: string;
};

const blankPlayer = (): Player => ({
    name: '', character: '', costume: 0,
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
    games, gameId, assetsBase,
}: Props) {
    const pipCount = winCount(bestOf);
    const pack = findPack(games, gameId);
    const [pickerFor, setPickerFor] = useState<{ ei: number; pi: number } | null>(null);

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

    // When picking a character we default to the first available costume
    // in the pack so the portrait renders immediately. If no costumes are
    // loaded we fall back to 0 (unset) and the stock row stays empty.
    const onPickCharacter = (charId: string | null) => {
        if (pickerFor) {
            const char = charId ? findCharacter(pack, charId) : undefined;
            const firstCostume = char?.costumes[0]?.index ?? 0;
            setPlayer(pickerFor.ei, pickerFor.pi, {
                character: charId ?? '',
                costume: firstCostume,
            });
        }
        setPickerFor(null);
    };

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
                        <div className="score-row">
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
                        </div>
                    </label>

                    <div className="players">
                        {e.players.map((p, pi) => {
                            const char = findCharacter(pack, p.character);
                            const costumes = char?.costumes ?? [];
                            return (
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
                                    <button
                                        type="button"
                                        className="player-portrait"
                                        onClick={() => setPickerFor({ ei: i, pi })}
                                        aria-label="Choose character"
                                    >
                                        {p.character && p.costume > 0 ? (
                                            <img
                                                src={portraitURL(assetsBase, gameId, p.character, p.costume)}
                                                alt={char?.name ?? p.character}
                                            />
                                        ) : (
                                            <span className="portrait-empty">
                                                {p.character ? char?.name ?? p.character : 'Click to choose character'}
                                            </span>
                                        )}
                                    </button>
                                    {p.character && costumes.length > 0 && (
                                        <div className="stock-row" role="radiogroup" aria-label="Costume">
                                            {costumes.map(cos => (
                                                <button
                                                    key={cos.index}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={p.costume === cos.index}
                                                    aria-label={`Costume ${cos.index}`}
                                                    className="stock-btn"
                                                    onClick={() => setPlayer(i, pi, { costume: cos.index })}
                                                >
                                                    <img
                                                        src={stockURL(assetsBase, gameId, p.character, cos.index)}
                                                        alt=""
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {canResize && (
                            <button className="add-row" onClick={() => addPlayer(i)}>+ Player</button>
                        )}
                    </div>
                </fieldset>
            ))}
            {canResize && (
                <button className="add-card" onClick={addEntity}>+ Entity</button>
            )}
            <CharacterPicker
                open={pickerFor !== null}
                onClose={() => setPickerFor(null)}
                onSelect={onPickCharacter}
                pack={pack}
                assetsBase={assetsBase}
            />
        </>
    );
}
