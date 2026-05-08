import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { PlayerPreset, CasterPreset, GamePack } from '../types';
import { findPack, findCharacter, portraitURL, stockURL } from '../assets';
import { PORT_COLORS } from '../portColors';
import CharacterPicker from './CharacterPicker';
import SocialsEditor from './SocialsEditor';

type Props = {
    players: PlayerPreset[];
    casters: CasterPreset[];
    games: GamePack[];
    gameId: string;
    assetsBase: string;
    onSavePlayer: (p: PlayerPreset) => Promise<void>;
    onDeletePlayer: (id: string) => Promise<void>;
    onAddPlayer: () => void;
    onChangePlayers: (next: PlayerPreset[]) => void;
    onSaveCaster: (c: CasterPreset) => Promise<void>;
    onDeleteCaster: (id: string) => Promise<void>;
    onAddCaster: () => void;
    onChangeCasters: (next: CasterPreset[]) => void;
};

// Rows are kept in the parent's `players`/`casters` lists so edits
// survive between renders. The Save button persists the row to disk;
// the × button deletes (after a saved ID is assigned) or removes the
// unsaved draft locally.

export default function PresetsEditor({
    players, casters, games, gameId, assetsBase,
    onSavePlayer, onDeletePlayer, onAddPlayer, onChangePlayers,
    onSaveCaster, onDeleteCaster, onAddCaster, onChangeCasters,
}: Props) {
    const pack = findPack(games, gameId);
    const [pickerFor, setPickerFor] = useState<number | null>(null);

    const setPlayer = (i: number, patch: Partial<PlayerPreset>) => {
        const next = [...players];
        next[i] = { ...next[i], ...patch };
        onChangePlayers(next);
    };
    const removePlayer = (i: number) => {
        const p = players[i];
        if (p.id) {
            void onDeletePlayer(p.id);
        } else {
            onChangePlayers(players.filter((_, idx) => idx !== i));
        }
    };
    const onPickCharacter = (charId: string | null) => {
        if (pickerFor !== null) {
            const cur = players[pickerFor];
            const char = charId ? findCharacter(pack, charId) : undefined;
            const firstCostume = char?.costumes[0]?.index ?? 0;
            setPlayer(pickerFor, {
                character: charId ?? '',
                costume: firstCostume,
            });
        }
        setPickerFor(null);
    };

    const setCaster = (i: number, patch: Partial<CasterPreset>) => {
        const next = [...casters];
        next[i] = { ...next[i], ...patch };
        onChangeCasters(next);
    };
    const removeCaster = (i: number) => {
        const c = casters[i];
        if (c.id) {
            void onDeleteCaster(c.id);
        } else {
            onChangeCasters(casters.filter((_, idx) => idx !== i));
        }
    };

    return (
        <>
            <fieldset className="presets-section">
                <legend>Player Presets</legend>
                {players.length === 0 && (
                    <div className="empty">No player presets yet.</div>
                )}
                <div className="preset-list">
                    {players.map((p, i) => {
                        const char = findCharacter(pack, p.character ?? '');
                        const costumes = char?.costumes ?? [];
                        return (
                            <div
                                key={p.id || `new-${i}`}
                                className="preset-row"
                                style={{ '--port-color': p.portColor || 'transparent' } as CSSProperties}
                            >
                                <div className="preset-grid">
                                    <label className="grow">
                                        Name
                                        <input
                                            placeholder="Tag"
                                            value={p.name}
                                            onChange={ev => setPlayer(i, { name: ev.target.value })}
                                        />
                                    </label>
                                    <label className="grow">
                                        Aliases (comma-separated)
                                        <input
                                            placeholder="alt-tag, old-tag"
                                            value={(p.aliases ?? []).join(', ')}
                                            onChange={ev => setPlayer(i, {
                                                aliases: ev.target.value
                                                    .split(',')
                                                    .map(s => s.trim())
                                                    .filter(s => s.length > 0),
                                            })}
                                        />
                                    </label>
                                    <label className="shrink">
                                        StartGG ID
                                        <input
                                            type="number"
                                            placeholder="0"
                                            value={p.startggPlayerId ?? ''}
                                            onChange={ev => setPlayer(i, {
                                                startggPlayerId: ev.target.value
                                                    ? Number(ev.target.value)
                                                    : undefined,
                                            })}
                                        />
                                    </label>
                                </div>
                                <div className="preset-art">
                                    <button
                                        type="button"
                                        className="player-portrait preset-portrait"
                                        onClick={() => setPickerFor(i)}
                                        aria-label="Choose character"
                                    >
                                        {p.character && (p.costume ?? 0) > 0 ? (
                                            <img
                                                src={portraitURL(assetsBase, gameId, p.character, p.costume!)}
                                                alt={char?.name ?? p.character}
                                            />
                                        ) : (
                                            <span className="portrait-empty">
                                                {p.character ? char?.name ?? p.character : 'Pick character'}
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
                                                    onClick={() => setPlayer(i, { costume: cos.index })}
                                                >
                                                    <img
                                                        src={stockURL(assetsBase, gameId, p.character!, cos.index)}
                                                        alt=""
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="preset-color-row">
                                    <span className="preset-color-label">Color</span>
                                    <div className="color-swatches" role="radiogroup" aria-label="Port / Team Color">
                                        <button
                                            type="button"
                                            className="color-swatch clear-swatch"
                                            role="radio"
                                            aria-checked={!p.portColor}
                                            aria-label="No preference"
                                            title="No preference"
                                            onClick={() => setPlayer(i, { portColor: undefined })}
                                        />
                                        {PORT_COLORS.map(c => (
                                            <button
                                                key={c}
                                                type="button"
                                                className="color-swatch"
                                                role="radio"
                                                aria-checked={p.portColor === c}
                                                aria-label={c}
                                                style={{ background: c }}
                                                onClick={() => setPlayer(i, { portColor: c })}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="preset-actions">
                                    <button onClick={() => onSavePlayer(p)}>Save</button>
                                    <button className="icon-btn" onClick={() => removePlayer(i)} aria-label="Remove">×</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button className="add-row" onClick={onAddPlayer}>+ Player Preset</button>
            </fieldset>

            <fieldset className="presets-section">
                <legend>Caster Presets</legend>
                {casters.length === 0 && (
                    <div className="empty">No caster presets yet.</div>
                )}
                <div className="preset-list">
                    {casters.map((c, i) => (
                        <div key={c.id || `new-${i}`} className="preset-row">
                            <div className="preset-grid">
                                <label className="grow">
                                    Name
                                    <input
                                        placeholder="Caster name"
                                        value={c.name}
                                        onChange={ev => setCaster(i, { name: ev.target.value })}
                                    />
                                </label>
                            </div>
                            <SocialsEditor
                                value={c.socials}
                                onChange={s => setCaster(i, { socials: s })}
                            />
                            <div className="preset-actions">
                                <button onClick={() => onSaveCaster(c)}>Save</button>
                                <button className="icon-btn" onClick={() => removeCaster(i)} aria-label="Remove">×</button>
                            </div>
                        </div>
                    ))}
                </div>
                <button className="add-row" onClick={onAddCaster}>+ Caster Preset</button>
            </fieldset>

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
