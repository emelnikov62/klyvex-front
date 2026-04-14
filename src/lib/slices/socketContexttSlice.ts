import {createSlice} from '@reduxjs/toolkit';
import socketService from '../service/SocketService';

const initConnection = () => {
    socketService.connect('https://klyvex-test.ai:8443');
    // socketService.connect('https://klyvex.ai:8443');
    // socketService.connect('http://192.168.1.105:8440')
    return socketService.getSocketId();
};

const socketSlice = createSlice({
    name: 'socketContext',
    initialState: {
        value: initConnection(),
    },
    reducers: {
        on: (state, action) => {
            socketService.on(action.payload.eventName, action.payload.callback);
        },
        off: (state, action) => {
            socketService.off(action.payload, null);
        },
        emit: (state, action) => {
            socketService.emit(action.payload.eventName, action.payload.data, action.payload.callback);
        },
        disconnect: (state) => {
            socketService.disconnect();
            state.value = undefined;
        }
    }
});

// Экспорт действий (actions)
export const {on, off, emit, disconnect} = socketSlice.actions;

// Экспорт редуктора
export default socketSlice.reducer;