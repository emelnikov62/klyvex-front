export interface VideoMode {
    name: string;
    aspectRatios?: string[];
    durations?: number[];
    resolutions?: string[];
    negativePrompt?: boolean;
    presets?: string[];
    firstFrame?: boolean;
    secondFrame?: boolean;
}

export interface Settings {
    //video
    videModes: VideoMode[];

    //audio
    audioMode?: string[];
    instrumental?: boolean;
    genres?: string[];
    tempos?: string[];
    moods?: string[];

    //image
    aspectRatios?: string[];
    turboMode?: boolean;
    chaos?: boolean;
    stylize?: boolean;
    weird?: boolean;
    negativePrompt?: boolean;
    styleRefs?: boolean;
    qualities?: string[];
}

export interface Model {
    id: number;
    name: string;
    key: string;
    type: string;
    cost: number;
    icon: string;
    active: boolean;
    created: Date;

    settings: Settings;
}

export interface Context {
    models: Model[]
}