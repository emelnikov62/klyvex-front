import { useState, useRef, useEffect } from "react";
import { X, Play, Zap, Settings, Send, Sparkles, Bot, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const quickCommands = [
  {
    icon: Play,
    label: "Создать видео",
    description: "Переключиться на Видео-таб",
    action: "video",
  },
  {
    icon: Zap,
    label: "Пополнить баланс",
    description: "Перейти к тарифам",
    action: "tariffs",
  },
  {
    icon: Settings,
    label: "Настройки нейросети",
    description: "Открыть параметры модели",
    action: "settings",
  },
];

// Simple local responses for platform questions
const LOCAL_RESPONSES: Record<string, string> = {
  "токен": "**Как работают токены 🍀**\n\nКаждая генерация расходует токены:\n- Текст: 1–3\n- Дизайн: 5–8\n- Видео: 10–20\n- Аудио: 10\n\nТокены начисляются ежемесячно по тарифу. Можно докупить пакеты на странице **Тарифы**.",
  "тариф": "**Тарифы KLYVEX.AI**\n\n- **Бесплатный**: 50/мес, текстовые модели\n- **Про**: 1 490 ₽/мес, 500 токенов, все модели\n- **Бизнес**: 4 990 ₽/мес, 2 000 токенов, API, команда\n\nПерейдите на страницу **Тарифы** для подробностей.",
  "промт": "**Советы по промтам**\n\n1. Будьте конкретны — описывайте детали\n2. Укажите стиль, настроение, цвета\n3. Используйте негативные промты для исключения\n4. Экспериментируйте с параметрами модели\n\nПример: *\"Futuristic city, neon lights, rain, cinematic, 8k\"*",
  "модел": "**Доступные модели**\n\n**Текст:** ChatGPT 5.2, Gemini, Claude\n**Дизайн:** Midjourney, NanoBanana Pro\n**Видео:** Kling, RunWay, Sora 2\n**Аудио:** Suno V5\n\nКаждая модель имеет уникальные настройки в панели параметров.",
  "помо": "Я — ваш AI-ассистент KLYVEX.AI. Могу помочь с:\n\n- 📝 Формулировкой промтов\n- ⚙️ Настройкой моделей\n- 💰 Вопросами о тарифах\n- 🔧 Решением проблем\n\nПросто задайте вопрос!",
};

function getLocalResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(LOCAL_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  return "Я — ассистент KLYVEX.AI. Могу помочь с вопросами о платформе, промтах, настройках моделей и тарифах. Задайте конкретный вопрос, и я постараюсь помочь! 😊";
}

interface AssistantPanelProps {
  open: boolean;
  onClose: () => void;
  onQuickAction?: (action: string) => void;
}

const AssistantPanel = ({ open, onClose, onQuickAction }: AssistantPanelProps) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuickAction = (action: string) => {
    if (action === "tariffs") {
      navigate("/tariffs");
      onClose();
    } else if (action === "video" || action === "settings") {
      onQuickAction?.(action);
      onClose();
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate response
    setTimeout(() => {
      const response = getLocalResponse(text);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 z-[70] h-screen w-[400px] max-w-[90vw] bg-card border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-bold text-foreground">Ассистент</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick commands (shown when no messages) */}
        {messages.length === 0 && (
          <div className="px-5 py-4 space-y-2 border-b border-border shrink-0">
            {quickCommands.map((cmd) => (
              <button
                key={cmd.action}
                onClick={() => handleQuickAction(cmd.action)}
                className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left hover:border-primary/20 hover:bg-primary/[0.03] transition-all group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0 group-hover:shadow-[0_0_8px_hsl(var(--primary)/0.15)]">
                  <cmd.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{cmd.label}</p>
                  <p className="text-[11px] text-muted-foreground">{cmd.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0 [&_strong]:text-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 border border-primary/30 shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="rounded-2xl rounded-bl-md bg-muted px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 focus-within:border-primary/40 transition-colors">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Спросите что-нибудь..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-30 hover:bg-primary/90 transition-all"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AssistantPanel;
