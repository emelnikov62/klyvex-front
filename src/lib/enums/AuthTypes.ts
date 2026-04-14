const AUTH_TYPE = {
    TG: 'tg',
    GOOGLE: 'google',
    EMAIL: 'email'
} as const;

type AuthType = (typeof AUTH_TYPE)[keyof typeof AUTH_TYPE];

export { AUTH_TYPE };
export type { AuthType };