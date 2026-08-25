import { useState, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GlobalLines } from "@/components/ui/background-paths";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

const CONTACTS = [
  { icon: MapPin, label: "Адреса", value: "м. Київ, вул. Хрещатик, 1" },
  { icon: Phone, label: "Телефон", value: "+38 (044) 000-00-00" },
  { icon: Mail, label: "Email", value: "info@smartbotik.duckdns.org" },
  { icon: Clock, label: "Режим роботи", value: "Пн–Нд: 9:00 – 21:00" },
];

export function Contacts() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) { setError("Заповніть всі поля"); return; }
    setError("");
    setLoading(true);
    try {
      await apiFetch("/contact/", { method: "POST", body: { name, email, message } });
      setSent(true);
    } catch {
      setError("Помилка надсилання. Спробуйте пізніше або напишіть нам на email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <Helmet>
        <title>Контакти — SmartBot Shop</title>
        <meta name="description" content="Зв'яжіться з нами: адреса, телефон, email SmartBot Shop. Форма зворотного зв'язку." />
      </Helmet>
      <GlobalLines />
      <Header />

      <div className="mx-auto max-w-5xl px-4 pb-24 pt-32 md:px-8">
        <div className="mb-12">
          <h1 className="mb-3 text-4xl font-bold text-white">Контакти</h1>
          <p className="text-neutral-400">Маєш питання? Ми завжди раді допомогти.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {CONTACTS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-400" />
                <h3 className="text-xl font-bold text-white">Повідомлення надіслано!</h3>
                <p className="text-sm text-neutral-400">Ми відповімо вам протягом 24 годин.</p>
              </div>
            ) : (
              <>
                <h2 className="mb-6 text-xl font-bold text-white">Написати нам</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-neutral-300">Ваше ім'я</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Іван Іваненко"
                      className="border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-neutral-300">Email</Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="border-neutral-700 bg-neutral-800 text-white placeholder-neutral-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-neutral-300">Повідомлення</Label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Ваше питання або побажання..."
                      rows={4}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500 resize-none"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <Button type="submit" disabled={loading} className="w-full bg-white text-black hover:bg-neutral-200">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Надіслати
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
