import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/store/useCartStore";

export function RobotAssistant() {
  const [message, setMessage] = useState("Привіт! Я твій кібер-помічник. Твій кошик порожній.");
  const [showBubble, setShowBubble] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(0);

  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  useEffect(() => {
    if (totalItems === 0) {
      setMessage("Привіт! Я твій кібер-помічник. Твій кошик порожній.");
    } else if (totalItems > prevCountRef.current) {
      setMessage("Чудовий вибір! Додано до систем замовлення.");
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
    prevCountRef.current = totalItems;
  }, [totalItems]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {showBubble && (
        <div
          className="max-w-[240px] rounded-xl border border-neutral-700 bg-neutral-900/95 px-4 py-3 text-sm text-neutral-200 shadow-lg backdrop-blur-md"
          style={{ animation: "fade-in 0.15s ease-out" }}
        >
          <div className="absolute -bottom-2 right-6 h-3 w-3 rotate-45 border-b border-r border-neutral-700 bg-neutral-900/95" />
          {message}
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowBubble((v) => !v)}
        className="group flex h-14 w-14 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 shadow-lg backdrop-blur-sm transition-shadow hover:shadow-xl hover:border-neutral-500"
        style={{
          animation: pulse ? "robot-pulse 0.4s ease-out" : "robot-sway 4s ease-in-out infinite",
        }}
        aria-label="Кібер-помічник"
      >
        <svg
          viewBox="0 0 64 64"
          className="h-9 w-9"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="16" y="20" width="32" height="28" rx="6" stroke="#a3a3a3" strokeWidth="2" fill="none" />
          <rect x="22" y="28" width="8" height="6" rx="2" fill="#e5e5e5" opacity="0.9" />
          <rect x="34" y="28" width="8" height="6" rx="2" fill="#e5e5e5" opacity="0.9" />
          <path d="M28 40 h8" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" />
          <line x1="32" y1="12" x2="32" y2="20" stroke="#a3a3a3" strokeWidth="2" />
          <circle cx="32" cy="10" r="3" fill="#a3a3a3" opacity="0.7" />
          <line x1="12" y1="34" x2="16" y2="34" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" />
          <line x1="48" y1="34" x2="52" y2="34" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" />
          <rect x="24" y="48" width="4" height="6" rx="1" fill="#a3a3a3" opacity="0.5" />
          <rect x="36" y="48" width="4" height="6" rx="1" fill="#a3a3a3" opacity="0.5" />
        </svg>
      </button>
    </div>
  );
}
