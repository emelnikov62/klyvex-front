import CloverSlider from "@/components/tariffs/CloverSlider";
import {Check, Shield, Users, Zap} from "lucide-react";
import CloverIcon from "@/components/ui/clover-icon";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger,} from "@/components/ui/accordion";
import messageService, {MessageContext} from "@/lib/service/MessageService.ts";
import {CONFIG} from "@/lib/enums/Config.ts";
import {Response} from "@/lib/kernel/models/responses/Response.tsx";
import {toast} from "sonner";
import {useDispatch} from "react-redux";
import {useAuth} from "@/contexts/AuthContext.tsx";

const plans = [
    {
        name: "Бесплатный",
        price: "0",
        period: "₽/мес",
        tokens: "50 токенов в месяц",
        features: [
            "ChatGPT 5.2, Gemini, Claude (текст)",
            "Только текстовые модели",
            "1 рабочая область",
            "100 МБ хранилище",
        ],
        cta: "Текущий план",
        featured: false,
        current: true,
    },
    {
        name: "Про",
        price: "1 490",
        period: "₽/мес",
        tokens: "500 токенов в месяц",
        features: [
            "Все модели: текст, дизайн, видео, аудио",
            "2 рабочие области",
            "10 ГБ хранилище",
            "Приоритетная генерация",
        ],
        cta: "Выбрать",
        featured: true,
        current: false,
    },
    {
        name: "Бизнес",
        price: "4 990",
        period: "₽/мес",
        tokens: "2 000 токенов в месяц",
        features: [
            "Все модели + ранний доступ к новым",
            "2 рабочие области",
            "100 ГБ хранилище",
            "Приоритетная генерация",
            "Командный доступ (до 5 пользователей)",
            "API-доступ",
        ],
        cta: "Выбрать",
        featured: false,
        current: false,
    },
];


const faqItems = [
    {
        q: "Как работают токены?",
        a: "Каждая генерация расходует определённое количество токенов. Текстовые запросы стоят 1–3 токена, генерация изображений — 5–8, видео — 10–20, аудио — 10. Токены начисляются ежемесячно в рамках вашего тарифа.",
    },
    {
        q: "Можно ли перенести неиспользованные токены?",
        a: "Неиспользованные токены не переносятся на следующий месяц. Они обновляются в дату продления подписки. Докупленные токены действуют бессрочно.",
    },
    {
        q: "Как докупить токены?",
        a: "Вы можете приобрести дополнительные пакеты токенов в разделе «Докупить токены» на этой странице. Докупленные токены не сгорают и используются после исчерпания основного лимита.",
    },
    {
        q: "Как отменить подписку?",
        a: "Перейдите в настройки аккаунта → Подписка → Отменить. Вы сохраните доступ до конца оплаченного периода. Все созданные материалы останутся в хранилище.",
    },
];

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    "Приоритетная генерация": Zap,
    "API-доступ": Shield,
    "Командный доступ (до 5 пользователей)": Users,
};

const Tariffs = () => {
    const dispatch = useDispatch();
    const {user} = useAuth();

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-background">
            <div className="container mx-auto px-4 md:px-6 py-8 md:py-16 max-w-5xl">
                {/* Header */}
                <div className="text-center mb-8 md:mb-14">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
                        Выберите свой <span className="text-primary">план</span>
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Оплачивайте только то, что используете
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-12 md:mb-20">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                                plan.featured
                                    ? "border-primary/50 bg-primary/[0.04] shadow-[0_0_40px_hsl(var(--primary)/0.08)]"
                                    : "border-border bg-card"
                            }`}
                        >
                            {plan.featured && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1">
                  <span className="text-[11px] font-bold text-primary-foreground uppercase tracking-wider">
                    Популярный
                  </span>
                                </div>
                            )}

                            <div className="mb-5">
                                <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-foreground">{plan.price}</span>
                                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                                <CloverIcon className="h-4 w-4 text-primary shrink-0" fill="currentColor"/>
                                <span className="text-sm font-semibold text-primary">{plan.tokens}</span>
                            </div>

                            <ul className="space-y-3 mb-6 flex-1">
                                {plan.features.map((f) => {
                                    const Icon = FEATURE_ICONS[f];
                                    return (
                                        <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                                            {Icon ? (
                                                <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5"/>
                                            ) : (
                                                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5"/>
                                            )}
                                            {f}
                                        </li>
                                    );
                                })}
                            </ul>

                            <button
                                disabled={plan.current}
                                className={`w-full h-11 rounded-xl font-semibold text-sm transition-all ${
                                    plan.current
                                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                                        : plan.featured
                                            ? "bg-primary text-primary-foreground glow-lime hover:bg-primary/90"
                                            : "border border-primary/30 text-foreground hover:border-primary hover:bg-primary/10"
                                }`}
                            >
                                {plan.cta}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Clover slider */}
                <CloverSlider onTopUp={(amount, total) => {
                    if (!user) return;
                    messageService.send(
                        dispatch,
                        {
                            sendEvent: CONFIG.EVENTS.MAIN.SEND.name,
                            request: {
                                key: `pc-${Date.now()}-${user.id}`,
                                id: user.id,
                                type: CONFIG.TYPES.MAIN.PAY.name,
                                pay: {
                                    method: CONFIG.TYPES.MAIN.PAY.METHODS.CREATE.name,
                                    amount: total,
                                    description: `Покупка клеверов на сумму: ${total} ₽`
                                },
                                user: {id: user.id}
                            },
                            useTimeout: false,
                            callback: (response: Response) => {
                                if (response.error || response?.pay?.errorCode != 0) {
                                    toast.warning(response.error.message, {position: 'top-right'});
                                } else {
                                    if (response.success) {
                                        /*const width = 860;
                                        const height = 500;
                                        const left = (screen.width / 2) - (width / 2);
                                        const top = (screen.height / 2) - (height / 2);
                                        const windowOptions = `menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=${width}, height=${height}, top=${top}, left=${left}`;
                                        const type = 'auth';
                                        window.open(response.pay.paymentUrl, type, windowOptions);*/
                                        location.href = response.pay.paymentUrl;
                                    }
                                }
                            }
                        } as MessageContext);
                }}/>

                {/* FAQ */}
                <div className="max-w-2xl mx-auto">
                    <h2 className="text-2xl font-bold text-foreground text-center mb-8">
                        Частые <span className="text-primary">вопросы</span>
                    </h2>
                    <Accordion type="single" collapsible className="space-y-2">
                        {faqItems.map((item, i) => (
                            <AccordionItem
                                key={i}
                                value={`faq-${i}`}
                                className="rounded-xl border border-border bg-card px-5 data-[state=open]:border-primary/20"
                            >
                                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
                                    {item.q}
                                </AccordionTrigger>
                                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                                    {item.a}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </div>
    );
};

export default Tariffs;
