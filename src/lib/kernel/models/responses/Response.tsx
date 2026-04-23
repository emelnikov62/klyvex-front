import {User} from "../main/User";
import {AiModel} from "../main/AiModel";
import {Error} from "../main/Error";
import {Request} from "../main/Request";
import {ChatFolder, ChatSession} from "@/hooks/use-panel-state";
import {PayResponse} from "@/lib/kernel/models/responses/PayResponse.tsx";

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

    pay?: PayResponse,

    error?: Error
}