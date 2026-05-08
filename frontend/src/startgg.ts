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
// label, format. BestOf is preserved — start.gg doesn't expose it
// reliably. Each ScoreEntity is rebuilt from the entrant; we keep the
// previous entity's portColor when no preset color overrides it.
export function applyStartggSet(
    prev: StreamState,
    tournamentName: string,
    set: StartggSet,
    presets: PlayerPreset[],
): StreamState {
    const format = inferFormat(set.entrants);
    const entities: ScoreEntity[] = set.entrants.map((entrant, i) => {
        const players = entrant.players.length > 0
            ? entrant.players.map(p => playerFromStartgg(p, presets))
            : [{ name: entrant.name, character: '', costume: 0 }];
        // Prefer a preset-defined color (first player's preset wins),
        // then the previous entity's color at this index, then a sane
        // default from the palette.
        const firstPresetColor = entrant.players
            .map(p => matchPreset(p, presets)?.portColor)
            .find(c => !!c);
        const prevColor = prev.scoreEntities[i]?.portColor;
        return {
            players,
            currentScore: 0,
            portColor: firstPresetColor ?? prevColor ?? PORT_COLORS[i] ?? PORT_COLORS[0],
        };
    });

    const reshaped = reshapeForFormat(entities, format);
    const clamped = clampScores(reshaped, prev.setInfo.bestOf);

    return {
        ...prev,
        setInfo: {
            ...prev.setInfo,
            tournamentName,
            roundLabel: set.fullRoundText || prev.setInfo.roundLabel,
            format,
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
