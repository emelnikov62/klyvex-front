import ScrollReveal from "@/components/ScrollReveal";
import { DollarSign, Columns2, Layers } from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "Экономия",
    description: "Одна подписка вместо 10 сервисов. Платите меньше — получайте больше.",
  },
  {
    icon: Columns2,
    title: "Параллельная работа",
    description: "Сравнивайте результаты двух нейросетей одновременно в split-view режиме.",
  },
  {
    icon: Layers,
    title: "Все форматы",
    description: "Текст, изображения, видео и музыка — всё в одном интерфейсе без переключений.",
  },
];

const LandingBenefits = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Почему <span className="text-primary">KLYVEX.AI</span>?
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Всё, что нужно для работы с AI — в одном месте
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <ScrollReveal key={b.title} delay={i * 0.12}>
              <div className="group rounded-2xl border border-border bg-card p-8 card-hover h-full">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 transition-all group-hover:glow-lime group-hover:bg-primary/20">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingBenefits;
