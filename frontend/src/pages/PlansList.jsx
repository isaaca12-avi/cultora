import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { plans as plansApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowRight, ListChecks } from "@phosphor-icons/react";

export default function PlansList() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    plansApi.list().then(setItems);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="font-mono-meta text-terracotta mb-3">tus planes</div>
          <h1 className="font-serif-display text-4xl md:text-5xl">Todos tus planes de acción</h1>
        </div>
        <Link to="/objetivos">
          <Button className="rounded-full bg-obsidian text-alabaster hover:bg-obsidian/90 h-11 px-6 lift">
            Nuevo diagnóstico
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="grid-frame p-12 text-center">
          <ListChecks size={30} weight="duotone" className="text-terracotta mx-auto mb-3" />
          <div className="font-serif-display text-3xl mb-2">Aún no tienes planes</div>
          <p className="text-obsidian/60 max-w-md mx-auto mb-6">
            Cuando termines tu primer diagnóstico verás aquí el plan generado.
          </p>
          <Link to="/objetivos">
            <Button className="rounded-full bg-terracotta text-alabaster hover:bg-terracotta/90 h-11 px-6 lift">
              Empezar
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid-frame divide-y divide-obsidian/10">
          {items.map((p) => {
            const done = p.action_items.filter((i) => i.status === "done").length;
            const total = p.action_items.length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={p.id} to={`/plan/${p.id}`} className="block p-6 md:p-8 lift hover:bg-linen/40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="font-mono-meta text-obsidian/50 mb-1">
                      {new Date(p.created_at).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                    <div className="font-serif-display text-2xl md:text-3xl">{p.goal_title}</div>
                    <div className="text-sm text-obsidian/60 mt-1">{p.action_items.length} tareas · {p.indicators.length} indicadores</div>
                  </div>
                  <div className="text-right">
                    <div className="font-serif-display text-3xl text-terracotta">{pct}%</div>
                    <div className="font-mono-meta text-obsidian/40">completado</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
