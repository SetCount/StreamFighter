import { useEffect, useRef } from 'react';
import type { GamePack } from '../types';
import { selectURL } from '../assets';

type Props = {
    open: boolean;
    onClose: () => void;
    onSelect: (charId: string | null) => void;
    pack: GamePack | undefined;
    assetsBase: string;
};

// CharacterPicker is a modal <dialog> showing every character in the
// active game pack. Tiles render `select.png`. The first tile is a
// "None" entry that clears the player's character.
export default function CharacterPicker({
    open, onClose, onSelect, pack, assetsBase,
}: Props) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const d = ref.current;
        if (!d) return;
        if (open && !d.open) d.showModal();
        if (!open && d.open) d.close();
    }, [open]);

    return (
        <dialog ref={ref} className="character-picker" onClose={onClose}>
            <fieldset>
                <legend>Choose Character</legend>
                <div className="dialog-actions">
                    <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
                </div>
                {!pack ? (
                    <p className="empty">No game pack selected. Choose one in Settings.</p>
                ) : pack.characters.length === 0 ? (
                    <p className="empty">
                        No characters loaded for {pack.name}. Drop art into{' '}
                        <code>games/{pack.id}/characters/</code> and reload.
                    </p>
                ) : (
                    <div className="character-grid">
                        <button
                            type="button"
                            className="character-tile clear"
                            onClick={() => onSelect(null)}
                        >
                            <span className="character-tile-name">— None —</span>
                        </button>
                        {pack.characters.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                className="character-tile"
                                onClick={() => onSelect(c.id)}
                            >
                                <img src={selectURL(assetsBase, pack.id, c.id)} alt="" />
                                <span className="character-tile-name">{c.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </fieldset>
        </dialog>
    );
}
