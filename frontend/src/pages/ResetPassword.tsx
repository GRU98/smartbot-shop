import { useState, useMemo, type FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "form" | "submitting" | "success" | "error";

interface StrengthResult {
  score: number;
  label: string;
  color: string;
}

function getPasswordStrength(password: string): StrengthResult {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;

  if (score <= 1) return { score, label: "Слабкий", color: "bg-red-500" };
  if (score <= 2) return { score, label: "Задовільний", color: "bg-orange-500" };
  if (score <= 3) return { score, label: "Середній", color: "bg-yellow-500" };
  if (score <= 4) return { score, label: "Надійний", color: "bg-cyber-cyan" };
  return { score, label: "Відмінний", color: "bg-green-500" };
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<Status>("form");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!password) {
      errors["password"] = "Введіть новий пароль.";
    } else {
      if (password.length < 8) errors["password"] = "Мінімум 8 символів.";
      else if (!/\d/.test(password)) errors["password"] = "Потрібна щонайменше одна цифра.";
      else if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password))
        errors["password"] = "Потрібен щонайменше один спецсимвол.";
    }

    if (!confirmPassword) {
      errors["confirm"] = "Підтвердіть пароль.";
    } else if (password !== confirmPassword) {
      errors["confirm"] = "Паролі не збігаються.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (!uid || !token) {
      setStatus("error");
      setError("Недійсне посилання скидання пароля.");
      return;
    }

    setStatus("submitting");
    setError(null);

    try {
      await apiFetch("/accounts/password-reset-confirm/", {
        method: "POST",
        body: { uid, token, new_password: password },
      });
      setStatus("success");
      setTimeout(() => navigate("/", { replace: true }), 3000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Помилка скидання пароля.");
    }
  }

  if (!uid || !token) {
    return (
      <div className="cyber-grid flex min-h-screen items-center justify-center px-4">
        <div className="relative z-10 flex max-w-md flex-col items-center gap-4 rounded-xl border border-destructive/30 bg-card/80 p-10 text-center backdrop-blur-md">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold text-destructive">Недійсне посилання</h1>
          <p className="text-sm text-muted-foreground">
            Посилання для скидання пароля не містить необхідних параметрів.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-grid flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 animate-spotlight" />

      {status === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex max-w-md flex-col items-center gap-6 rounded-xl border border-cyber-cyan/20 bg-card/80 p-10 text-center backdrop-blur-md"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyber-cyan/40 bg-cyber-cyan/10 shadow-[0_0_40px_rgba(0,229,255,0.3)]">
            <CheckCircle2 className="h-10 w-10 text-cyber-cyan" />
          </div>
          <h1 className="text-2xl font-bold text-cyber-cyan">
            Пароль успішно змінено!
          </h1>
          <p className="text-muted-foreground">
            Тепер ви можете увійти з новим паролем. Перенаправлення...
          </p>
        </motion.div>
      )}

      {status === "error" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 flex max-w-md flex-col items-center gap-6 rounded-xl border border-destructive/30 bg-card/80 p-10 text-center backdrop-blur-md"
        >
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h1 className="text-xl font-bold text-destructive drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
            Помилка
          </h1>
          <p className="text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={() => setStatus("form")}>
            Спробувати ще раз
          </Button>
        </motion.div>
      )}

      {(status === "form" || status === "submitting") && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md rounded-xl border border-cyber-cyan/20 bg-card/80 p-8 backdrop-blur-md"
        >
          <h1 className="mb-2 text-2xl font-bold text-cyber-cyan">
            Новий пароль
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Введіть та підтвердіть ваш новий пароль
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Новий пароль</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Мін. 8 символів"
                  className={cn("pl-9", fieldErrors["password"] && "border-destructive")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>
              {fieldErrors["password"] && (
                <p className="text-xs text-destructive">{fieldErrors["password"]}</p>
              )}

              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i < strength.score ? strength.color : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Надійність: <span className="font-medium text-foreground">{strength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Підтвердження пароля</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Повторіть пароль"
                  className={cn("pl-9", fieldErrors["confirm"] && "border-destructive")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={status === "submitting"}
                />
              </div>
              {fieldErrors["confirm"] && (
                <p className="text-xs text-destructive">{fieldErrors["confirm"]}</p>
              )}
            </div>

            <Button
              type="submit"
              variant="cyber"
              className="w-full"
              disabled={status === "submitting"}
            >
              {status === "submitting" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Змінити пароль
            </Button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
