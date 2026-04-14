import { useNavigate } from "react-router-dom";
import CloverIcon from "@/components/ui/clover-icon";

interface BalancePopupProps {
  onClose: () => void;
  onTopUp: () => void;
}

const stats = [
  { label: "Сегодня", value: 12 },
  { label: "Неделя", value: 85 },
  { label: "Месяц", value: 340 },
];

const costs = [
  { amount: 2, label: "Текст" },
  { amount: 5, label: "Дизайн" },
  { amount: 10, label: "Видео / Аудио" },
];

const BalancePopup = ({ onClose, onTopUp }: BalancePopupProps) => {
  const navigate = useNavigate();

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-border bg-card p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fade-in z-50"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Balance */}
      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <CloverIcon className="h-8 w-8 text-primary" fill="currentColor" />
          <span className="text-4xl font-bold text-foreground leading-none">1 500</span>
        </div>
        <p className="text-xs text-muted-foreground">Доступный баланс</p>
      </div>

      {/* Stats */}
      <div className="flex items-center rounded-xl bg-secondary p-3 mb-4">
        {stats.map((s, i) => (
          <div key={s.label} className={`flex-1 text-center ${i < stats.length - 1 ? "border-r border-border" : ""}`}>
            <div className="flex items-center justify-center gap-1">
              <span className="text-base font-semibold text-foreground">{s.value}</span>
              <CloverIcon className="h-3 w-3 text-primary" fill="currentColor" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Costs */}
      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Стоимость</p>
        <div className="space-y-1">
          {costs.map((c) => (
            <div key={c.label} className="flex items-center gap-2 text-[13px]">
              <CloverIcon className="h-3 w-3 text-primary shrink-0" fill="currentColor" />
              <span className="text-foreground font-medium">{c.amount}</span>
              <span className="text-muted-foreground">— {c.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => {
          onTopUp();
        }}
        className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:brightness-110 transition-all mb-3"
      >
        + Пополнить баланс
      </button>

      {/* Link */}
      <button
        onClick={() => {
          onClose();
          navigate("/tariffs");
        }}
        className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        Перейти к тарифам →
      </button>
    </div>
  );
};

export default BalancePopup;
