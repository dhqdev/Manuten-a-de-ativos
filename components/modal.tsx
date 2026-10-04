"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/components/ui";

/**
 * No celular vira uma folha que sobe da borda inferior (com alça de arrasto);
 * no desktop, um diálogo centrado. É o mesmo componente — muda só a moldura.
 */
export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  largura = "max-w-2xl",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  largura?: string;
}) {
  const painel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;

    const esc = (e: KeyboardEvent) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", esc);

    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco entra no painel: leitor de tela e teclado não ficam presos atrás.
    painel.current?.focus();

    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = anterior;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="veu absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={aoFechar}
        aria-hidden
      />

      <div
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={cn(
          "folha relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-superficie shadow-xl outline-none",
          "sm:dialogo sm:max-h-[88dvh] sm:rounded-2xl",
          largura,
        )}
      >
        {/* Alça: só faz sentido na folha do celular */}
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
          <span className="h-1 w-9 rounded-full bg-slate-300" />
        </div>

        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 pb-4 pt-3 sm:pt-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
            {descricao && <p className="mt-0.5 text-sm text-slate-500">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="-mr-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}

export function RodapeModal({ children }: { children: ReactNode }) {
  return (
    <div className="area-segura-inferior sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}
