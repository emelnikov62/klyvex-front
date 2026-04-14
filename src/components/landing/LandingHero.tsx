import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LandingHero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-14">
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/[0.05] blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none animate-pulse-glow" />

      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(hsl(0_0%_16.5%/0.2)_1px,transparent_1px),linear-gradient(90deg,hsl(0_0%_16.5%/0.2)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />

      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.08] px-5 py-2 mb-8">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-primary tracking-wide uppercase">Агрегатор нейросетей</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
          className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight leading-[0.95] mb-6"
        >
          <span className="text-foreground">Все нейросети</span>
          <br />
          <span className="bg-gradient-to-r from-primary via-primary to-[hsl(83_100%_65%)] bg-clip-text text-transparent glow-lime-text">
            в одном окне
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
          className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed"
        >
          Текст, дизайн, видео и аудио — одна подписка вместо десяти
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button
            onClick={() => navigate("/register")}
            className="group h-14 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base glow-lime inline-flex items-center gap-3 transition-all hover:bg-primary/90 hover:scale-105"
          >
            Начать бесплатно
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={() => navigate("/tariffs")}
            className="h-14 px-8 rounded-xl border border-border text-foreground font-medium text-base inline-flex items-center gap-2 transition-all hover:bg-surface-hover hover:border-primary/30"
          >
            Смотреть тарифы
          </button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-20 flex justify-center"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <span className="text-xs tracking-widest uppercase">Узнать больше</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-5 h-8 rounded-full border-2 border-border flex items-start justify-center p-1"
            >
              <div className="w-1 h-2 rounded-full bg-primary" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingHero;
