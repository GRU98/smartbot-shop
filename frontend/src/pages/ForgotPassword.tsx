import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, Loader2, Bot, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { GlobalLines } from "@/components/ui/background-paths";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) { setFieldErrors({ email: "Введіть електронну адресу." }); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setFieldErrors({ email: "Невірний формат." }); return; }
    setFieldErrors({});
    setError(null);
    setIsSubmitting(true);

    try {
      await apiFetch("/accounts/password-reset/", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка відправки.");
    } finally {
      setIsSubmitting(false);
    }
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
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-green-500/40 bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Лист відправлено</h2>
              <p className="text-sm text-neutral-400">
                Якщо акаунт із цією адресою існує, ми надіслали лист із посиланням для скидання пароля.
              </p>
              <Link to="/login">
                <Button variant="outline" size="sm" className="border-neutral-700 text-neutral-300 hover:bg-neutral-800">Повернутися до входу</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="mb-1 text-2xl font-bold text-white">Відновлення пароля</h1>
              <p className="mb-6 text-sm text-neutral-400">Вкажіть адресу для отримання посилання скидання</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-neutral-300">Електронна пошта</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <Input id="email" type="email" placeholder="you@example.com" className={cn("border-neutral-700 bg-neutral-800 pl-9 text-white placeholder-neutral-500", fieldErrors["email"] && "border-red-500")} value={email} onChange={(e) => setEmail(e.target.value)} />
                  </div>
                  {fieldErrors["email"] && <p className="text-xs text-red-400">{fieldErrors["email"]}</p>}
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                <Button type="submit" className="w-full bg-white text-black hover:bg-neutral-200" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Надіслати посилання
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <Link to="/login" className="text-neutral-400 hover:text-white">Повернутися до входу</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
