import ScrollReveal from "@/components/ScrollReveal";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Бесплатный",
    price: "0 ₽",
    period: "навсегда",
    features: ["5 запросов в день", "3 нейросети", "Базовые модели"],
    cta: "Начать",
    featured: false,
  },
  {
    name: "Про",
    price: "990 ₽",
    period: "/ мес",
    features: ["Безлимитные запросы", "Все нейросети", "Приоритетная очередь", "Параллельный режим"],
    cta: "Выбрать Про",
    featured: true,
  },
  {
    name: "Бизнес",
    price: "2 990 ₽",
    period: "/ мес",
    features: ["Всё из Про", "API-доступ", "Командная работа", "Персональный менеджер"],
    cta: "Связаться",
    featured: false,
  },
];

const LandingPricing = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 relative">
      {/* Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-4">
              Простые <span className="text-primary">тарифы</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Начните бесплатно — масштабируйтесь, когда будете готовы
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.name} delay={i * 0.12}>
              <div
                className={`relative rounded-2xl border p-7 h-full flex flex-col card-hover ${
                  plan.featured
                    ? "border-primary/50 bg-primary/[0.06] shadow-[0_0_40px_hsl(73_100%_50%/0.08)]"
                    : "border-border bg-card"
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1">
                    <span className="text-[11px] font-bold text-primary-foreground uppercase tracking-wider">Популярный</span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-foreground">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/tariffs")}
                  className={`w-full h-11 rounded-xl font-semibold text-sm transition-all ${
                    plan.featured
                      ? "bg-primary text-primary-foreground glow-lime hover:bg-primary/90"
                      : "border border-primary/30 text-foreground hover:border-primary hover:bg-primary/10"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingPricing;
