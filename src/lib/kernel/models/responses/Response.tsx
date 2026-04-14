import {User} from "../main/User";
import {AiModel} from "../main/AiModel";
import {Error} from "../main/Error";
import {Request} from "../main/Request";
import {ChatFolder, ChatSession} from "@/hooks/use-panel-state";

export interface Response {
    key: string;

    id: number,
    type: string,
    success: boolean,
    method?: string,

    user?: User,
    projects?: ChatSession[],
    folders?: ChatFolder[],

    project?: ChatSession,
    folder?: ChatFolder,

    request?: Request,
    models?: AiModel[],

    error?: Error
}