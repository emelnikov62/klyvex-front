export interface StyleRef {
    name?: string;     // Имя файла (например: "photo.png")
    url: string;      // Object URL для превью
    base64?: string;  // Base64 для отправки на сервер
}

export interface DesignSettings {
    aspectRatio: string;
    rawMode: boolean;
    turboMode: boolean;
    chaos: number;
    stylize: number;
    weird: number;
    negativePrompt: string;
    styleRefs: StyleRef[];
    characterRefs: StyleRef[];
    quality: string;
}

export const QUALITY_OPTIONS = [
    {value: "1K", label: "1K"},
    {value: "2K", label: "2K"},
    {value: "4K", label: "4K", subtitle: "Максимальное качество"},
];

export const ASPECT_RATIOS = [
    {value: "1:1", label: "1:1 Square"},
    {value: "3:4", label: "3:4 Portrait"},
    {value: "4:3", label: "4:3 Landscape"},
    {value: "4:5", label: "4:5 Portrait"},
    {value: "2:3", label: "2:3 Portrait"},
    {value: "9:16", label: "9:16 Portrait"},
    {value: "16:9", label: "16:9 Landscape"},
    {value: "21:9", label: "21:9 Ultra Wide"},
];

// Placeholder image URLs for mock generations
const MOCK_IMAGES = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1634017839464-5c339afa1c94?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1633421500060-4dd24e594e93?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1618172193622-ae2d025f4032?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1614851099511-773084f6911d?w=512&h=512&fit=crop",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=512&h=512&fit=crop",
];

export function getRandomMockImages(count: number = 4): string[] {
    const shuffled = [...MOCK_IMAGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

export const DEFAULT_DESIGN_SETTINGS: DesignSettings = {
    aspectRatio: "1:1",
    rawMode: false,
    turboMode: false,
    chaos: 0,
    stylize: 100,
    weird: 0,
    negativePrompt: "",
    styleRefs: [],
    characterRefs: [],
    quality: "1K",
};
