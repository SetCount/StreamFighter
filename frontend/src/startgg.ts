import type {
    StreamState, ScoreEntity, Player, PlayerPreset,
    StartggSet, StartggEntrant, StartggPlayer,
} from './types';
import { reshapeForFormat, clampScores } from './reshape';
import { PORT_COLORS } from './portColors';

// inferFormat reads the entrant shape and returns the closest match to
// our Format enum: 1v1 (2 entrants × 1 player), 2v2 (2 entrants × 2+
// players), or FFA (anything else, including singles brackets with >2
// entrants like sudden-death rounds).
function inferFormat(entrants: StartggEntrant[]): string {
    if (entrants.length > 2) return 'FFA';
    if ((entrants[0]?.players.length ?? 1) > 1) return '2v2';
    return '1v1';
}

// matchPreset: startgg ID first, then name (case-insensitive), then
// alias (case-insensitive). Undefined when nothing matches — caller
// builds a blank player carrying the gamer tag and startgg ID.
function matchPreset(p: StartggPlayer, presets: PlayerPreset[]): PlayerPreset | undefined {
    if (p.id) {
        const byId = presets.find(x => x.startggPlayerId && x.startggPlayerId === p.id);
        if (byId) return byId;
    }
    const lc = p.gamerTag.toLowerCase();
    return presets.find(x =>
        x.name.toLowerCase() === lc ||
        x.aliases?.some(a => a.toLowerCase() === lc));
}

function playerFromStartgg(p: StartggPlayer, presets: PlayerPreset[]): Player {
    const preset = matchPreset(p, presets);
    if (preset) {
        return {
            name: preset.name,
            character: preset.character ?? '',
            costume: preset.costume ?? 0,
            startggPlayerId: p.id || preset.startggPlayerId,
        };
    }
    return {
        name: p.gamerTag,
        character: '',
        costume: 0,
        startggPlayerId: p.id || undefined,
    };
}

// applyStartggSet returns the next StreamState after pulling a set
// from start.gg. SetInfo gets tournament name (caller passes), round
// label, format. BestOf is taken from `set.totalGames` only when it's a
// recognized 3/5/7 — start.gg only populates it when the tournament
// configured per-round bestOf, otherwise we preserve prev. Each
// ScoreEntity is rebuilt from the entrant; we keep the previous entity's
// portColor when no preset color overrides it. `portPalette` is the
// pack's port colors (or PORT_COLORS fallback) — team colors never
// appear here, since they're a manual pick on the entity.
export function applyStartggSet(
    prev: StreamState,
    tournamentName: string,
    set: StartggSet,
    presets: PlayerPreset[],
    portPalette: readonly string[] = PORT_COLORS,
): StreamState {
    const format = inferFormat(set.entrants);
    const bestOf = [3, 5, 7].includes(set.totalGames)
        ? set.totalGames
        : prev.setInfo.bestOf;
    const entities: ScoreEntity[] = set.entrants.map((entrant, i) => {
        const players = entrant.players.length > 0
            ? entrant.players.map(p => playerFromStartgg(p, presets))
            : [{ name: entrant.name, character: '', costume: 0 }];
        // Prefer a preset-defined color (first player's preset wins),
        // then the previous entity's color at this index, then a sane
        // default from the port palette.
        const firstPresetColor = entrant.players
            .map(p => matchPreset(p, presets)?.portColor)
            .find(c => !!c);
        const prevColor = prev.scoreEntities[i]?.portColor;
        return {
            players,
            currentScore: 0,
            portColor: firstPresetColor ?? prevColor ?? portPalette[i] ?? portPalette[0] ?? PORT_COLORS[0],
        };
    });

    const reshaped = reshapeForFormat(entities, format, portPalette);
    const clamped = clampScores(reshaped, bestOf);

    return {
        ...prev,
        setInfo: {
            ...prev.setInfo,
            tournamentName,
            roundLabel: set.fullRoundText || prev.setInfo.roundLabel,
            format,
            bestOf,
        },
        scoreEntities: clamped,
    };
}

// Display helper: turn the set state code into a short label.
export function setStateLabel(state: number): string {
    switch (state) {
        case 1: return 'Created';
        case 2: return 'Ongoing';
        case 3: return 'Completed';
        case 6: return 'Called';
        case 7: return 'Ready';
        default: return '';
    }
}
