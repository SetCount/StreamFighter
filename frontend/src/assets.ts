// URL helpers for game-pack art served by the overlay HTTP server.
// All assets live at `${assetsBase}/<gameId>/characters/<charId>/...`.
// pad2 keeps costume indices on the wire as 01, 02, ... matching the
// on-disk filenames written by users.

import type { GamePack, Character } from './types';

const pad2 = (n: number) => n.toString().padStart(2, '0');

export const selectURL = (base: string, gameId: string, charId: string) =>
    `${base}/${gameId}/characters/${charId}/select.png`;

export const portraitURL = (base: string, gameId: string, charId: string, costume: number) =>
    `${base}/${gameId}/characters/${charId}/portrait_${pad2(costume)}.png`;

export const stockURL = (base: string, gameId: string, charId: string, costume: number) =>
    `${base}/${gameId}/characters/${charId}/stock_${pad2(costume)}.png`;

export const findPack = (games: GamePack[], id: string): GamePack | undefined =>
    games.find(g => g.id === id);

export const findCharacter = (
    pack: GamePack | undefined,
    charId: string,
): Character | undefined => pack?.characters.find(c => c.id === charId);
