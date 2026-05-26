import { useEffect, useMemo, useRef } from "react";
import type { Character, GamePack } from "../types";
import { selectURL } from "../assets";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (charId: string | null) => void;
  pack: GamePack | undefined;
  assetsBase: string;
};

// CharacterPicker is a modal <dialog> showing every character in the
// active game pack. Tiles render `select.png`. The first row is a
// "None" entry that clears the player's character.
//
// When the pack defines `characterLayout`, rows mirror the in-game CSS
// (each inner array is one horizontally-centered row). Characters
// present on disk but missing from the layout are appended as a final
// row so a half-finished layout still surfaces every fighter.
export default function CharacterPicker({
  open,
  onClose,
  onSelect,
  pack,
  assetsBase,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const rows = useMemo(() => buildRows(pack), [pack]);

  return (
    <dialog ref={ref} className="character-picker" onClose={onClose}>
      <fieldset>
        <legend>Choose Character</legend>
        <div className="dialog-actions">
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {!pack ? (
          <p className="empty">
            No game pack selected. Choose one in Settings.
          </p>
        ) : pack.characters.length === 0 ? (
          <p className="empty">
            No characters loaded for {pack.name}. Drop art into{" "}
            <code>games/{pack.id}/characters/</code> and reload.
          </p>
        ) : (
          <div className="character-rows">
            <div className="character-row">
              <button
                type="button"
                className="character-tile clear"
                onClick={() => onSelect(null)}
              >
                <span className="character-tile-name">None</span>
              </button>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="character-row">
                {row.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="character-tile"
                    onClick={() => onSelect(c.id)}
                    aria-label={c.name}
                    title={c.name}
                  >
                    <img src={selectURL(assetsBase, pack.id, c.id)} alt="" />
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </fieldset>
    </dialog>
  );
}

// buildRows groups characters according to pack.characterLayout. When
// the layout is absent or empty, all characters fall into a single row
// (the CSS wraps as needed, so this preserves the auto-grid feel).
// When present, layout entries that don't exist on disk are skipped,
// and characters on disk that aren't in any row are appended last.
function buildRows(pack: GamePack | undefined): Character[][] {
  if (!pack) return [];
  const byId = new Map(pack.characters.map((c) => [c.id, c]));
  const layout = pack.characterLayout ?? [];
  if (layout.length === 0) {
    return [pack.characters];
  }
  const placed = new Set<string>();
  const rows: Character[][] = [];
  for (const ids of layout) {
    const row: Character[] = [];
    for (const id of ids) {
      const c = byId.get(id);
      if (!c) continue;
      row.push(c);
      placed.add(id);
    }
    if (row.length > 0) rows.push(row);
  }
  const leftover = pack.characters.filter((c) => !placed.has(c.id));
  if (leftover.length > 0) rows.push(leftover);
  return rows;
}
