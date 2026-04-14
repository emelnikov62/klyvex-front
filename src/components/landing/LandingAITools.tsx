import ScrollReveal from "@/components/ScrollReveal";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Sparkles,
  Brain,
  Image,
  Banana,
  Film,
  Clapperboard,
  Video,
  Music,
} from "lucide-react";

const categories = [
  {
    label: "Текст",
    tools: [
      { name: "ChatGPT 5.2", icon: MessageSquare, desc: "Генерация текста и кода" },
      { name: "Gemini", icon: Sparkles, desc: "Мультимодальный ИИ от Google" },
      { name: "Claude", icon: Brain, desc: "Глубокий анализ и рассуждение" },
    ],
  },
  {
    label: "Дизайн",
    tools: [
      { name: "Midjourney", icon: Image, desc: "Фотореалистичные изображения" },
      { name: "NanoBanana Pro", icon: Banana, desc: "Быстрая генерация артов" },
    ],
  },
  {
    label: "Видео",
    tools: [
      { name: "Kling", icon: Film, desc: "Видео из текста и изображений" },
      { name: "RunWay", icon: Clapperboard, desc: "Профессиональный видеомонтаж" },
      { name: "Sora 2", icon: Video, desc: "Реалистичное видео от OpenAI" },
    ],
  },
  {
    label: "Аудио",
    tools: [
      { name: "Suno V5", icon: Music, desc: "Создание музыки и песен" },
    ],
  },
];

const LandingAITools = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Доступные <span className="text-primary">нейросети</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              От текста до музыки — работайте с лучшими моделями мира
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-10">
          {categories.map((cat, ci) => (
            <ScrollReveal key={cat.label} delay={ci * 0.08}>
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">{cat.label}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.tools.map((tool, ti) => (
                    <motion.div
                      key={tool.name}
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 cursor-pointer card-hover"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
                        <tool.icon className="h-5 w-5 text-primary icon-glow" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-foreground text-sm">{tool.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingAITools;
