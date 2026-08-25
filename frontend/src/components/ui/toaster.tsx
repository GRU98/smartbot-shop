import { useToastStore } from "@/store/useToastStore";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 flex-col items-center gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-300 min-w-[260px] max-w-sm ${
            t.type === "success"
              ? "border-green-500/30 bg-neutral-900/95 text-green-400"
              : t.type === "error"
              ? "border-red-500/30 bg-neutral-900/95 text-red-400"
              : "border-neutral-600 bg-neutral-900/95 text-neutral-300"
          }`}
        >
          {t.type === "success" && <CheckCircle className="h-4 w-4 shrink-0" />}
          {t.type === "error" && <AlertCircle className="h-4 w-4 shrink-0" />}
          {t.type === "info" && <Info className="h-4 w-4 shrink-0" />}
          <span className="flex-1 text-sm font-medium text-white">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 text-neutral-500 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
