const STATUSES = {
    ACTIVE: 'active',
    FINISHED: 'finished'
};

type Statuses = (typeof STATUSES)[keyof typeof STATUSES];

export {STATUSES};
export type {Statuses};