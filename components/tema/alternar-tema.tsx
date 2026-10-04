"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/components/ui";
import type { Tema } from "@/lib/tema";
import { useTema } from "./use-tema";

/** Botão de um toque: alterna entre claro e escuro. */
export function AlternarTema({ className }: { className?: string }) {
  const { escuro, escolher } = useTema();

  return (
    <button
      type="button"
      onClick={() => escolher(escuro ? "claro" : "escuro")}
      className={cn("pressionavel rounded-lg p-2 transition-colors", className)}
      aria-label={escuro ? "Usar modo claro" : "Usar modo escuro"}
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      {escuro ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}

const OPCOES: { id: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { id: "claro", rotulo: "Claro", Icone: Sun },
  { id: "escuro", rotulo: "Escuro", Icone: Moon },
  { id: "sistema", rotulo: "Automático", Icone: Monitor },
];

/** Três opções lado a lado, para a tela de configurações. */
export function SeletorTema() {
  const { tema, escolher } = useTema();

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Aparência">
      {OPCOES.map(({ id, rotulo, Icone }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={tema === id}
          onClick={() => escolher(id)}
          className={cn(
            "pressionavel flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[13px] font-medium",
            tema === id
              ? "border-slate-900 bg-slate-900 text-slate-50"
              : "border-slate-200 bg-superficie text-slate-600 hover:border-slate-300",
          )}
        >
          <Icone className="h-5 w-5" />
          {rotulo}
        </button>
      ))}
    </div>
  );
}
