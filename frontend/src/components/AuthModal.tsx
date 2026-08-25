import { useState, type FormEvent } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Mail, Lock, User, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

type Mode = "login" | "register" | "forgot" | "register-success";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function validateEmail(email: string): string | null {
  if (!email) return "Введіть електронну адресу.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Невірний формат електронної адреси.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Введіть пароль.";
  if (password.length < 8) return "Пароль повинен містити щонайменше 8 символів.";
  if (!/\d/.test(password)) return "Пароль повинен містити щонайменше одну цифру.";
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
    return "Пароль повинен містити щонайменше один спецсимвол.";
  return null;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [forgotSent, setForgotSent] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  function resetForm() {
    setEmail("");
    setPassword("");
    setName("");
    setTurnstileToken("");
    setError(null);
    setFieldErrors({});
    setForgotSent(false);
  }

  function switchMode(next: Mode) {
    resetForm();
    setMode(next);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const emailErr = validateEmail(email);
    if (emailErr) errors["email"] = emailErr;
    if (!password) errors["password"] = "Введіть пароль.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      const data = await apiFetch<{
        user: { id: number; email: string; name: string; role: string; avatar: string };
        access: string;
        refresh: string;
      }>("/accounts/login/", {
        method: "POST",
        body: { email, password, turnstile_token: turnstileToken },
      });
      setAuth(data.user, data.access, data.refresh);
      onOpenChange(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка входу.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!name.trim()) errors["name"] = "Введіть ваше ім'я.";
    const emailErr = validateEmail(email);
    if (emailErr) errors["email"] = emailErr;
    const passErr = validatePassword(password);
    if (passErr) errors["password"] = passErr;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch("/accounts/register/", {
        method: "POST",
        body: { email, password, name, turnstile_token: turnstileToken },
      });
      setMode("register-success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка реєстрації.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgot(e: FormEvent) {
    e.preventDefault();
    const emailErr = validateEmail(email);
    if (emailErr) {
      setFieldErrors({ email: emailErr });
      return;
    }
    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch("/accounts/password-reset/", {
        method: "POST",
        body: { email },
      });
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка відправки.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOAuth(provider: "google" | "github") {
    window.location.href = `${API_BASE}/accounts/oauth/${provider}/redirect/`;
  }

  const title: Record<Mode, string> = {
    login: "Вхід до акаунта",
    register: "Створити акаунт",
    forgot: "Відновлення пароля",
    "register-success": "Реєстрацію розпочато",
  };

  const description: Record<Mode, string> = {
    login: "Введіть дані для входу до SmartBot Shop",
    register: "Заповніть форму для створення нового акаунта",
    forgot: "Вкажіть адресу для отримання посилання скидання",
    "register-success": "",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-neutral-800 bg-neutral-950 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-white">{title[mode]}</DialogTitle>
          {description[mode] && (
            <DialogDescription>{description[mode]}</DialogDescription>
          )}
        </DialogHeader>

        {mode === "register-success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              На вашу пошту відправлено лист для підтвердження. Будь ласка,
              перевірте скриньку та перейдіть за посиланням для активації
              акаунта.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => switchMode("login")}
            >
              Повернутися до входу
            </Button>
          </div>
        )}

        {mode === "login" && (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Електронна пошта</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    className={cn("pl-9", fieldErrors["email"] && "border-destructive")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {fieldErrors["email"] && (
                  <p className="text-xs text-destructive">{fieldErrors["email"]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    className={cn("pl-9", fieldErrors["password"] && "border-destructive")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {fieldErrors["password"] && (
                  <p className="text-xs text-destructive">{fieldErrors["password"]}</p>
                )}
              </div>

              {TURNSTILE_SITE_KEY && (
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  options={{ theme: "dark", size: "flexible" }}
                />
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-neutral-200"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Увійти
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">або</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuth("google")}
                className="gap-2"
              >
                <GoogleIcon />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuth("github")}
                className="gap-2"
              >
                <GitHubIcon />
                GitHub
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-neutral-300 underline-offset-4 hover:underline"
                onClick={() => switchMode("forgot")}
              >
                Забули пароль?
              </button>
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                onClick={() => switchMode("register")}
              >
                Створити акаунт
              </button>
            </div>
          </>
        )}

        {mode === "register" && (
          <>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-name">Ім'я</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Ваше ім'я"
                    className={cn("pl-9", fieldErrors["name"] && "border-destructive")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                {fieldErrors["name"] && (
                  <p className="text-xs text-destructive">{fieldErrors["name"]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-email">Електронна пошта</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    className={cn("pl-9", fieldErrors["email"] && "border-destructive")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {fieldErrors["email"] && (
                  <p className="text-xs text-destructive">{fieldErrors["email"]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Пароль</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Мін. 8 символів, цифра, спецсимвол"
                    className={cn("pl-9", fieldErrors["password"] && "border-destructive")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {fieldErrors["password"] && (
                  <p className="text-xs text-destructive">{fieldErrors["password"]}</p>
                )}
              </div>

              {TURNSTILE_SITE_KEY && (
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  options={{ theme: "dark", size: "flexible" }}
                />
              )}

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-neutral-200"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Зареєструватися
              </Button>
            </form>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">або</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleOAuth("google")}
                className="gap-2"
              >
                <GoogleIcon />
                Google
              </Button>
              <Button
                variant="outline"
                onClick={() => handleOAuth("github")}
                className="gap-2"
              >
                <GitHubIcon />
                GitHub
              </Button>
            </div>

            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              onClick={() => switchMode("login")}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Вже маєте акаунт? Увійти
            </button>
          </>
        )}

        {mode === "forgot" && (
          <>
            {forgotSent ? (
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-400" />
                <p className="text-sm text-muted-foreground">
                  Якщо акаунт із цією адресою існує, ми надіслали лист із
                  посиланням для скидання пароля.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => switchMode("login")}
                >
                  Повернутися до входу
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Електронна пошта</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        className={cn("pl-9", fieldErrors["email"] && "border-destructive")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    {fieldErrors["email"] && (
                      <p className="text-xs text-destructive">{fieldErrors["email"]}</p>
                    )}
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-white text-black hover:bg-neutral-200"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Надіслати посилання
                  </Button>
                </form>

                <button
                  type="button"
                  className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  onClick={() => switchMode("login")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Повернутися до входу
                </button>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
