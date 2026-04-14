import {AttachedFile} from "@/hooks/use-panel-state.ts";

export interface AiRequestParams {
    model: string;
    prompt: string;
    duration?: number;
    ratio?: string;
    quality?: string;
    turbo?: boolean;
    negativePrompt?: string;
    chaos?: number;
    stylize?: number;
    weird?: number;
    preset?: string;
    template?: AttachedFile;
    images?: AttachedFile[];
    videos?: AttachedFile[];
}

export interface AiRequest {
    id?: number;
    method: string;
    idUserProject: string;

    aiParams: AiRequestParams;
}