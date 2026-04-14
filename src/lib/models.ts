import { Sparkles, Clapperboard, Music, Type, type LucideProps, Brain, MessageSquare, Banana, Image, Film, Video } from "lucide-react";
import { AiModel, TabType } from "./kernel/models/main/AiModel";


export const TAB_CONFIG: { id: TabType; label: string; icon: React.ForwardRefExoticComponent<Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>> }[] = [
  { id: "text", label: "Текст", icon: Type },
  { id: "image", label: "Дизайн", icon: Sparkles },
  { id: "video", label: "Видео", icon: Clapperboard },
  { id: "audio", label: "Аудио", icon: Music }
];

export function getModelsForTab(tab: TabType, models: AiModel[]): AiModel[] {
  if (!models) {
    return [];
  }

  return models.filter((m) => m.type === tab);
}

export function getDefaultModel(tab: TabType, models: AiModel[]): AiModel {
  return getModelsForTab(tab, models)[0];
}

export function getModelIcon(icon: string) {
  if (!icon) {
    return null;
  }

  switch (icon) {
    case 'Music':
      return Music;
    case 'Brain':
      return Brain;
    case 'MessageSquare':
      return MessageSquare;
    case 'Sparkles':
      return Sparkles;
    case 'Banana':
      return Banana;
    case 'Image':
      return Image;
    case 'Film':
      return Film;
    case 'Clapperboard':
      return Clapperboard;
    case 'Video':
      return Video;
    default:
      return Sparkles;
  }
}
