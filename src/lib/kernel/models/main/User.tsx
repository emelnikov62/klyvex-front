import {ChatFolder, ChatSession} from "@/hooks/use-panel-state";

export interface User {
    id: string,
    email?: string,
    balance: number,
    token: string,
    login: string,
    name?: string,
    password?: string,
    method: string,
    tgId?: string,
    googleId?: string,
    active: boolean,
    created: Date,
    projects: ChatSession[],
    folders: ChatFolder[]

    /* transient */
    ready: boolean
}