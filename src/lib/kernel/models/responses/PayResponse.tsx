export interface PayResponse {
    id?: number;
    paymentUrl?: string;
    paymentId?: number;
    status?: string;
    success?: boolean;
    errorCode?: number;
}