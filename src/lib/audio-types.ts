export interface AudioSettings {
  mode: "simple" | "custom";
  instrumental: boolean;
  duration: number;
  genre: string;
  tempo: string;
  mood: string;
}

export interface AudioGeneration {
  id: string;
  prompt: string;
  modelId: string;
  audioUrl: string;
  title: string;
  timestamp: Date;
}

export const AUDIO_GENRES = [
  "Поп", "Рок", "Электроника", "Хип-хоп", "Джаз", "Классика", "R&B", "Фолк", "Металл", "Лоу-фай",
];

export const AUDIO_TEMPOS = [
  { value: "slow", label: "Медленный" },
  { value: "medium", label: "Средний" },
  { value: "fast", label: "Быстрый" },
];

export const AUDIO_DURATIONS = [
  { value: 30, label: "30 сек" },
  { value: 60, label: "1 мин" },
  { value: 120, label: "2 мин" },
  { value: 180, label: "3 мин" },
  { value: 240, label: "4 мин" },
];

export const AUDIO_MOODS = [
  "Весёлый", "Грустный", "Энергичный", "Спокойный", "Романтичный", "Агрессивный", "Мечтательный",
];

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  mode: "simple",
  instrumental: false,
  duration: 120,
  genre: "",
  tempo: "medium",
  mood: "",
};

const TRACK_NAMES = [
  "Neon Dreams", "Midnight Echo", "Solar Flare", "Crystal Wave",
  "Urban Pulse", "Velvet Sky", "Digital Rain", "Aurora",
];

export function getRandomTrackName(): string {
  return TRACK_NAMES[Math.floor(Math.random() * TRACK_NAMES.length)];
}
