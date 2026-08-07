"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Trash2, TriangleAlert } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, cn } from "@/components/ui";
import type { Resultado } from "@/lib/form";

export function BotaoExcluir({
  acao,
  titulo,
  mensagem,
  rotulo,
  className,
  compacto = false,
  aoConcluir,
}: {
  acao: () => Promise<Resultado>;
  titulo: string;
  mensagem: string;
  rotulo?: string;
  className?: string;
  compacto?: boolean;
  aoConcluir?: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function confirmar() {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro);
      else {
        setAberto(false);
        aoConcluir?.();
      }
    });
  }

  return (
    <>
      {compacto ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          title={titulo}
          aria-label={titulo}
          className={cn(
            "rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600",
            className,
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : (
        <Botao variante="secundario" tamanho="sm" onClick={() => setAberto(true)} className={className}>
          <Trash2 className="h-4 w-4" />
          {rotulo ?? "Excluir"}
        </Botao>
      )}

      <Modal
        aberto={aberto}
        aoFechar={() => !processando && setAberto(false)}
        titulo={titulo}
        largura="max-w-md"
      >
        <div className="flex gap-4 px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-slate-600">{mensagem}</p>
            {erro && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}
          </div>
        </div>
        <RodapeModal>
          <Botao variante="secundario" onClick={() => setAberto(false)} disabled={processando}>
            Cancelar
          </Botao>
          <Botao variante="perigo" onClick={confirmar} disabled={processando}>
            {processando && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Excluir
          </Botao>
        </RodapeModal>
      </Modal>
    </>
  );
}
