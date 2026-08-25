import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { apiFetch } from "@/lib/api";

type Status = "loading" | "success" | "error";

export function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const uid = searchParams.get("uid");
    const token = searchParams.get("token");

    if (!uid || !token) {
      setStatus("error");
      setErrorMessage("Недійсне посилання активації. Відсутні параметри uid або token.");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const data = await apiFetch<{
          user: { id: number; email: string; name: string; role: string; avatar: string };
          access: string;
          refresh: string;
        }>("/accounts/verify-email/", {
          method: "POST",
          body: { uid, token },
        });

        if (cancelled) return;

        setAuth(data.user, data.access, data.refresh);
        setStatus("success");

        setTimeout(() => {
          if (!cancelled) navigate("/", { replace: true });
        }, 3000);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Невідома помилка при активації."
        );
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setAuth, navigate]);

  return (
    <div className="cyber-grid flex min-h-screen items-center justify-center px-4">
      <div className="pointer-events-none fixed inset-0 animate-spotlight" />

      <AnimatePresence mode="wait">
        {status === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 flex flex-col items-center gap-6"
          >
            <div className="relative">
              <Loader2 className="h-16 w-16 animate-spin text-cyber-cyan" />
              <div className="absolute inset-0 animate-ping rounded-full bg-cyber-cyan/20" />
            </div>
            <p className="text-lg text-muted-foreground">
              Активація акаунта...
            </p>
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10 flex max-w-md flex-col items-center gap-6 rounded-xl border border-cyber-cyan/20 bg-card/80 p-10 text-center backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-cyber-cyan/40 bg-cyber-cyan/10 shadow-[0_0_40px_rgba(0,229,255,0.3)]">
                <CheckCircle2 className="h-10 w-10 text-cyber-cyan" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-bold text-cyber-cyan"
            >
              Акаунт успішно активовано!
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-muted-foreground"
            >
              Ласкаво просимо до SMARTBOT SHOP. Вас буде перенаправлено на
              головну сторінку через кілька секунд...
            </motion.p>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 flex max-w-md flex-col items-center gap-6 rounded-xl border border-destructive/30 bg-card/80 p-10 text-center backdrop-blur-md"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-destructive/40 bg-destructive/10">
              <AlertCircle className="h-10 w-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-destructive drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              Помилка активації
            </h1>
            <p className="text-muted-foreground">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
