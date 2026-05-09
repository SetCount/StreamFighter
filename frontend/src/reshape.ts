import type { Player, ScoreEntity } from './types';
import { PORT_COLORS } from './portColors';

const blankPlayer = (): Player => ({
    name: '', character: '', costume: 0,
});

const colorAt = (palette: readonly string[], i: number): string =>
    palette[i] ?? palette[0] ?? PORT_COLORS[0];

// fixedShape coerces entities to exactly entityCount entries with exactly
// playerCount players each, preserving any existing values where it can.
function fixedShape(
    current: ScoreEntity[],
    entityCount: number,
    playerCount: number,
    palette: readonly string[],
): ScoreEntity[] {
    const out: ScoreEntity[] = [];
    for (let i = 0; i < entityCount; i++) {
        const existing = current[i];
        const players: Player[] = [];
        for (let j = 0; j < playerCount; j++) {
            players.push(existing?.players[j] ?? blankPlayer());
        }
        out.push({
            players,
            currentScore: existing?.currentScore ?? 0,
            portColor: existing?.portColor ?? colorAt(palette, i),
        });
    }
    return out;
}

// reshapeForFormat returns entities resized to match the given format.
// 1v1 -> 2 entities x 1 player. 2v2 -> 2 entities x 2 players.
// FFA is free-form; we only ensure at least 2 entities of 1 player each.
// `palette` seeds portColor on newly-created entities; existing colors
// are always preserved.
export function reshapeForFormat(
    current: ScoreEntity[],
    format: string,
    palette: readonly string[] = PORT_COLORS,
): ScoreEntity[] {
    switch (format) {
        case '1v1':
            return fixedShape(current, 2, 1, palette);
        case '2v2':
            return fixedShape(current, 2, 2, palette);
        case 'FFA':
        default:
            if (current.length >= 2) return current;
            return fixedShape(current, 2, 1, palette);
    }
}

// canResize is true when the user is allowed to add/remove entities and
// players. Only the free-for-all format is structurally flexible.
export function canResize(format: string): boolean {
    return format === 'FFA';
}

// winCount returns how many wins a single side needs to take the set.
// First to ceil(bestOf / 2). Bo3 -> 2, Bo5 -> 3, Bo7 -> 4.
export function winCount(bestOf: number): number {
    return Math.ceil(bestOf / 2);
}

// clampScores caps each entity's currentScore at the max possible wins for
// the given Best Of. Used when shrinking from Bo7 -> Bo3, etc.
export function clampScores(entities: ScoreEntity[], bestOf: number): ScoreEntity[] {
    const max = winCount(bestOf);
    return entities.map(e => ({
        ...e,
        currentScore: Math.min(Math.max(0, e.currentScore), max),
    }));
}
