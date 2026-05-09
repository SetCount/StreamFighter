export namespace main {
	
	export class Social {
	    icon: string;
	    handle: string;
	
	    static createFrom(source: any = {}) {
	        return new Social(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.icon = source["icon"];
	        this.handle = source["handle"];
	    }
	}
	export class Caster {
	    name: string;
	    socials: Social[];
	
	    static createFrom(source: any = {}) {
	        return new Caster(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.socials = this.convertValues(source["socials"], Social);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	    socials: Social[];
	
	    static createFrom(source: any = {}) {
	        return new CasterPreset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.socials = this.convertValues(source["socials"], Social);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	export class Costume {
	    index: number;
	
	    static createFrom(source: any = {}) {
	        return new Costume(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
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
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.costumes = this.convertValues(source["costumes"], Costume);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	
	export class GamePack {
	    id: string;
	    name: string;
	    shortName: string;
	    characters: Character[];
	    characterLayout?: string[][];
	    portColors?: string[];
	    teamColors?: string[];
	
	    static createFrom(source: any = {}) {
	        return new GamePack(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.shortName = source["shortName"];
	        this.characters = this.convertValues(source["characters"], Character);
	        this.characterLayout = source["characterLayout"];
	        this.portColors = source["portColors"];
	        this.teamColors = source["teamColors"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	export class OutputConfig {
	    outputDir: string;
	    overlayPath: string;
	    gamesDir: string;
	    game: string;
	    httpPort: number;
	    writeFieldFiles: boolean;
	    writeJson: boolean;
	    enableServer: boolean;
	    startggTournamentUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new OutputConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.outputDir = source["outputDir"];
	        this.overlayPath = source["overlayPath"];
	        this.gamesDir = source["gamesDir"];
	        this.game = source["game"];
	        this.httpPort = source["httpPort"];
	        this.writeFieldFiles = source["writeFieldFiles"];
	        this.writeJson = source["writeJson"];
	        this.enableServer = source["enableServer"];
	        this.startggTournamentUrl = source["startggTournamentUrl"];
	    }
	}
	export class Player {
	    name: string;
	    character: string;
	    costume: number;
	    startggPlayerId?: number;
	
	    static createFrom(source: any = {}) {
	        return new Player(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.character = source["character"];
	        this.costume = source["costume"];
	        this.startggPlayerId = source["startggPlayerId"];
	    }
	}
	export class PlayerPreset {
	    id: string;
	    name: string;
	    aliases?: string[];
	    startggPlayerId?: number;
	    character?: string;
	    costume?: number;
	    portColor?: string;
	
	    static createFrom(source: any = {}) {
	        return new PlayerPreset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.aliases = source["aliases"];
	        this.startggPlayerId = source["startggPlayerId"];
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
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.players = this.convertValues(source["players"], Player);
	        this.currentScore = source["currentScore"];
	        this.portColor = source["portColor"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	        if ('string' === typeof source) source = JSON.parse(source);
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
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tournamentName = source["tournamentName"];
	        this.roundLabel = source["roundLabel"];
	        this.bestOf = source["bestOf"];
	        this.format = source["format"];
	    }
	}
	
	export class StartggPlayer {
	    id: number;
	    gamerTag: string;
	
	    static createFrom(source: any = {}) {
	        return new StartggPlayer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.gamerTag = source["gamerTag"];
	    }
	}
	export class StartggEntrant {
	    name: string;
	    players: StartggPlayer[];
	
	    static createFrom(source: any = {}) {
	        return new StartggEntrant(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.players = this.convertValues(source["players"], StartggPlayer);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	
	export class StartggSet {
	    id: string;
	    fullRoundText: string;
	    eventName: string;
	    state: number;
	    totalGames: number;
	    entrants: StartggEntrant[];
	
	    static createFrom(source: any = {}) {
	        return new StartggSet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.fullRoundText = source["fullRoundText"];
	        this.eventName = source["eventName"];
	        this.state = source["state"];
	        this.totalGames = source["totalGames"];
	        this.entrants = this.convertValues(source["entrants"], StartggEntrant);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	export class StartggTournament {
	    name: string;
	    slug: string;
	
	    static createFrom(source: any = {}) {
	        return new StartggTournament(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.slug = source["slug"];
	    }
	}
	export class StartggSetsResult {
	    tournament: StartggTournament;
	    sets: StartggSet[];
	
	    static createFrom(source: any = {}) {
	        return new StartggSetsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tournament = this.convertValues(source["tournament"], StartggTournament);
	        this.sets = this.convertValues(source["sets"], StartggSet);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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
	
	export class StreamState {
	    setInfo: SetInfo;
	    casters: Caster[];
	    scoreEntities: ScoreEntity[];
	
	    static createFrom(source: any = {}) {
	        return new StreamState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.setInfo = this.convertValues(source["setInfo"], SetInfo);
	        this.casters = this.convertValues(source["casters"], Caster);
	        this.scoreEntities = this.convertValues(source["scoreEntities"], ScoreEntity);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
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

