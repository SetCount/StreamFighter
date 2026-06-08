export namespace gamepacks {
  export class Costume {
    index: number;

    static createFrom(source: any = {}) {
      return new Costume(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.index = source["index"];
    }
  }
  export class Character {
    id: string;
    name: string;
    costumes: Costume[];

    static createFrom(source: any = {}) {
      return new Character(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.name = source["name"];
      this.costumes = this.convertValues(source["costumes"], Costume);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }

  export class Pack {
    id: string;
    name: string;
    shortName: string;
    aspectRatios?: string[];
    characterLayout?: string[][];
    portColors?: string[];
    teamColors?: string[];
    characters: Character[];

    static createFrom(source: any = {}) {
      return new Pack(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.name = source["name"];
      this.shortName = source["shortName"];
      this.aspectRatios = source["aspectRatios"];
      this.characterLayout = source["characterLayout"];
      this.portColors = source["portColors"];
      this.teamColors = source["teamColors"];
      this.characters = this.convertValues(source["characters"], Character);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
}

export namespace internal {
  export class Social {
    icon: string;
    handle: string;

    static createFrom(source: any = {}) {
      return new Social(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.icon = source["icon"];
      this.handle = source["handle"];
    }
  }
  export class Caster {
    name: string;
    pronouns?: string;
    socials: Social[];

    static createFrom(source: any = {}) {
      return new Caster(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.name = source["name"];
      this.pronouns = source["pronouns"];
      this.socials = this.convertValues(source["socials"], Social);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
  export class CasterPreset {
    id: string;
    name: string;
    pronouns?: string;
    socials: Social[];

    static createFrom(source: any = {}) {
      return new CasterPreset(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.name = source["name"];
      this.pronouns = source["pronouns"];
      this.socials = this.convertValues(source["socials"], Social);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
  export class HotkeyConfig {
    enabled: boolean;
    bindings: Record<string, string>;

    static createFrom(source: any = {}) {
      return new HotkeyConfig(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.enabled = source["enabled"];
      this.bindings = source["bindings"];
    }
  }
  export class OverlayAppearance {
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

    static createFrom(source: any = {}) {
      return new OverlayAppearance(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.layout = source["layout"];
      this.gameId = source["gameId"];
      this.gameAspect = source["gameAspect"];
      this.accent = source["accent"];
      this.sidebarBg = source["sidebarBg"];
      this.sidebarWidth = source["sidebarWidth"];
      this.camHeight = source["camHeight"];
      this.nameFont = source["nameFont"];
      this.nameFontSize = source["nameFontSize"];
      this.roundFontSize = source["roundFontSize"];
      this.logoUrl = source["logoUrl"];
      this.sponsorInterval = source["sponsorInterval"];
      this.sponsorWidth = source["sponsorWidth"];
      this.sponsorHeight = source["sponsorHeight"];
      this.sponsorPadding = source["sponsorPadding"];
    }
  }
  export class OutputConfig {
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

    static createFrom(source: any = {}) {
      return new OutputConfig(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.outputDir = source["outputDir"];
      this.overlayPath = source["overlayPath"];
      this.gamesDir = source["gamesDir"];
      this.sponsorsDir = source["sponsorsDir"];
      this.game = source["game"];
      this.httpPort = source["httpPort"];
      this.writeFieldFiles = source["writeFieldFiles"];
      this.writeJson = source["writeJson"];
      this.enableServer = source["enableServer"];
      this.startggTournamentUrl = source["startggTournamentUrl"];
      this.overlayAppearance = this.convertValues(
        source["overlayAppearance"],
        OverlayAppearance,
      );
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }

  export class Player {
    name: string;
    pronouns?: string;
    prefix?: string;
    character: string;
    costume: number;
    startggPlayerId?: number;

    static createFrom(source: any = {}) {
      return new Player(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.name = source["name"];
      this.pronouns = source["pronouns"];
      this.prefix = source["prefix"];
      this.character = source["character"];
      this.costume = source["costume"];
      this.startggPlayerId = source["startggPlayerId"];
    }
  }
  export class PlayerPreset {
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

    static createFrom(source: any = {}) {
      return new PlayerPreset(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.name = source["name"];
      this.pronouns = source["pronouns"];
      this.prefix = source["prefix"];
      this.aliases = source["aliases"];
      this.startggPlayerId = source["startggPlayerId"];
      this.gameId = source["gameId"];
      this.character = source["character"];
      this.costume = source["costume"];
      this.portColor = source["portColor"];
    }
  }
  export class ScoreEntity {
    players: Player[];
    currentScore: number;
    portColor: string;

    static createFrom(source: any = {}) {
      return new ScoreEntity(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.players = this.convertValues(source["players"], Player);
      this.currentScore = source["currentScore"];
      this.portColor = source["portColor"];
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
  export class Secrets {
    startggToken?: string;

    static createFrom(source: any = {}) {
      return new Secrets(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.startggToken = source["startggToken"];
    }
  }
  export class SetInfo {
    tournamentName: string;
    roundLabel: string;
    bestOf: number;
    format: string;

    static createFrom(source: any = {}) {
      return new SetInfo(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.tournamentName = source["tournamentName"];
      this.roundLabel = source["roundLabel"];
      this.bestOf = source["bestOf"];
      this.format = source["format"];
    }
  }

  export class StreamState {
    setInfo: SetInfo;
    casters: Caster[];
    scoreEntities: ScoreEntity[];

    static createFrom(source: any = {}) {
      return new StreamState(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.setInfo = this.convertValues(source["setInfo"], SetInfo);
      this.casters = this.convertValues(source["casters"], Caster);
      this.scoreEntities = this.convertValues(
        source["scoreEntities"],
        ScoreEntity,
      );
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
  export class UpdateInfo {
    current: string;
    latest: string;
    url: string;
    outdated: boolean;

    static createFrom(source: any = {}) {
      return new UpdateInfo(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.current = source["current"];
      this.latest = source["latest"];
      this.url = source["url"];
      this.outdated = source["outdated"];
    }
  }
}

export namespace startgg {
  export class Player {
    id: number;
    gamerTag: string;
    prefix?: string;

    static createFrom(source: any = {}) {
      return new Player(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.gamerTag = source["gamerTag"];
      this.prefix = source["prefix"];
    }
  }
  export class Entrant {
    name: string;
    players: Player[];

    static createFrom(source: any = {}) {
      return new Entrant(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.name = source["name"];
      this.players = this.convertValues(source["players"], Player);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }

  export class Set {
    id: string;
    fullRoundText: string;
    eventName: string;
    state: number;
    totalGames: number;
    entrants: Entrant[];

    static createFrom(source: any = {}) {
      return new Set(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.id = source["id"];
      this.fullRoundText = source["fullRoundText"];
      this.eventName = source["eventName"];
      this.state = source["state"];
      this.totalGames = source["totalGames"];
      this.entrants = this.convertValues(source["entrants"], Entrant);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
  export class Tournament {
    name: string;
    slug: string;

    static createFrom(source: any = {}) {
      return new Tournament(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.name = source["name"];
      this.slug = source["slug"];
    }
  }
  export class SetsResult {
    tournament: Tournament;
    sets: Set[];

    static createFrom(source: any = {}) {
      return new SetsResult(source);
    }

    constructor(source: any = {}) {
      if ("string" === typeof source) source = JSON.parse(source);
      this.tournament = this.convertValues(source["tournament"], Tournament);
      this.sets = this.convertValues(source["sets"], Set);
    }

    convertValues(a: any, classs: any, asMap: boolean = false): any {
      if (!a) {
        return a;
      }
      if (a.slice && a.map) {
        return (a as any[]).map((elem) => this.convertValues(elem, classs));
      } else if ("object" === typeof a) {
        if (asMap) {
          for (const key of Object.keys(a)) {
            a[key] = new classs(a[key]);
          }
          return a;
        }
        return new classs(a);
      }
      return a;
    }
  }
}
