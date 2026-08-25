import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Turnstile } from "@marsidev/react-turnstile";
import { Mail, Lock, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GlobalLines } from "@/components/ui/background-paths";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "";
const API_BASE = "/api";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
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

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!email) errors["email"] = "Введіть електронну адресу.";
    if (!password) errors["password"] = "Введіть пароль.";
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
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
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка входу.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleOAuth(provider: "google" | "github") {
    window.location.href = `${API_BASE}/accounts/oauth/${provider}/redirect/`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <GlobalLines />
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Bot className="h-8 w-8 text-white" />
            <span className="text-xl font-bold tracking-tight text-white">NEXUS TECH</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-8 backdrop-blur-xl">
          <h1 className="mb-1 text-2xl font-bold text-white">Вхід</h1>
          <p className="mb-6 text-sm text-neutral-400">Введіть дані для входу в акаунт</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-300">Електронна пошта</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input id="email" type="email" placeholder="you@example.com" className={cn("border-neutral-700 bg-neutral-800 pl-9 text-white placeholder-neutral-500", fieldErrors["email"] && "border-red-500")} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {fieldErrors["email"] && <p className="text-xs text-red-400">{fieldErrors["email"]}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-300">Пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                <Input id="password" type="password" placeholder="••••••••" className={cn("border-neutral-700 bg-neutral-800 pl-9 text-white placeholder-neutral-500", fieldErrors["password"] && "border-red-500")} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {fieldErrors["password"] && <p className="text-xs text-red-400">{fieldErrors["password"]}</p>}
            </div>

            {TURNSTILE_SITE_KEY && (
              <Turnstile siteKey={TURNSTILE_SITE_KEY} onSuccess={setTurnstileToken} options={{ theme: "dark", size: "flexible" }} />
            )}

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button type="submit" className="w-full bg-white text-black hover:bg-neutral-200" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Увійти
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-700" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-neutral-900 px-2 text-neutral-500">або</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => handleOAuth("google")} className="gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700">
              <GoogleIcon /> Google
            </Button>
            <Button variant="outline" onClick={() => handleOAuth("github")} className="gap-2 border-neutral-700 bg-neutral-800 text-white hover:bg-neutral-700">
              <GitHubIcon /> GitHub
            </Button>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm">
            <Link to="/forgot-password" className="text-neutral-400 hover:text-white">Забули пароль?</Link>
            <Link to="/register" className="text-neutral-400 hover:text-white">Створити акаунт</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
