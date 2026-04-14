import { useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, useCallback } from "react";
import { Monitor, FolderOpen, CreditCard, Sparkles, HelpCircle, LogIn, User, Settings, LogOut, Menu, X } from "lucide-react";
import CloverIcon from "@/components/ui/clover-icon";
import BalancePopup from "@/components/header/BalancePopup";
import TopUpModal from "@/components/header/TopUpModal";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

const navItems = [
  { label: "Рабочая среда", icon: Monitor, path: "/workspace" },
  { label: "Хранилище", icon: FolderOpen, path: "/storage" },
  { label: "Тарифы", icon: CreditCard, path: "/tariffs" },
  { label: "Ассистент", icon: Sparkles, path: "__assistant__" },
];

const AppHeader = ({ onAssistantToggle }: { onAssistantToggle?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const isMobile = useIsMobile();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [burgerOpen, setBurgerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef<HTMLDivElement>(null);

  const closeAll = useCallback(() => {
    setDropdownOpen(false);
    setBalanceOpen(false);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (balanceRef.current && !balanceRef.current.contains(e.target as Node)) setBalanceOpen(false);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeAll(); setBurgerOpen(false); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [closeAll]);

  // Close burger on route change
  useEffect(() => { setBurgerOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout(user);
    setDropdownOpen(false);
    setBurgerOpen(false);
    navigate("/");
  };

  const handleNav = (path: string) => {
    if (path === "__assistant__") {
      onAssistantToggle?.();
    } else {
      navigate(path);
    }
    setBurgerOpen(false);
  };

  /* ═══ MOBILE HEADER ═══ */
  if (isMobile) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="flex h-full items-center justify-between px-3">
            {/* Burger */}
            <button
              onClick={() => setBurgerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground active:bg-surface-hover"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Logo center */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-black text-primary-foreground leading-none">K</span>
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground">
                KLYVEX<span className="text-primary">.AI</span>
              </span>
            </div>

            {/* Balance compact */}
            <div className="relative" ref={balanceRef}>
              <button
                onClick={() => setBalanceOpen(!balanceOpen)}
                className="flex items-center gap-1 rounded-lg bg-secondary border border-border px-2 py-1.5"
              >
                <CloverIcon className="h-3 w-3 text-primary" fill="currentColor" />
                <span className="text-[11px] font-semibold text-foreground">1 500</span>
              </button>
              {balanceOpen && (
                <BalancePopup
                  onClose={() => setBalanceOpen(false)}
                  onTopUp={() => { setBalanceOpen(false); setTopUpOpen(true); }}
                />
              )}
            </div>
          </div>
        </header>

        {/* Burger drawer */}
        {burgerOpen && (
          <div className="fixed inset-0 z-[100]" onClick={() => setBurgerOpen(false)}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Drawer */}
            <div
              className="absolute top-0 left-0 h-full bg-card border-r border-border flex flex-col animate-slide-in-left"
              style={{ width: "85vw", maxWidth: 320, paddingBottom: "env(safe-area-inset-bottom)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
                <span className="text-sm font-bold text-foreground">
                  KLYVEX<span className="text-primary">.AI</span>
                </span>
                <button onClick={() => setBurgerOpen(false)} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground active:bg-surface-hover">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* User */}
              <div className="px-4 py-4 border-b border-border">
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                      {user.login.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{user.login}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBurgerOpen(false); navigate("/login"); }}
                    className="flex items-center gap-2 w-full rounded-xl border border-primary/40 px-4 py-2.5 text-sm font-medium text-foreground active:bg-primary/10"
                  >
                    <LogIn className="h-4 w-4" />
                    Войти
                  </button>
                )}
              </div>

              {/* Nav */}
              <nav className="flex-1 overflow-y-auto py-2">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNav(item.path)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors min-h-[44px] ${isActive ? "text-primary bg-primary/10" : "text-muted-foreground active:bg-surface-hover"
                        }`}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? "icon-glow" : ""}`} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* Bottom */}
              <div className="border-t border-border p-4 space-y-2 shrink-0">
                {/* Balance */}
                <div className="flex items-center justify-between rounded-xl bg-secondary border border-border px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CloverIcon className="h-4 w-4 text-primary" fill="currentColor" />
                    <span className="text-sm font-semibold text-foreground">1 500</span>
                  </div>
                  <button
                    onClick={() => { setBurgerOpen(false); setTopUpOpen(true); }}
                    className="text-xs font-semibold text-primary active:opacity-70"
                  >
                    Пополнить
                  </button>
                </div>

                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => { setBurgerOpen(false); navigate("/settings"); }}
                      className="flex w-full items-center gap-3 px-2 py-2.5 text-sm text-muted-foreground active:bg-surface-hover rounded-lg min-h-[44px]"
                    >
                      <Settings className="h-4 w-4" />
                      Настройки
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-2 py-2.5 text-sm text-destructive active:bg-destructive/10 rounded-lg min-h-[44px]"
                    >
                      <LogOut className="h-4 w-4" />
                      Выйти
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
      </>
    );
  }

  /* ═══ DESKTOP / TABLET HEADER ═══ */
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-background/90 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-4 lg:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => navigate("/")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-black text-primary-foreground leading-none">K</span>
            </div>
            <span className="text-base font-bold tracking-tight text-foreground hidden sm:inline">
              KLYVEX<span className="text-primary">.AI</span>
            </span>
          </div>

          {/* Center nav — clean floating links */}
          <nav className="flex items-center gap-5 xl:gap-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`flex items-center gap-2 py-2 text-[13px] xl:text-sm transition-colors duration-200 ${isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground font-normal"
                    }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Token balance */}
            <div className="relative" ref={balanceRef}>
              <button
                onClick={() => {
                  if (balanceOpen) setBalanceOpen(false);
                  else { setDropdownOpen(false); setBalanceOpen(true); }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-secondary border border-border px-3 py-1.5 hover:border-primary/30 hover:shadow-[0_0_12px_rgba(200,255,0,0.2)] transition-all cursor-pointer group"
              >
                <CloverIcon className="h-3.5 w-3.5 text-primary group-hover:drop-shadow-[0_0_8px_rgba(200,255,0,0.4)] transition-all" fill="currentColor" />
                <span className="text-xs font-semibold text-foreground">1 500</span>
              </button>
              {balanceOpen && (
                <BalancePopup onClose={() => setBalanceOpen(false)} onTopUp={() => { setBalanceOpen(false); setTopUpOpen(true); }} />
              )}
            </div>

            {isAuthenticated && user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => { if (dropdownOpen) setDropdownOpen(false); else { setBalanceOpen(false); setDropdownOpen(true); } }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/30 transition-all"
                >
                  {user.login.charAt(0).toUpperCase()}
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl shadow-background/50 overflow-hidden popup-enter">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-foreground truncate">{user.login}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button onClick={() => { setDropdownOpen(false); navigate("/settings"); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                        <User className="h-4 w-4" />
                        Мой профиль
                      </button>
                      <button onClick={() => { setDropdownOpen(false); navigate("/settings"); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
                        <Settings className="h-4 w-4" />
                        Настройки
                      </button>
                    </div>
                    <div className="border-t border-border py-1">
                      <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => navigate("/login")} className="flex items-center gap-2 rounded-lg border border-primary/40 px-4 py-1.5 text-sm font-medium text-foreground hover:border-primary hover:bg-primary/10 transition-all">
                <LogIn className="h-4 w-4" />
                <span className="hidden sm:inline">Войти</span>
              </button>
            )}
          </div>
        </div>
      </header>
      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </>
  );
};

export default AppHeader;
