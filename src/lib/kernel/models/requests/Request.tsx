import {AuthRequest} from "@/lib/kernel/models/requests/auth/AuthRequest.tsx";
import {AiRequest} from "@/lib/kernel/models/requests/ai/AiRequest.tsx";
import {UserRequest} from "@/lib/kernel/models/requests/UserRequest.tsx";
import {ProjectRequest} from "@/lib/kernel/models/requests/project/ProjectRequest.tsx";
import {FolderRequest} from "@/lib/kernel/models/requests/folder/FolderRequest.tsx";
import {PayRequest} from "@/lib/kernel/models/requests/pay/PayRequest.tsx";

export interface Request {
    id?: string;
    type: string;
    key: string;

    auth?: AuthRequest;
    request?: AiRequest;
    user?: UserRequest;
    project?: ProjectRequest;
    folder?: FolderRequest;
    pay?: PayRequest;

}