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
    character: string;
    characterColor: string;
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
    socials: Social[];
};

export type StreamState = {
    setInfo: SetInfo;
    casters: Caster[];
    scoreEntities: ScoreEntity[];
};

export type OutputConfig = {
    outputDir: string;
    overlayPath: string;
    httpPort: number;
    writeFieldFiles: boolean;
    writeJson: boolean;
    enableServer: boolean;
};
