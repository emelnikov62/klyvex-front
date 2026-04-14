import { io, Socket } from 'socket.io-client';

class SocketService {
    socket: Socket | null;
    listeners: Map<string, Function[]>;

    constructor() {
        this.socket = null;
        this.listeners = new Map();
    }

    connect(url: string, options: any = {}) {
        if (this.socket) {
            console.warn('Socket already connected');
            return;
        }

        this.socket = io(url, options);

        this.socket.on('connect', () => {
            console.log('Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        this.socket.on('connect_error', (err: any) => {
            console.error('Socket connect error:', err);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    on(eventName: string, callback: Function) {
        if (!this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.on(eventName, callback as any);

        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, []);
        }
        this.listeners.get(eventName)!.push(callback);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    off(eventName: string, callback?: Function) {
        if (this.socket) {
            this.socket.off(eventName, callback as any);
        }

        if (this.listeners.has(eventName)) {
            if (callback) {
                const callbacks = this.listeners.get(eventName)!;
                const index = callbacks.indexOf(callback);
                if (index !== -1) {
                    callbacks.splice(index, 1);
                }
            } else {
                this.listeners.delete(eventName);
            }
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    emit(eventName: string, data: any, callback?: Function) {
        if (!this.socket) {
            console.error('Socket not connected');
            return;
        }

        this.socket.emit(eventName, data, callback as any);
    }

    getSocketId() {
        return this.socket?.id;
    }

    isConnected() {
        return this.socket?.connected || false;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }
}

const socketService = new SocketService();
export default socketService;
