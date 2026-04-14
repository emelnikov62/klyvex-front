import ScrollReveal from "@/components/ScrollReveal";
import { MousePointerClick, PenLine, Download } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: MousePointerClick,
    title: "Выберите нейросеть",
    description: "Откройте каталог и выберите подходящий AI-инструмент для вашей задачи.",
  },
  {
    num: "02",
    icon: PenLine,
    title: "Введите промт",
    description: "Опишите, что вам нужно — текстом, голосом или загрузив файл.",
  },
  {
    num: "03",
    icon: Download,
    title: "Получите результат",
    description: "Скачайте, сохраните или продолжите работу с результатом прямо в платформе.",
  },
];

const LandingHowItWorks = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Как это <span className="text-primary">работает</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Три простых шага до результата
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
          {/* Connector line (desktop) */}
          <div className="hidden md:block absolute top-[3.5rem] left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-border via-primary/30 to-border" />

          {steps.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 0.15}>
              <div className="relative rounded-2xl border border-border bg-card p-8 text-center card-hover">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <step.icon className="h-7 w-7 text-primary icon-glow" />
                </div>
                <span className="inline-block text-xs font-bold text-primary mb-2 tracking-widest">{step.num}</span>
                <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingHowItWorks;
