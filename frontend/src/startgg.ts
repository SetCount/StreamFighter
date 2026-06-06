import type {
  StreamState,
  ScoreEntity,
  Player,
  PlayerPreset,
  StartggSet,
  StartggEntrant,
  StartggPlayer,
} from "./types";
import { reshapeForFormat, clampScores } from "./reshape";
import { PORT_COLORS } from "./portColors";

// inferFormat reads the entrant shape and returns the closest match to
// our Format enum: 1v1 (2 entrants × 1 player), 2v2 (2 entrants × 2+
// players), or FFA (anything else, including singles brackets with >2
// entrants like sudden-death rounds).
function inferFormat(entrants: StartggEntrant[]): string {
  if (entrants.length > 2) return "FFA";
  if ((entrants[0]?.players.length ?? 1) > 1) return "2v2";
  return "1v1";
}

function matchAllPresets(
  p: StartggPlayer,
  presets: PlayerPreset[],
): PlayerPreset[] {
  const matches: PlayerPreset[] = [];
  if (p.id) {
    for (const x of presets) {
      if (x.startggPlayerId && x.startggPlayerId === p.id) matches.push(x);
    }
    if (matches.length > 0) return matches;
  }
  const lc = p.gamerTag.toLowerCase();
  for (const x of presets) {
    if (
      x.name.toLowerCase() === lc ||
      x.aliases?.some((a) => a.toLowerCase() === lc)
    ) {
      matches.push(x);
    }
  }
  return matches;
}

function matchPreset(
  p: StartggPlayer,
  presets: PlayerPreset[],
  overrides?: Map<number, PlayerPreset>,
): PlayerPreset | undefined {
  if (overrides && p.id) {
    const ov = overrides.get(p.id);
    if (ov) return ov;
  }
  const all = matchAllPresets(p, presets);
  return all[0];
}

export type Ambiguity = {
  player: StartggPlayer;
  presets: PlayerPreset[];
};

export function collectAmbiguities(
  set: StartggSet,
  presets: PlayerPreset[],
): Ambiguity[] {
  const result: Ambiguity[] = [];
  for (const entrant of set.entrants) {
    for (const p of entrant.players) {
      const all = matchAllPresets(p, presets);
      if (all.length > 1) result.push({ player: p, presets: all });
    }
  }
  return result;
}

function playerFromStartgg(
  p: StartggPlayer,
  presets: PlayerPreset[],
  overrides?: Map<number, PlayerPreset>,
): Player {
  const preset = matchPreset(p, presets, overrides);
  if (preset) {
    return {
      name: preset.name,
      pronouns: preset.pronouns,
      prefix: preset.prefix || p.prefix,
      character: preset.character ?? "",
      costume: preset.costume ?? 0,
      startggPlayerId: p.id || preset.startggPlayerId,
    };
  }
  return {
    name: p.gamerTag,
    prefix: p.prefix || undefined,
    character: "",
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
  overrides?: Map<number, PlayerPreset>,
): StreamState {
  const format = inferFormat(set.entrants);
  const bestOf = [3, 5, 7].includes(set.totalGames)
    ? set.totalGames
    : prev.setInfo.bestOf;
  const entities: ScoreEntity[] = set.entrants.map((entrant, i) => {
    const players =
      entrant.players.length > 0
        ? entrant.players.map((p) => playerFromStartgg(p, presets, overrides))
        : [{ name: entrant.name, character: "", costume: 0 }];
    const firstPresetColor = entrant.players
      .map((p) => matchPreset(p, presets, overrides)?.portColor)
      .find((c) => !!c);
    const prevColor = prev.scoreEntities[i]?.portColor;
    return {
      players,
      currentScore: 0,
      portColor:
        firstPresetColor ??
        prevColor ??
        portPalette[i] ??
        portPalette[0] ??
        PORT_COLORS[0],
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
    case 1:
      return "Created";
    case 2:
      return "Ongoing";
    case 3:
      return "Completed";
    case 6:
      return "Called";
    case 7:
      return "Ready";
    default:
      return "";
  }
}
