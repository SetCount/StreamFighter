import type { GamePack } from './types';

// Legacy fallback palette in Melee P1/P2/P3/P4 order. Used when the
// active game pack doesn't define `portColors` in game.json (and as the
// seed for `defaultState()` on the Go side, which runs before any pack
// is loaded). Desaturated so swatches sit next to the Adwaita-neutral
// chrome without clashing. Mirrored in `app.go` — keep them in sync.
export const PORT_COLORS = [
    '#c96a6a', // P1 red
    '#5f8fc4', // P2 blue
    '#cdb466', // P3 yellow
    '#7ab07a', // P4 green
] as const;

// portPaletteFor returns the per-player slot palette: pack.portColors
// when configured, otherwise the legacy 4-color palette. This is the
// source for preset color pickers and for entity portColor defaults
// regardless of format — team colors are picked manually only.
export function portPaletteFor(pack: GamePack | undefined): readonly string[] {
    return pack?.portColors?.length ? pack.portColors : PORT_COLORS;
}

// paletteFor returns the swatch palette to offer in the entity-color
// picker for the given format. 2v2 prefers the pack's `teamColors`
// (per-team slots); 1v1 / FFA fall through to the port palette.
export function paletteFor(
    pack: GamePack | undefined,
    format: string,
): readonly string[] {
    if (format === '2v2' && pack?.teamColors?.length) return pack.teamColors;
    return portPaletteFor(pack);
}
