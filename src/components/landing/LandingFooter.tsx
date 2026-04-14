import { Zap } from "lucide-react";

const LandingFooter = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Logo */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-black text-primary-foreground leading-none">K</span>
              </div>
              <span className="text-base font-bold text-foreground">
                KLYVEX<span className="text-primary">.AI</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Агрегатор нейросетей нового поколения. Все AI — один интерфейс.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Платформа</h4>
            <ul className="space-y-2.5">
              <li><a href="/workspace" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Рабочая среда</a></li>
              <li><a href="/tariffs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Тарифы</a></li>
              <li><a href="/assistant" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ассистент</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Компания</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">О нас</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Контакты</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Блог</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Правовая информация</h4>
            <ul className="space-y-2.5">
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Политика конфиденциальности</a></li>
              <li><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Условия использования</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© 2026 KLYVEX.AI. Все права защищены.</p>
          <p className="text-xs text-text-hint">Сделано с 💚 для AI-сообщества</p>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
