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
	
	    static createFrom(source: any = {}) {
	        return new GamePack(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.shortName = source["shortName"];
	        this.characters = this.convertValues(source["characters"], Character);
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
	    }
	}
	export class Player {
	    name: string;
	    character: string;
	    costume: number;
	
	    static createFrom(source: any = {}) {
	        return new Player(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.character = source["character"];
	        this.costume = source["costume"];
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

