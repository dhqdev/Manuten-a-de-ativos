"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { excluirConta } from "@/lib/actions/conta";

export function ZonaPerigo({
  email,
  empresasQueSeraoApagadas,
  empresasQueSeraoTransferidas,
}: {
  email: string;
  empresasQueSeraoApagadas: string[];
  empresasQueSeraoTransferidas: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await excluirConta(fd);
      if (!r.ok) setErro(r.erro);
    });
  }

  return (
    <section className="card overflow-hidden border-red-200">
      <header className="border-b border-red-200 bg-red-50/60 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <TriangleAlert className="h-4 w-4" />
          Excluir conta
        </h2>
      </header>

      <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <p className="max-w-2xl text-sm text-slate-600">
          Apaga permanentemente seu acesso e todos os dados das empresas em que você é a única
          pessoa: ativos, manutenções, fotos, planos e conexão de WhatsApp.{" "}
          <strong className="text-slate-800">Não há como desfazer.</strong>
        </p>
        <Botao variante="perigo" onClick={() => setAberto(true)} className="shrink-0">
          Excluir minha conta
        </Botao>
      </div>

      <Modal
        aberto={aberto}
        aoFechar={() => !processando && setAberto(false)}
        titulo="Excluir conta permanentemente"
        largura="max-w-lg"
      >
        <form action={enviar}>
          <div className="space-y-4 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            {empresasQueSeraoApagadas.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
                <p className="text-sm font-medium text-red-800">
                  Estas empresas serão apagadas por completo:
                </p>
                <ul className="mt-1.5 list-inside list-disc text-sm text-red-700">
                  {empresasQueSeraoApagadas.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-red-700">
                  Todos os ativos, manutenções, fotos e relatórios delas vão junto.
                </p>
              </div>
            )}

            {empresasQueSeraoTransferidas.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3">
                <p className="text-sm font-medium text-amber-800">
                  Nestas empresas você apenas sai — os dados permanecem:
                </p>
                <ul className="mt-1.5 list-inside list-disc text-sm text-amber-700">
                  {empresasQueSeraoTransferidas.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-amber-700">
                  Se você for a pessoa proprietária, a mais antiga da equipe assume no seu lugar.
                </p>
              </div>
            )}

            <Campo label={`Para confirmar, digite ${email}`} obrigatorio>
              <input
                name="confirmacao"
                required
                autoComplete="off"
                placeholder={email}
                className="campo"
              />
            </Campo>
          </div>

          <RodapeModal>
            <Botao
              type="button"
              variante="secundario"
              onClick={() => setAberto(false)}
              disabled={processando}
            >
              Cancelar
            </Botao>
            <Botao type="submit" variante="perigo" disabled={processando}>
              {processando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Excluir permanentemente
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </section>
  );
}
