import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowLeft,
  HeartStraight,
  Sparkle,
  UsersFour,
  BookOpenText,
  ShieldCheck,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const AMOUNTS = [
  { value: 5, label: "$5" },
  { value: 10, label: "$10" },
  { value: 25, label: "$25", suggested: true },
  { value: 50, label: "$50" },
  { value: 100, label: "$100" },
];

const IMPACT = [
  {
    icon: BookOpenText,
    title: "Curamos la base de conocimiento",
    body: "Guías, plantillas y casos culturales revisados por especialistas del sector iberoamericano.",
  },
  {
    icon: UsersFour,
    title: "Ampliamos el directorio de agentes",
    body: "Sumamos artistas, gestores y espacios independientes al mapa profesional.",
  },
  {
    icon: Sparkle,
    title: "Mantenemos el copiloto de IA",
    body: "Diagnósticos y planes personalizados accesibles para artistas y colectivos.",
  },
];

export default function Support() {
  const { user } = useAuth();
  const [freq, setFreq] = useState("once"); // once | monthly
  const [amount, setAmount] = useState(25);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");

  const effective = custom ? Number(custom) : amount;

  const submit = (e) => {
    e.preventDefault();
    if (!effective || effective < 1) {
      toast.error("Ingresa un monto válido");
      return;
    }
    toast.success(
      `Gracias, ${name?.split(" ")[0] || "amig@"}. Aún estamos configurando los pagos — pronto podrás donar ${effective} USD ${freq === "monthly" ? "cada mes" : ""}.`
    );
  };

  return (
    <div className="min-h-screen bg-alabaster relative z-10">
      {/* Header */}
      <header className="border-b border-obsidian/10 bg-alabaster">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <Link to="/" className="block">
            <div className="font-mono-meta text-obsidian/50">plataforma</div>
            <div className="font-serif-display text-3xl italic text-terracotta leading-none">Cultora</div>
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-obsidian/60 hover:text-terracotta group">
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Volver a la página principal
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-16">
        {/* Left: pitch */}
        <div className="lg:col-span-7">
          <div className="font-mono-meta text-terracotta mb-6">apoya cultora</div>
          <h1 className="font-serif-display text-5xl md:text-6xl lg:text-7xl text-obsidian leading-none mb-8">
            Consultoría cultural,<br />
            <span className="italic text-terracotta">accesible para todas.</span>
          </h1>
          <p className="text-lg text-obsidian/70 leading-relaxed max-w-2xl mb-12">
            Cultora es una plataforma independiente para artistas, colectivos y organizaciones culturales que rara vez tienen acceso a consultoría estratégica. Tu aporte hace posible que el copiloto siga siendo gratuito para quienes más lo necesitan.
          </p>

          <div className="space-y-6 max-w-2xl">
            {IMPACT.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="flex gap-5 pb-6 border-b border-obsidian/8 last:border-0">
                  <Icon size={26} weight="duotone" className="text-terracotta shrink-0 mt-1" />
                  <div>
                    <div className="font-serif-display text-2xl mb-2">{b.title}</div>
                    <p className="text-obsidian/70 leading-relaxed">{b.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: donation form */}
        <div className="lg:col-span-5">
          <form onSubmit={submit} className="bg-white border border-obsidian/10 p-8 md:p-10 sticky top-8">
            <div className="flex items-center gap-2 mb-6">
              <HeartStraight size={22} weight="duotone" className="text-terracotta" />
              <div className="font-mono-meta text-obsidian/60">apoyo económico</div>
            </div>

            <h2 className="font-serif-display text-3xl md:text-4xl leading-tight mb-8">
              Elige tu <span className="italic text-terracotta">aporte</span>.
            </h2>

            {/* Frequency toggle */}
            <div className="grid grid-cols-2 gap-1 bg-linen/60 p-1 rounded-full mb-6">
              <button
                type="button"
                data-testid="support-freq-once"
                onClick={() => setFreq("once")}
                className={`h-10 rounded-full text-sm font-medium transition-colors ${
                  freq === "once" ? "bg-obsidian text-alabaster" : "text-obsidian/60 hover:text-obsidian"
                }`}
              >
                Aporte único
              </button>
              <button
                type="button"
                data-testid="support-freq-monthly"
                onClick={() => setFreq("monthly")}
                className={`h-10 rounded-full text-sm font-medium transition-colors ${
                  freq === "monthly" ? "bg-obsidian text-alabaster" : "text-obsidian/60 hover:text-obsidian"
                }`}
              >
                Cada mes
              </button>
            </div>

            {/* Amounts */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {AMOUNTS.map((a) => {
                const active = !custom && amount === a.value;
                return (
                  <button
                    type="button"
                    key={a.value}
                    data-testid={`support-amount-${a.value}`}
                    onClick={() => {
                      setAmount(a.value);
                      setCustom("");
                    }}
                    className={`relative h-14 rounded-md border transition-colors font-medium ${
                      active
                        ? "bg-obsidian text-alabaster border-obsidian"
                        : "bg-white border-obsidian/12 text-obsidian/80 hover:border-obsidian/40"
                    }`}
                  >
                    {a.label}
                    {a.suggested ? (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono uppercase tracking-widest bg-terracotta text-alabaster px-1.5 py-0.5 rounded">
                        sugerido
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mb-6">
              <label className="block">
                <div className="font-mono-meta text-obsidian/50 mb-2">o monto libre (USD)</div>
                <Input
                  data-testid="support-custom-amount"
                  type="number"
                  min="1"
                  step="1"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Ej. 15"
                  className="h-11 bg-white border-obsidian/15"
                />
              </label>
            </div>

            <div className="rule-divider mb-6" />

            <div className="grid grid-cols-1 gap-3 mb-6">
              <label className="block">
                <div className="font-mono-meta text-obsidian/50 mb-2">nombre</div>
                <Input
                  data-testid="support-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-white border-obsidian/15"
                />
              </label>
              <label className="block">
                <div className="font-mono-meta text-obsidian/50 mb-2">correo</div>
                <Input
                  data-testid="support-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white border-obsidian/15"
                />
              </label>
            </div>

            <Button
              type="submit"
              data-testid="support-submit"
              className="w-full rounded-full bg-terracotta text-alabaster hover:bg-terracotta/90 h-12 lift"
            >
              <HeartStraight size={16} className="mr-2" weight="fill" />
              Donar {effective ? `$${effective}` : ""} {freq === "monthly" ? "cada mes" : ""}
            </Button>

            <div className="mt-5 flex items-center gap-2 text-xs text-obsidian/50">
              <ShieldCheck size={14} weight="duotone" className="text-olive" />
              Los pagos aún no están habilitados. Estamos preparando la integración segura.
            </div>
          </form>
        </div>
      </div>

      <footer className="border-t border-obsidian/10 mt-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono-meta text-obsidian/50">© Cultora — copiloto de gestión cultural</div>
          <div className="font-mono-meta text-obsidian/50">hecho para artistas, colectivos y espacios</div>
        </div>
      </footer>
    </div>
  );
}
