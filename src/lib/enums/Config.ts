const CONFIG = {
    EVENTS: {
        MAIN: {
            SEND: {name: 'send-main-event'},
            RECEIVE: {name: 'receive-main-event'}
        },
        ERROR: {
            RECEIVE: {name: 'receive-error-event'}
        },
        AI: {
            SEND: {name: 'send-ai-event'},
            RECEIVE: {name: 'receive-ai-event'}
        }
    },
    TYPES: {
        MAIN: {
            AUTH: {name: 'auth'},
            REGISTER: {name: 'register'},
            FOLDER: {
                name: 'folder',
                METHODS: {
                    CREATE: {name: 'create'},
                    RENAME: {name: 'rename'},
                    COLOR: {name: 'color'},
                    DELETE: {name: 'delete'}
                }
            },
            PROJECT: {
                name: 'project',
                METHODS: {
                    CREATE: {name: 'create'},
                    MOVE: {name: 'move'},
                    RENAME: {name: 'rename'},
                    DUPLICATE: {name: 'duplicate'},
                    DELETE: {name: 'delete'}
                }
            },
            REQUEST: {
                name: 'request',
                METHODS: {
                    LIST: {name: 'list'},
                    AI: {name: 'ai'}
                }
            },
            DICTIONARY: {name: 'dictionary'},
        },
        AI: {
            TYPES: {
                TEXT: {name: 'text'},
                IMAGE: {name: 'image'},
                VIDEO: {name: 'video'}
            }
        }
    }
} as const;

type Config = typeof CONFIG;

export {CONFIG};
export type {Config};