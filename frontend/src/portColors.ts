// Muted port palette in Melee P1/P2/P3/P4 order. Desaturated so the
// swatches sit next to the Adwaita-neutral chrome without clashing.
// Indices match how `defaultState()` in app.go and `reshape.ts` seed
// blank entities, so changing the order here ripples through both. The
// Go side keeps its own copy of the same hex values — keep them in sync
// when adjusting.
export const PORT_COLORS = [
    '#c96a6a', // P1 red
    '#5f8fc4', // P2 blue
    '#cdb466', // P3 yellow
    '#7ab07a', // P4 green
] as const;
