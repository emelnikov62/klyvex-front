import { createSlice } from '@reduxjs/toolkit';
import { CONFIG } from '../enums/Config';
import { AiModel } from '../kernel/models/main/AiModel';
import { Session } from '../kernel/models/main/Session';
import { Request } from '../kernel/models/main/Request';

const sessionContextSlice = createSlice({
    name: 'sessionContext',
    initialState: {
        active: null as Session,
        list: [] as Request[],
        response: {
            image: null,
            text: null,
            video: null
        },
        models: [] as AiModel[]
    },
    reducers: {
        setActive: (state, action) => {
            state.active = action.payload;
        },
        setList: (state, action) => {
            if (state.list.length == 0) {
                state.list = action.payload;
            } else {
                if (action.payload.length == 0) {
                    state.list = [];
                } else {
                    state.list = state.list.concat(action.payload);
                }
            }
        },
        setRequestResponse: (state, action) => {
            switch (action.payload.context.type) {
                case CONFIG.TYPES.AI.TYPES.TEXT.name:
                    if (action.payload.context.answer) {
                        state.response.text = {
                            id: action.payload.context.id,
                            text: action.payload.context.answer,
                            isUser: false,
                            context: action.payload.context
                        };
                    }
                    break;
                case CONFIG.TYPES.AI.TYPES.IMAGE.name:
                    if (action.payload.context.images) {
                        state.response.image = action.payload.context;
                    }
                    break;
            }

            state.list = ([{
                id: action.payload.context?.id,
                context: {
                    type: action.payload.context.type,
                    answer: action.payload.context.text!,
                    prompt: action.payload.context.prompt,
                    images: action.payload.context.images!,
                    model: action.payload.context.model ?? ''
                },
                date: action.payload.date
            }] as any[]).concat(state.list);
        },
        setModels: (state, action) => {
            state.models = action.payload;
        },
        clearRequestResponse: (state, action) => {
            switch (action.payload.context.type) {
                case CONFIG.TYPES.AI.TYPES.TEXT.name:
                    state.response.text = null;
                    break;
                case CONFIG.TYPES.AI.TYPES.IMAGE.name:
                    state.response.image = null;
                    break;
            }
        }
    },
});

export const { setActive, setList, setRequestResponse, clearRequestResponse, setModels } = sessionContextSlice.actions;
export default sessionContextSlice.reducer;
