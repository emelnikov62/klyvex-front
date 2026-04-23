import { useState, useEffect, useRef } from "react";
import CloverIcon from "@/components/ui/clover-icon";

const STEPS = [
  { amount: 100, pricePerUnit: 2.99, total: 299, discount: 0 },
  { amount: 300, pricePerUnit: 2.66, total: 799, discount: 11 },
  { amount: 500, pricePerUnit: 2.40, total: 1199, discount: 20 },
  { amount: 1000, pricePerUnit: 2.00, total: 1999, discount: 33 },
  { amount: 3000, pricePerUnit: 1.66, total: 4999, discount: 44 },
  { amount: 5000, pricePerUnit: 1.40, total: 6999, discount: 53 },
];

const LABELS = ["100", "300", "500", "1К", "3К", "5К"];

interface TopUpModalProps {
  open: boolean;
  onClose: () => void;
  onTopUp?: (amount: number, total: number) => void;
}

const TopUpModal = ({ open, onClose, onTopUp }: TopUpModalProps) => {
  const [stepIndex, setStepIndex] = useState(2);
  const [animateDiscount, setAnimateDiscount] = useState(false);
  const prevIndex = useRef(stepIndex);
  const current = STEPS[stepIndex];

  useEffect(() => {
    if (prevIndex.current !== stepIndex) {
      setAnimateDiscount(true);
      const t = setTimeout(() => setAnimateDiscount(false), 200);
      prevIndex.current = stepIndex;
      return () => clearTimeout(t);
    }
  }, [stepIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const fillPercent = (stepIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-scale-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-foreground mb-6 text-center">
          Пополнить <span className="text-primary">клеверы</span>
        </h2>

        {/* Amount display */}
        <div className="text-center mb-6">
          <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-medium">
            Количество клеверов
          </p>
          <div className="flex items-center justify-center gap-2">
            <CloverIcon className="h-7 w-7 text-primary" fill="currentColor" />
            <span className="text-[32px] font-black text-primary leading-none">
              {current.amount.toLocaleString("ru-RU")}
            </span>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <div className="relative h-2 rounded-full bg-secondary">
            <div
              className="absolute h-full rounded-full"
              style={{
                width: `${fillPercent}%`,
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(73 80% 45%))",
              }}
            />
            <input
              type="range"
              min={0}
              max={STEPS.length - 1}
              step={1}
              value={stepIndex}
              onChange={(e) => setStepIndex(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary border-2 border-background shadow-md pointer-events-none transition-[left] duration-150 ease-out"
              style={{ left: `calc(${fillPercent}% - 10px)` }}
            />
          </div>

          <div className="flex justify-between mt-2.5">
            {LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => setStepIndex(i)}
                className={`text-[11px] font-medium transition-colors cursor-pointer ${
                  i === stepIndex ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Price block */}
        <div className="text-center mb-6 space-y-1.5">
          <p className="text-[28px] font-bold text-foreground leading-tight">
            {current.total.toLocaleString("ru-RU")} ₽
          </p>
          <p className="text-[13px] text-muted-foreground">
            {current.pricePerUnit.toFixed(2).replace(".", ",")} ₽ за клевер
          </p>
          {current.discount > 0 && (
            <span
              className={`inline-block text-xs font-semibold text-primary bg-primary/15 rounded-md px-2.5 py-1 transition-transform duration-200 ${
                animateDiscount ? "scale-110" : "scale-100"
              }`}
            >
              -{current.discount}%
            </span>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={() => onTopUp?.(current.amount, current.total)}
          className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm glow-lime hover:bg-primary/90 transition-all"
        >
          Пополнить за {current.total.toLocaleString("ru-RU")} ₽
        </button>
      </div>
    </div>
  );
};

export default TopUpModal;
