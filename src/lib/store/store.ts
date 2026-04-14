import { configureStore } from '@reduxjs/toolkit';
import userContextSlice from '.././slices/userContextSlice';
import socketSlice from '../slices/socketContexttSlice';
import sessionContextSlice from '.././slices/sessionContextSlice';

export const store = configureStore({
    reducer: {
        userContext: userContextSlice,
        socketContext: socketSlice,
        sessionContext: sessionContextSlice
    }
});

// Экспортируем типы для типизации (если используется TypeScript)
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;