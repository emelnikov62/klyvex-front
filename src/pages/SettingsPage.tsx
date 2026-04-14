import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {Bell, Camera, ChevronRight, CreditCard, Download, Eye, EyeOff, Lock, Save, Shield, Trash2, User,} from "lucide-react";
import {useAuth} from "@/contexts/AuthContext";
import {Switch} from "@/components/ui/switch";
import {Progress} from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {useToast} from "@/hooks/use-toast";

/* ── Section wrapper ── */
const Section = ({title, icon: Icon, children}: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) => (
    <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2.5 mb-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <Icon className="h-4 w-4 text-primary"/>
            </div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
        </div>
        {children}
    </section>
);

/* ── Input field ── */
const Field = ({
                   label, value, onChange, type = "text", readOnly = false, placeholder,
                   showToggle = false,
               }: {
    label: string; value: string; onChange?: (v: string) => void;
    type?: string; readOnly?: boolean; placeholder?: string; showToggle?: boolean;
}) => {
    const [visible, setVisible] = useState(false);
    const inputType = showToggle ? (visible ? "text" : "password") : type;

    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <div className="relative">
                <input
                    type={inputType}
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    readOnly={readOnly}
                    placeholder={placeholder}
                    maxLength={255}
                    className={`w-full h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors ${
                        readOnly ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                />
                {showToggle && (
                    <button
                        type="button"
                        onClick={() => setVisible(!visible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {visible ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                    </button>
                )}
            </div>
        </div>
    );
};

/* ── Toggle row ── */
const ToggleRow = ({label, description, checked, onChange}: {
    label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) => (
    <div className="flex items-center justify-between py-3">
        <div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange}/>
    </div>
);

/* ── Page ── */
const SettingsPage = () => {
    const navigate = useNavigate();
    const {user} = useAuth();
    const {toast} = useToast();

    // Profile
    const [name, setName] = useState(user?.name ?? "Алексей Петров");
    const email = user?.email ?? "alex@example.com";

    // Security
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [twoFactor, setTwoFactor] = useState(false);

    // Notifications
    const [notifyGeneration, setNotifyGeneration] = useState(true);
    const [notifyModels, setNotifyModels] = useState(true);
    const [notifyMarketing, setNotifyMarketing] = useState(false);

    // Subscription mock
    const tokensUsed = 327;
    const tokensTotal = 500;

    const handleSaveProfile = () => {
        if (!name.trim()) {
            toast({title: "Ошибка", description: "Имя не может быть пустым", variant: "destructive"});
            return;
        }
        toast({title: "Сохранено", description: "Профиль успешно обновлён"});
    };

    const handleUpdatePassword = () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast({title: "Ошибка", description: "Заполните все поля", variant: "destructive"});
            return;
        }
        if (newPassword.length < 8) {
            toast({title: "Ошибка", description: "Пароль должен быть не менее 8 символов", variant: "destructive"});
            return;
        }
        if (newPassword !== confirmPassword) {
            toast({title: "Ошибка", description: "Пароли не совпадают", variant: "destructive"});
            return;
        }
        toast({title: "Готово", description: "Пароль успешно обновлён"});
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const handleDeleteAccount = () => {
        toast({title: "Запрос отправлен", description: "Ваш аккаунт будет удалён в течение 30 дней"});
    };

    return (
        <div className="min-h-[calc(100vh-3.5rem)] bg-background">
            <div className="mx-auto max-w-[700px] px-6 py-10 space-y-5">
                <h1 className="text-2xl font-bold text-foreground mb-2">Настройки</h1>

                {/* 1. Profile */}
                <Section title="Профиль" icon={User}>
                    <div className="flex items-center gap-5 mb-6">
                        <div className="relative">
                            <div
                                className="h-20 w-20 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <button
                                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors">
                                <Camera className="h-3.5 w-3.5"/>
                            </button>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">{email}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Field label="Имя" value={name} onChange={setName} placeholder="Ваше имя"/>
                        <Field label="Email" value={email} readOnly/>
                    </div>

                    <button
                        onClick={handleSaveProfile}
                        className="mt-5 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Save className="h-4 w-4"/>
                        Сохранить
                    </button>
                </Section>

                {/* 2. Security */}
                <Section title="Безопасность" icon={Lock}>
                    <div className="space-y-4 mb-5">
                        <Field label="Текущий пароль" value={currentPassword} onChange={setCurrentPassword} type="password" showToggle
                               placeholder="••••••••"/>
                        <Field label="Новый пароль" value={newPassword} onChange={setNewPassword} type="password" showToggle
                               placeholder="Минимум 8 символов"/>
                        <Field label="Подтверждение пароля" value={confirmPassword} onChange={setConfirmPassword} type="password" showToggle
                               placeholder="Повторите пароль"/>
                    </div>

                    <button
                        onClick={handleUpdatePassword}
                        className="flex items-center gap-2 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/10 transition-all"
                    >
                        Обновить пароль
                    </button>

                    <div className="mt-6 pt-5 border-t border-border">
                        <ToggleRow
                            label="Двухфакторная аутентификация"
                            description="Дополнительная защита при входе"
                            checked={twoFactor}
                            onChange={setTwoFactor}
                        />
                    </div>
                </Section>

                {/* 3. Notifications */}
                <Section title="Уведомления" icon={Bell}>
                    <div className="divide-y divide-border">
                        <ToggleRow
                            label="Завершение генерации"
                            description="Email при готовности результата"
                            checked={notifyGeneration}
                            onChange={setNotifyGeneration}
                        />
                        <ToggleRow
                            label="Новые модели"
                            description="Уведомления о добавлении нейросетей"
                            checked={notifyModels}
                            onChange={setNotifyModels}
                        />
                        <ToggleRow
                            label="Маркетинговые рассылки"
                            description="Акции, скидки и новости"
                            checked={notifyMarketing}
                            onChange={setNotifyMarketing}
                        />
                    </div>
                </Section>

                {/* 4. Subscription */}
                <Section title="Подписка" icon={CreditCard}>
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-sm font-semibold text-foreground">Текущий тариф:</span>
                        <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">Про</span>
                    </div>

                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-muted-foreground">Токены</span>
                            <span className="text-xs font-semibold text-foreground">{tokensUsed} из {tokensTotal}</span>
                        </div>
                        <Progress value={(tokensUsed / tokensTotal) * 100} className="h-2 bg-border [&>div]:bg-primary"/>
                    </div>

                    <p className="text-xs text-muted-foreground mb-5">
                        Следующее списание: <span className="text-foreground font-medium">11 апреля 2026</span>
                    </p>

                    <button
                        onClick={() => navigate("/tariffs")}
                        className="flex items-center gap-2 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-primary hover:bg-primary/10 transition-all group"
                    >
                        Управление подпиской
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors"/>
                    </button>
                </Section>

                {/* 5. Privacy */}
                <Section title="Приватность" icon={Shield}>
                    <div className="flex flex-wrap gap-3">
                        <button
                            className="flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary/30 hover:bg-primary/[0.03] transition-all">
                            <Download className="h-4 w-4 text-muted-foreground"/>
                            Скачать мои данные
                        </button>

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button
                                    className="flex items-center gap-2 rounded-xl border border-destructive/30 px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
                                    <Trash2 className="h-4 w-4"/>
                                    Удалить аккаунт
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-foreground">Удалить аккаунт?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Это действие необратимо. Все ваши данные, генерации и история будут безвозвратно удалены.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="border-border text-foreground hover:bg-surface-hover">Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteAccount}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Удалить
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </Section>
            </div>
        </div>
    );
};

export default SettingsPage;
