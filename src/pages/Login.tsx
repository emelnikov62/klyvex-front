import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AUTH_TYPE } from "@/lib/enums/AuthTypes";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import { User } from "@/lib/kernel/models/main/User";

const Login = () => {
  const navigate = useNavigate();
  const { user, lockEvents, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    login({ id: Math.random().toString(36).slice(-5), password: password, login: email, method: AUTH_TYPE.EMAIL } as User);
  };

  const handleGoogle = useGoogleLogin({
    onSuccess: (codeResponse) => {
      axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${codeResponse.access_token}`, {
        headers: {
          Authorization: `Bearer ${codeResponse.access_token}`,
          Accept: 'application/json'
        }
      }).then((res) => {
        setLoading(true);
        login({ id: res.data.id, login: res.data.email, method: AUTH_TYPE.GOOGLE } as User);
      }).catch((err) => console.log(err));
    },
    onError: (error) => { console.log('Login Failed:', error); }
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user?.ready) {
      setLoading(false);
      navigate("/workspace");
    } else {
      setLoading(true);

      if (user.method == AUTH_TYPE.GOOGLE) {
        login({ id: user.googleId, login: user.login, method: AUTH_TYPE.GOOGLE } as User);
      }

      if (user.method == AUTH_TYPE.EMAIL) {
        login({ id: user.id, login: user.login, method: AUTH_TYPE.EMAIL, password: user.password } as User);
      }
    }
  }, [user]);

  useEffect(() => {
    setLoading(lockEvents);
  }, [lockEvents]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <span className="text-xl font-black text-primary-foreground leading-none">K</span>
          </div>
          <span className="text-lg font-bold text-foreground">
            KLYVEX<span className="text-primary">.AI</span>
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-bold text-foreground mb-6 text-center">Войти</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 rounded-xl border border-border bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-text-hint focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 rounded-xl border border-border bg-background pl-11 pr-11 text-sm text-foreground placeholder:text-text-hint focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm glow-lime hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">или</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            onClick={() => handleGoogle()}
            disabled={loading}
            className="w-full h-11 rounded-xl border border-border bg-background text-foreground font-medium text-sm hover:bg-surface-hover hover:border-primary/30 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Войти через Google
          </button>

          {/* Link to register */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Нет аккаунта?{" "}
            <button
              onClick={() => navigate("/register")}
              className="text-primary hover:underline font-medium"
            >
              Зарегистрироваться
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
