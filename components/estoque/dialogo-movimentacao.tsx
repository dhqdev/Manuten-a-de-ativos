"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, LoaderCircle } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo, cn } from "@/components/ui";
import { movimentarPneu } from "@/lib/actions/pneus";
import { TIPOS_MOV_PNEU, hoje } from "@/lib/format";
import type { Pneu, StatusPneu, TipoMovPneu } from "@/lib/types";

/** O que faz sentido para cada situação do pneu. O banco confere de novo. */
const PERMITIDOS: Record<StatusPneu, TipoMovPneu[]> = {
  estoque: ["instalacao", "inspecao", "recapagem", "descarte"],
  em_uso: ["remocao", "inspecao", "recapagem", "descarte"],
  recapagem: ["retorno", "descarte"],
  descartado: [],
};

const POSICOES = [
  "Dianteiro esquerdo",
  "Dianteiro direito",
  "Eixo 2 · Esquerdo externo",
  "Eixo 2 · Esquerdo interno",
  "Eixo 2 · Direito interno",
  "Eixo 2 · Direito externo",
  "Eixo 3 · Esquerdo externo",
  "Eixo 3 · Esquerdo interno",
  "Eixo 3 · Direito interno",
  "Eixo 3 · Direito externo",
  "Estepe",
];

export function DialogoMovimentacao({
  pneu,
  ativos,
}: {
  pneu: Pneu;
  ativos: { id: string; nome: string; identificacao: string | null; horimetro_atual: number }[];
}) {
  const router = useRouter();
  const opcoes = PERMITIDOS[pneu.status];
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoMovPneu>(opcoes[0] ?? "inspecao");
  const [ativoId, setAtivoId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  if (!opcoes.length) return null;

  const montado = pneu.status === "em_uso";
  const pedeVeiculo = tipo === "instalacao";
  const pedeKm = tipo === "instalacao" || (montado && ["remocao", "recapagem", "descarte"].includes(tipo));
  const pedeValor = tipo === "recapagem" || tipo === "retorno";
  const pedeSulco = tipo !== "descarte";

  const ativoSelecionado = ativos.find((a) => a.id === (pedeVeiculo ? ativoId : pneu.ativo_id));

  function abrir() {
    setTipo(opcoes[0]);
    setAtivoId("");
    setErro(null);
    setAberto(true);
  }

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await movimentarPneu(fd);
      if (!r.ok) setErro(r.erro);
      else {
        setAberto(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Botao variante="secundario" tamanho="sm" onClick={abrir}>
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Movimentar
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={() => !enviando && setAberto(false)}
        titulo={`Movimentar pneu ${pneu.numero_fogo}`}
        descricao={`${pneu.marca} · ${pneu.medida}`}
        largura="max-w-lg"
      >
        <form action={enviar}>
          <input type="hidden" name="pneu_id" value={pneu.id} />
          <input type="hidden" name="tipo" value={tipo} />

          <div className="space-y-4 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              {opcoes.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={cn(
                    "pressionavel rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all",
                    tipo === t
                      ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                    t === "descarte" && tipo === t && "border-red-600 bg-red-600",
                  )}
                >
                  {TIPOS_MOV_PNEU[t]}
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Data" obrigatorio>
                <input name="data" type="date" required defaultValue={hoje()} className="campo" />
              </Campo>

              {pedeVeiculo && (
                <Campo label="Veículo" obrigatorio className="sm:col-span-2">
                  <select
                    name="ativo_id"
                    required
                    value={ativoId}
                    onChange={(e) => setAtivoId(e.target.value)}
                    className="campo"
                  >
                    <option value="" disabled>
                      Selecione...
                    </option>
                    {ativos.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                        {a.identificacao ? ` — ${a.identificacao}` : ""}
                      </option>
                    ))}
                  </select>
                </Campo>
              )}

              {pedeVeiculo && (
                <Campo label="Posição" className="sm:col-span-2">
                  <input name="posicao" list="posicoes-pneu" placeholder="Ex.: Eixo 2 · Direito externo" className="campo" />
                  <datalist id="posicoes-pneu">
                    {POSICOES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </Campo>
              )}

              {pedeKm && (
                <Campo
                  label="KM / horímetro do veículo"
                  hint={
                    ativoSelecionado
                      ? `Último registrado: ${Number(ativoSelecionado.horimetro_atual).toLocaleString("pt-BR")}`
                      : "Usado para calcular quanto o pneu rodou."
                  }
                >
                  <input name="horimetro" inputMode="decimal" placeholder="Ex.: 125000" className="campo" />
                </Campo>
              )}

              {pedeSulco && (
                <Campo label="Sulco medido (mm)">
                  <input name="sulco_mm" inputMode="decimal" placeholder="Ex.: 8,5" className="campo" />
                </Campo>
              )}

              {pedeValor && (
                <Campo label="Custo (R$)">
                  <input name="valor" inputMode="decimal" placeholder="0,00" className="campo" />
                </Campo>
              )}

              <Campo label="Observações" className="sm:col-span-2">
                <textarea name="observacoes" rows={2} className="campo" />
              </Campo>
            </div>
          </div>

          <RodapeModal>
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao type="submit" variante={tipo === "descarte" ? "perigo" : "primario"} disabled={enviando}>
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Registrar
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </>
  );
}
