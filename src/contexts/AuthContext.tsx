import {User} from "@/lib/kernel/models/main/User";
import {createContext, ReactNode, useCallback, useContext, useState} from "react";
import {useDispatch} from "react-redux";
import {off} from "@/lib/slices/socketContexttSlice";
import {CONFIG} from "@/lib/enums/Config";
import {toast} from "sonner";
import {Response} from '@/lib/kernel/models/responses/Response';
import {AiModel} from "@/lib/kernel/models/main/AiModel";
import {AUTH_TYPE} from "@/lib/enums/AuthTypes";
import messageService, {MessageContext} from "@/lib/service/MessageService";
import {ChatMessage, ChatSession} from "@/hooks/use-panel-state";


interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    lockEvents: boolean;
    listModels: AiModel[] | null;
    login: (payload: User) => Promise<void>;
    register: (payload: User) => Promise<void>;
    logout: (payload: User) => void;
    updateProjectMessages: (projectId: number, messages: ChatMessage[]) => void;
    addProject: (project: ChatSession) => void;
    replaceProjectId: (tempId: number, realId: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};

export const AuthProvider = ({children}: { children: ReactNode }) => {
    const initUserFromStorage = () => {
        try {
            const data = localStorage.getItem('klyvex');
            if (!data) {
                return null;
            }

            const dataJson: User = JSON.parse(data);

            if (!dataJson) {
                return null;
            }

            setTimeout(() => {
                sendAuth({
                    id: dataJson.method == AUTH_TYPE.GOOGLE ? dataJson.googleId : dataJson.id,
                    method: dataJson.method,
                    password: dataJson.password,
                    login: dataJson.login
                } as User);
            }, 100);
        } catch (e) {
            console.log(e);
        }

        return null;
    }

    const saveToStorage = (data: any) => {
        localStorage.setItem('klyvex', JSON.stringify(data));
    }

    const clearStorage = () => {
        localStorage.removeItem('klyvex');
    }

    const responseProcess = (data: Response) => {
        if (data.error) {
            toast.warning(data.error.message, {position: 'top-right'});
            setLockEvents(false);
            return;
        }

        if (data.success) {
            setListModels(data.models);
            saveToStorage(data.user);
            setUser({...data.user, ready: true, projects: data.projects, folders: data.folders});
        } else {
            setUser(null);
            clearStorage();
            toast.warning(data.error.message, {position: 'top-right'});
        }
    }

    const sendAuth = (payload: User) => {
        setLockEvents(true);

        messageService.send(
            dispatch,
            {
                id: payload.id,
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                receiveEvent: CONFIG.EVENTS.MAIN.RECEIVE.name,
                useTimeout: true,
                request: {
                    key: `req-${Date.now()}-${payload.id}`,
                    id: payload.id,
                    type: CONFIG.TYPES.MAIN.AUTH.name,
                    auth: {id: payload.id, login: payload.login, method: payload.method, password: payload.password}
                },
                callback: (response: Response) => responseProcess(response)
            } as MessageContext
        );
    }

    const sendRegister = (payload: User) => {
        setLockEvents(true);

        messageService.send(
            dispatch,
            {
                id: payload.id,
                sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                receiveEvent: CONFIG.EVENTS.MAIN.RECEIVE.name,
                useTimeout: true,
                request: {
                    key: `req-${Date.now()}-${payload.id}`,
                    id: payload.id,
                    type: CONFIG.TYPES.MAIN.REGISTER.name,
                    auth: {id: payload.id, email: payload.email, login: payload.email, password: payload.password}
                },
                callback: (response: Response) => responseProcess(response)
            } as MessageContext
        );
    }

    const dispatch = useDispatch();
    const [user, setUser] = useState<User | null>(initUserFromStorage);
    const [listModels, setListModels] = useState<AiModel[] | null>(null);
    const [lockEvents, setLockEvents] = useState(false);

    const login = useCallback(async (payload: User) => {
        sendAuth(payload);
    }, []);

    const register = useCallback(async (payload: User) => {
        sendRegister(payload);
    }, []);

    const logout = useCallback((payload: User) => {
        dispatch(off(`${CONFIG.EVENTS.MAIN.RECEIVE.name}-${payload.id}`));
        dispatch(off(`${CONFIG.EVENTS.AI.RECEIVE.name}-${payload.id}`));

        setUser(null);
        setLockEvents(false);
        clearStorage();
    }, []);

    // Update messages in a specific project
    const updateProjectMessages = useCallback((projectId: number, messages: ChatMessage[]) => {
        setUser(prevUser => {
            if (!prevUser) return prevUser;
            return {
                ...prevUser,
                projects: prevUser.projects.map(p =>
                    p.id === projectId ? {...p, messages} : p
                )
            };
        });
    }, []);

    // Add new project to user.projects
    const addProject = useCallback((project: ChatSession) => {
        setUser(prevUser => {
            if (!prevUser) return prevUser;
            return {
                ...prevUser,
                projects: [...(prevUser.projects || []), project]
            };
        });
    }, []);

    // Replace temporary project ID with real one from server
    const replaceProjectId = useCallback((tempId: number, realId: number) => {
        setUser(prevUser => {
            if (!prevUser) return prevUser;
            return {
                ...prevUser,
                projects: prevUser.projects.map(p =>
                    p.id === tempId ? {...p, id: realId} : p
                )
            };
        });
    }, []);

    return (
        <AuthContext.Provider
            value={{user, isAuthenticated: !!user, listModels, lockEvents, login, register, logout, updateProjectMessages, addProject, replaceProjectId}}>
            {children}
        </AuthContext.Provider>
    );
};

