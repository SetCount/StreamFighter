// Plain-object mirrors of the Wails-generated classes. We use these
// throughout the UI so spread/literal updates type-check; the API
// boundary (SetState/SetConfig) takes care of the cast.

export type SetInfo = {
  tournamentName: string;
  roundLabel: string;
  bestOf: number;
  format: string;
};

export type Player = {
  name: string;
  pronouns?: string;
  prefix?: string;
  character: string;
  costume: number;
  startggPlayerId?: number;
};

export type ScoreEntity = {
  players: Player[];
  currentScore: number;
  portColor: string;
};

export type Social = {
  icon: string;
  handle: string;
};

export type Caster = {
  name: string;
  pronouns?: string;
  socials: Social[];
};

export type StreamState = {
  setInfo: SetInfo;
  casters: Caster[];
  scoreEntities: ScoreEntity[];
};

export type OverlayAppearance = {
  layout: string;
  gameId?: string;
  gameAspect: string;
  accent: string;
  sidebarBg: string;
  sidebarWidth: number;
  camHeight: number;
  nameFont: string;
  nameFontSize: number;
  roundFontSize: number;
  logoUrl?: string;
  sponsorInterval: number;
  sponsorWidth: number;
  sponsorHeight: number;
  sponsorPadding: number;
};

export const DEFAULT_APPEARANCE: OverlayAppearance = {
  layout: "dual",
  gameAspect: "4:3",
  accent: "#e8711a",
  sidebarBg: "#18100a",
  sidebarWidth: 240,
  camHeight: 300,
  nameFont: '"Arial Black", Impact, "Arial Narrow", sans-serif',
  nameFontSize: 30,
  roundFontSize: 30,
  logoUrl: "",
  sponsorInterval: 5,
  sponsorWidth: 200,
  sponsorHeight: 0,
  sponsorPadding: 16,
};

export type OutputConfig = {
  outputDir: string;
  overlayPath: string;
  gamesDir: string;
  sponsorsDir?: string;
  game: string;
  httpPort: number;
  writeFieldFiles: boolean;
  writeJson: boolean;
  enableServer: boolean;
  startggTournamentUrl?: string;
  overlayAppearance: OverlayAppearance;
};

export type Secrets = {
  startggToken?: string;
};

export type PlayerPreset = {
  id: string;
  name: string;
  pronouns?: string;
  prefix?: string;
  aliases?: string[];
  startggPlayerId?: number;
  gameId?: string;
  character?: string;
  costume?: number;
  portColor?: string;
};

export type CasterPreset = {
  id: string;
  name: string;
  pronouns?: string;
  socials: Social[];
};

// start.gg pull types — flattened from the GraphQL response.
export type StartggPlayer = {
  id: number;
  gamerTag: string;
  prefix?: string;
};

export type StartggEntrant = {
  name: string;
  players: StartggPlayer[];
};

export type StartggSet = {
  id: string;
  fullRoundText: string;
  eventName: string;
  state: number;
  totalGames: number;
  entrants: StartggEntrant[];
};

export type StartggTournament = {
  name: string;
  slug: string;
};

export type StartggSetsResult = {
  tournament: StartggTournament;
  sets: StartggSet[];
};

// Mirrors of the GamePack/Character/Costume types in games.go.
export type Costume = {
  index: number;
};

export type Character = {
  id: string;
  name: string;
  costumes: Costume[];
};

export type GamePack = {
  id: string;
  name: string;
  shortName: string;
  aspectRatios?: string[];
  characters: Character[];
  characterLayout?: string[][];
  portColors?: string[];
  teamColors?: string[];
};

export type LayoutRegistry = Record<string, string[]>;

export type HotkeyConfig = {
  enabled: boolean;
  bindings: Record<string, string>;
};
