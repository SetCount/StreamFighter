import { useEffect, useRef, useState } from 'react';
import type { PlayerPreset, GamePack } from '../types';
import type { Ambiguity } from '../startgg';
import { selectURL, findCharacter } from '../assets';

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: (overrides: Map<number, PlayerPreset>) => void;
    ambiguities: Ambiguity[];
    gameId: string;
    games: GamePack[];
    assetsBase: string;
};

export default function PresetDisambiguator({
    open, onClose, onConfirm, ambiguities, gameId, games, assetsBase,
}: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const [choices, setChoices] = useState<Map<number, PlayerPreset>>(new Map());

    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);

    useEffect(() => {
        if (open) {
            const init = new Map<number, PlayerPreset>();
            for (const a of ambiguities) {
                init.set(a.player.id, a.presets[0]);
            }
            setChoices(init);
        }
    }, [open, ambiguities]);

    const pack = games.find(g => g.id === gameId);

    const pick = (playerId: number, preset: PlayerPreset) => {
        setChoices(prev => new Map(prev).set(playerId, preset));
    };

    return (
        <dialog ref={ref} className="disambiguator" onClose={onClose}>
            <fieldset>
                <legend>Choose Preset</legend>
                <div className="dialog-actions">
                    <button className="icon-btn" onClick={onClose} aria-label="Close">&times;</button>
                </div>
                <p className="disambiguator-hint">Multiple presets match these players. Pick one for each:</p>
                {ambiguities.map(a => {
                    const selected = choices.get(a.player.id);
                    return (
                        <div key={a.player.id} className="disambiguator-player">
                            <span className="disambiguator-tag">{a.player.gamerTag}</span>
                            <div className="disambiguator-options">
                                {a.presets.map(preset => {
                                    const charName = findCharacter(pack, preset.character ?? '')?.name ?? preset.character;
                                    const isSelected = selected?.id === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            className={`disambiguator-option${isSelected ? ' selected' : ''}`}
                                            onClick={() => pick(a.player.id, preset)}
                                        >
                                            {preset.character && (
                                                <img
                                                    className="disambiguator-icon"
                                                    src={selectURL(assetsBase, gameId, preset.character)}
                                                    alt=""
                                                />
                                            )}
                                            {preset.portColor && (
                                                <span
                                                    className="legend-swatch"
                                                    style={{ background: preset.portColor }}
                                                />
                                            )}
                                            <span>{charName || 'Default'}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
                <div className="disambiguator-footer">
                    <button type="button" onClick={() => onConfirm(choices)}>Confirm</button>
                </div>
            </fieldset>
        </dialog>
    );
}
