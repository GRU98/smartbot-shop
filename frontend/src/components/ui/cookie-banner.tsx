import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Shield, Settings, X } from "lucide-react";

const CONSENT_KEY = "smartbot-cookie-consent";

type ConsentValue = "accepted" | "rejected" | "custom";

function getStoredConsent(): ConsentValue | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === "accepted" || value === "rejected" || value === "custom") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

function storeConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* localStorage недоступний */
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = getStoredConsent();
    if (consent === null) {
      setVisible(true);
    }
  }, []);

  function handleAcceptAll() {
    storeConsent("accepted");
    setVisible(false);
  }

  function handleReject() {
    storeConsent("rejected");
    setVisible(false);
  }

  function handleSaveCustom() {
    storeConsent("custom");
    try {
      localStorage.setItem(
        "smartbot-cookie-prefs",
        JSON.stringify({ analytics, marketing, necessary: true })
      );
    } catch {
      /* localStorage недоступний */
    }
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-cyber-cyan/20 bg-card/95 p-4 backdrop-blur-md sm:p-6"
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-cyber-cyan" />
              <div className="flex-1 space-y-3">
                <p className="text-sm leading-relaxed text-foreground">
                  Ми використовуємо файли cookie та аналогічні технології для
                  забезпечення коректної роботи сайту, аналітики відвідувань та
                  персоналізації контенту. Обробка даних здійснюється відповідно
                  до Закону України «Про захист персональних даних» (№ 2297-VI)
                  та Регламенту (ЄС) 2016/679 (GDPR). Необхідні cookie
                  встановлюються автоматично для функціонування сайту. Ви можете
                  прийняти всі cookie, налаштувати їх категорії або відхилити
                  необов'язкові.
                </p>

                <AnimatePresence>
                  {showSettings && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 rounded-md border border-border bg-background/50 p-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked
                            disabled
                            className="h-4 w-4 rounded accent-cyber-cyan"
                          />
                          <span className="text-sm text-foreground">
                            Необхідні cookie
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (завжди активні)
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={analytics}
                            onChange={(e) => setAnalytics(e.target.checked)}
                            className="h-4 w-4 rounded accent-cyber-cyan"
                          />
                          <span className="text-sm text-foreground">
                            Аналітичні cookie
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (статистика відвідувань)
                          </span>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={marketing}
                            onChange={(e) => setMarketing(e.target.checked)}
                            className="h-4 w-4 rounded accent-cyber-cyan"
                          />
                          <span className="text-sm text-foreground">
                            Маркетингові cookie
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (персоналізована реклама)
                          </span>
                        </label>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="cyber" size="sm" onClick={handleAcceptAll}>
                    Прийняти всі
                  </Button>
                  {showSettings ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveCustom}
                    >
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      Зберегти вибір
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                    >
                      <Settings className="mr-1 h-3.5 w-3.5" />
                      Налаштувати
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleReject}>
                    <X className="mr-1 h-3.5 w-3.5" />
                    Відхилити
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
