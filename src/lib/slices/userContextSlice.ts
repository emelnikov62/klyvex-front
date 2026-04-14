import { createSlice } from '@reduxjs/toolkit';

function loadFromStorage() {
    try {
        var obj = localStorage.getItem('klyvex');
        if (obj != undefined) {
            return { user: { ...JSON.parse(obj), ready: false } };
        }

        return { user: undefined };
    } catch (e) {
        console.log(e);
        return { user: undefined };
    }
}

const userContextSlice = createSlice({
    name: 'userContext',
    initialState: loadFromStorage(),
    reducers: {
        setUser: (state, action) => {
            state.user = action.payload;
            localStorage.setItem('klyvex', JSON.stringify(state.user));
        },
        clearUser: (state) => {
            state.user = undefined;
            localStorage.removeItem('klyvex');
        },
    },
});

export const { setUser, clearUser } = userContextSlice.actions;
export default userContextSlice.reducer;
