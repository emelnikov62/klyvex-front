
export type TabType = "text" | "image" | "video" | "audio";

export interface AiModel {
    id: number;
    key: string;
    name: string;
    icon: string;
    description: string;
    type: TabType;
    cost: number;
}