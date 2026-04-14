export interface RequestContext {
    type: string;
    answer?: string;
    prompt?: string;
    images?: string[];
    videos?: string[];
    audios?: string[];
    sourceImages?: string[];
    model: string;
}

export interface Request {
    id: number;
    idProject: number;
    status: string;
    context: RequestContext;
    date: Date;

    history?: Request[];
}