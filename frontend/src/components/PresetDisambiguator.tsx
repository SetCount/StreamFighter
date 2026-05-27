import { useEffect, useRef, useState } from 'react';
import type { PlayerPreset, GamePack } from '../types';
import type { Ambiguity } from '../startgg';
import { selectURL, findCharacter } from '../assets';
import { Icon } from '../icons';
import './PresetDisambiguator.css';

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
        <dialog ref={ref} className="modal disambiguator" onClose={onClose}>
            <header className="modal-header">
                <span className="modal-eyebrow">Pick set</span>
                <h2 className="modal-title">Choose preset</h2>
                <button
                    type="button"
                    className="btn-icon modal-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <Icon name="close" width={16} height={16} />
                </button>
            </header>
            <div className="modal-body">
                <p className="hint">Multiple presets match these players. Pick one for each:</p>
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
                                                    className="card-swatch"
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
            </div>
            <footer className="modal-footer">
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={() => onConfirm(choices)}>Confirm</button>
            </footer>
        </dialog>
    );
}
