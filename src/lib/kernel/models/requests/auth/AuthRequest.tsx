export interface AuthRequest {
    id: string;
    login: string;
    name?: string;
    password?: string;
    method?: string;
}