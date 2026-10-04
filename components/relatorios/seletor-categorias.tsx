"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/components/ui";

type Categoria = { id: string; nome: string; cor: string };

/**
 * Escolha de uma, várias ou todas as categorias. Lista vazia = todas — assim
 * uma categoria nova entra no filtro "Todas" sem ninguém precisar marcar.
 */
export function SeletorCategorias({
  categorias,
  selecionadas,
  aoMudar,
}: {
  categorias: Categoria[];
  selecionadas: string[];
  aoMudar: (ids: string[]) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (!raiz.current?.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);

  function alternar(id: string) {
    const novo = selecionadas.includes(id)
      ? selecionadas.filter((s) => s !== id)
      : [...selecionadas, id];
    // Marcou todas uma a uma: é o mesmo que "Todas".
    aoMudar(novo.length === categorias.length ? [] : novo);
  }

  const escolhidas = categorias.filter((c) => selecionadas.includes(c.id));
  const rotulo =
    escolhidas.length === 0
      ? "Todas as categorias"
      : escolhidas.length === 1
        ? escolhidas[0].nome
        : `${escolhidas.length} categorias`;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="campo flex items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {escolhidas.slice(0, 4).map((c) => (
            <span
              key={c.id}
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: c.cor }}
              aria-hidden
            />
          ))}
          <span className="truncate">{rotulo}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", aberto && "rotate-180")}
        />
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="pop-in absolute left-0 right-0 z-30 mt-1.5 max-h-72 min-w-56 overflow-y-auto rounded-xl border border-slate-200 bg-superficie p-1.5 shadow-elevada"
        >
          <Opcao marcado={selecionadas.length === 0} aoClicar={() => aoMudar([])}>
            <span className="font-medium">Todas as categorias</span>
          </Opcao>
          <div className="my-1 h-px bg-slate-100" />
          {categorias.map((c) => (
            <Opcao key={c.id} marcado={selecionadas.includes(c.id)} aoClicar={() => alternar(c.id)}>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.cor }} aria-hidden />
              <span className="truncate">{c.nome}</span>
            </Opcao>
          ))}
        </div>
      )}
    </div>
  );
}

function Opcao({
  marcado,
  aoClicar,
  children,
}: {
  marcado: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={marcado}
      onClick={aoClicar}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          marcado ? "border-slate-900 bg-slate-900 text-slate-50" : "border-slate-300 bg-superficie",
        )}
      >
        {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}
