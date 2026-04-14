import { useState, useRef, useEffect, useCallback } from "react";
import { Settings, X, RefreshCw } from "lucide-react";
import { AUDIO_GENRES, AUDIO_TEMPOS, AUDIO_DURATIONS, AUDIO_MOODS, DEFAULT_AUDIO_SETTINGS, type AudioSettings } from "@/lib/audio-types";
import MobileBottomSheet from "@/components/ui/mobile-bottom-sheet";

interface AudioParamsBarProps {
  settings: AudioSettings;
  onSettingsChange: (s: AudioSettings) => void;
  isMobile?: boolean;
}

const AudioParamsBar = ({ settings, onSettingsChange, isMobile }: AudioParamsBarProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open || isMobile) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const escHandler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open, close, isMobile]);

  const update = (partial: Partial<AudioSettings>) =>
    onSettingsChange({ ...settings, ...partial });

  const pillBase = "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer shrink-0";
  const pillInactive = "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30";

  const content = (
    <div className="space-y-4">
      <div>
        <span className="text-[10px] font-bold text-muted-foreground tracking-widest block mb-2">РЕЖИМ ГЕНЕРАЦИИ</span>
        <div className="flex rounded-lg border border-border bg-background p-0.5">
          <button
            onClick={() => update({ mode: "simple" })}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              settings.mode === "simple" ? "bg-secondary text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Простой
          </button>
          <button
            onClick={() => update({ mode: "custom" })}
            className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              settings.mode === "custom" ? "bg-secondary text-primary border border-primary/40" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Свой
          </button>
        </div>
      </div>

      {settings.mode === "custom" && (
        <>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest block mb-2">ЖАНР</span>
            <div className="flex flex-wrap gap-1.5">
              {AUDIO_GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => update({ genre: settings.genre === g ? "" : g })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    settings.genre === g
                      ? "bg-secondary text-primary border border-primary/40"
                      : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest block mb-2">ТЕМП</span>
            <div className="flex rounded-lg border border-border bg-background p-0.5">
              {AUDIO_TEMPOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update({ tempo: t.value })}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-all ${
                    settings.tempo === t.value
                      ? "bg-secondary text-primary border border-primary/40"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground tracking-widest block mb-2">НАСТРОЕНИЕ</span>
            <div className="flex flex-wrap gap-1.5">
              {AUDIO_MOODS.map((m) => (
                <button
                  key={m}
                  onClick={() => update({ mood: settings.mood === m ? "" : m })}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
                    settings.mood === m
                      ? "bg-secondary text-primary border border-primary/40"
                      : "border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-foreground">Инструментал</span>
        <button
          onClick={() => update({ instrumental: !settings.instrumental })}
          className={`h-5 w-9 rounded-full transition-colors relative ${
            settings.instrumental ? "bg-primary/40 border border-primary/50" : "bg-border"
          }`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-transform ${settings.instrumental ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen(!open)} className={`${pillBase} ${pillInactive}`}>
        <Settings className="h-3 w-3" />
      </button>
      {isMobile ? (
        <MobileBottomSheet open={open} onClose={close} title="SUNO V5">
          {content}
        </MobileBottomSheet>
      ) : (
        open && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 w-80 rounded-xl border border-border bg-card shadow-xl z-[1000] p-4 max-h-[70vh] overflow-y-auto animate-popup-fade">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-muted-foreground tracking-widest">SUNO V5</span>
              <div className="flex items-center gap-1">
                <button onClick={() => onSettingsChange({ ...DEFAULT_AUDIO_SETTINGS })} className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors" title="Сброс">
                  <RefreshCw className="h-3 w-3" />
                </button>
                <button onClick={close} className="h-6 w-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {content}
          </div>
        )
      )}
    </div>
  );
};

export default AudioParamsBar;
