import {Dispatch} from '@reduxjs/toolkit';
import {emit, off, on} from '../slices/socketContexttSlice';
import {toast} from 'sonner';
import {Response} from '../kernel/models/responses/Response';
import {Request} from '../kernel/models/requests/Request';
import {CONFIG} from "@/lib/enums/Config.ts";
import {STATUSES} from "@/lib/enums/RequestStatus.ts";

export interface MessageContext {
    id?: string;
    sendEvent: string;
    receiveEvent?: string;
    useTimeout: boolean;
    request: Request;
    callback: (response: Response) => void; // Явная типизация
}

class MessageService {
    private callbacks: Map<string, (response: Response) => void>; // Явная типизация

    constructor() {
        this.callbacks = new Map();
    }

    send(dispatch: Dispatch, context: MessageContext) {
        if (!dispatch) {
            toast.warning('Сервис временно недоступен', {position: 'top-right'});
            return;
        }

        if (CONFIG.TYPES.MAIN.AUTH.name == context.request.type || CONFIG.TYPES.MAIN.REGISTER.name == context.request.type) {
            this.sendAuth(dispatch, context);
        } else {
            this.sendCommon(dispatch, context);
        }
    }

    private sendCommon(dispatch: Dispatch, context: MessageContext) {
        this.callbacks.set(context.request.key, context.callback);
        dispatch(emit({eventName: context.sendEvent, data: context.request}));
    }

    private sendAuth(dispatch: Dispatch, context: MessageContext) {
        const receiveEvent = `${context.receiveEvent}-${context.id}`;
        const idTimeout = context.useTimeout ? this.setupTimeout(context) : null;

        dispatch(on({
            eventName: receiveEvent,
            callback: (response: Response) => {
                if (idTimeout) clearTimeout(idTimeout);
                context.callback(response);
                dispatch(off(receiveEvent));
                this.startReceivers(dispatch, response.user.id);
            }
        }));

        dispatch(emit({eventName: context.sendEvent, data: context.request}));
    }

    private setupTimeout(context: MessageContext): NodeJS.Timeout {
        return setTimeout(() => {
            context.callback({error: {message: 'Cервис временно недоступен'}} as Response);
        }, 5000);
    }

    private startReceivers(dispatch: Dispatch, id: string) {
        const events = [`${CONFIG.EVENTS.MAIN.RECEIVE.name}-${id}`, `${CONFIG.EVENTS.AI.RECEIVE.name}-${id}`];

        events.forEach(event => {
            dispatch(on({
                eventName: event,
                callback: (response: Response) => this.handleResponse(response)
            }));
        });
    }

    private handleResponse(response: Response) {
        if (response.request?.status === STATUSES.ACTIVE) return;

        const callback = this.callbacks.get(response.key);
        if (callback) {
            callback(response);
            this.callbacks.delete(response.key);
        }
    }
}

const messageService = new MessageService();
export default messageService;