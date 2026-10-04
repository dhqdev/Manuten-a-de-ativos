"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui";

export function Abas({
  abas,
  inicial = 0,
}: {
  abas: { id: string; rotulo: string; contador?: number; conteudo: ReactNode }[];
  inicial?: number;
}) {
  const [atual, setAtual] = useState(abas[inicial]?.id ?? abas[0]?.id);

  return (
    <div>
      <div className="no-print -mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 [scrollbar-width:none] sm:mx-0 sm:mb-5 sm:px-0">
        {abas.map((a) => {
          const sel = a.id === atual;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setAtual(a.id)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors sm:px-4 sm:text-sm",
                sel
                  ? "border-marca-600 text-marca-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              {a.rotulo}
              {a.contador !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none",
                    sel ? "bg-marca-100 text-marca-700" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {a.contador}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {abas.map((a) => (
        <div key={a.id} hidden={a.id !== atual}>
          {a.conteudo}
        </div>
      ))}
    </div>
  );
}
