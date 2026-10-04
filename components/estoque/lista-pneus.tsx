"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleDot, History, LoaderCircle, Search, TriangleAlert } from "lucide-react";
import { BotaoExcluir } from "@/components/confirmar";
import { DialogoMovimentacao } from "@/components/estoque/dialogo-movimentacao";
import { DialogoPneu } from "@/components/estoque/dialogo-pneu";
import { Modal } from "@/components/modal";
import { Badge, cn } from "@/components/ui";
import { excluirPneu, historicoDoPneu } from "@/lib/actions/pneus";
import { CONDICAO_PNEU, SULCO_ALERTA_MM, STATUS_PNEU, TIPOS_MOV_PNEU, dataBR, moeda, numero } from "@/lib/format";
import type { MovimentacaoPneu, Pneu, StatusPneu } from "@/lib/types";


type AtivoOpcao = { id: string; nome: string; identificacao: string | null; horimetro_atual: number };
export type PneuComVeiculo = Pneu & { ativo_nome: string | null };

const FILTROS: { id: "todos" | StatusPneu | "alerta"; rotulo: string }[] = [
  { id: "todos", rotulo: "Todos" },
  { id: "estoque", rotulo: "Em estoque" },
  { id: "em_uso", rotulo: "Em uso" },
  { id: "recapagem", rotulo: "Na recapagem" },
  { id: "alerta", rotulo: "Sulco baixo" },
  { id: "descartado", rotulo: "Descartados" },
];

export function ListaPneus({
  pneus,
  ativos,
  gestor,
  registra,
}: {
  pneus: PneuComVeiculo[];
  ativos: AtivoOpcao[];
  gestor: boolean;
  registra: boolean;
}) {
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");
  const [busca, setBusca] = useState("");
  const [historico, setHistorico] = useState<PneuComVeiculo | null>(null);

  const sulcoBaixo = (p: Pneu) =>
    p.status !== "descartado" && p.sulco_atual_mm !== null && Number(p.sulco_atual_mm) <= SULCO_ALERTA_MM;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return pneus.filter((p) => {
      if (filtro === "alerta" ? !sulcoBaixo(p) : filtro !== "todos" && p.status !== filtro) return false;
      if (filtro === "todos" && p.status === "descartado") return false;
      if (!termo) return true;
      return [p.numero_fogo, p.marca, p.modelo, p.medida, p.ativo_nome, p.posicao, p.localizacao]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    });
  }, [pneus, filtro, busca]);

  const contar = (id: (typeof FILTROS)[number]["id"]) =>
    id === "todos"
      ? pneus.filter((p) => p.status !== "descartado").length
      : id === "alerta"
        ? pneus.filter(sulcoBaixo).length
        : pneus.filter((p) => p.status === id).length;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={cn(
                "pressionavel flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                filtro === f.id ? "bg-slate-900 text-slate-50 shadow-sm" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {f.rotulo}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  filtro === f.id ? "bg-slate-50/20" : "bg-slate-100 text-slate-500",
                )}
              >
                {contar(f.id)}
              </span>
            </button>
          ))}
        </div>
        <label className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar nº de fogo, medida, veículo..."
            className="campo pl-9"
          />
        </label>
      </div>

      {visiveis.length === 0 ? (
        <p className="px-5 py-14 text-center text-sm text-slate-500">Nenhum pneu nesse filtro.</p>
      ) : (
        <ul className="lista-escalonada divide-y divide-slate-100">
          {visiveis.map((p) => {
            const alerta = sulcoBaixo(p);
            const desgaste =
              p.sulco_inicial_mm && p.sulco_atual_mm !== null
                ? Math.min(Math.max(Number(p.sulco_atual_mm) / Number(p.sulco_inicial_mm), 0), 1)
                : null;

            return (
              <li key={p.id} className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-4"
                    style={{
                      backgroundColor: `${STATUS_PNEU[p.status].cor}14`,
                      color: STATUS_PNEU[p.status].cor,
                      boxShadow: `inset 0 0 0 3px ${STATUS_PNEU[p.status].cor}55`,
                    }}
                    aria-hidden
                  >
                    <CircleDot className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="font-mono tracking-wide">{p.numero_fogo}</span>
                      <Badge className={STATUS_PNEU[p.status].classe}>{STATUS_PNEU[p.status].label}</Badge>
                      {alerta && (
                        <Badge className="bg-red-50 text-red-700 ring-red-600/20">
                          <TriangleAlert className="h-3 w-3" />
                          Sulco baixo
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {p.marca}
                      {p.modelo ? ` ${p.modelo}` : ""} · {p.medida} · {CONDICAO_PNEU[p.condicao]}
                      {p.recapagens > 0 ? ` (${p.recapagens}x)` : ""}
                      {p.dot ? ` · DOT ${p.dot}` : ""}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {p.status === "em_uso"
                        ? `Em ${p.ativo_nome ?? "veículo"}${p.posicao ? ` · ${p.posicao}` : ""}`
                        : p.localizacao
                          ? `Local: ${p.localizacao}`
                          : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-5 sm:gap-6">
                  <Medida rotulo="Sulco" valor={p.sulco_atual_mm !== null ? `${numero(p.sulco_atual_mm, 1)} mm` : "—"}>
                    {desgaste !== null && (
                      <span className="mt-1 block h-1 w-14 overflow-hidden rounded-full bg-slate-200">
                        <span
                          className={cn("block h-full rounded-full", alerta ? "bg-red-500" : desgaste < 0.5 ? "bg-amber-500" : "bg-emerald-500")}
                          style={{ width: `${desgaste * 100}%` }}
                        />
                      </span>
                    )}
                  </Medida>
                  <Medida rotulo="Rodou" valor={`${numero(p.km_rodados)} km`} />
                  <Medida rotulo="Valor" valor={p.valor_compra ? moeda(p.valor_compra) : "—"} />
                </div>

                <div className="flex items-center gap-1 sm:justify-end">
                  {registra && <DialogoMovimentacao pneu={p} ativos={ativos} />}
                  <button
                    type="button"
                    onClick={() => setHistorico(p)}
                    title="Histórico"
                    aria-label="Histórico"
                    className="pressionavel rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  {gestor && <DialogoPneu pneu={p} />}
                  {gestor && (
                    <BotaoExcluir
                      compacto
                      acao={excluirPneu.bind(null, p.id)}
                      titulo="Excluir pneu"
                      mensagem={`O pneu ${p.numero_fogo} e todo o histórico dele serão apagados. Para tirar de circulação mantendo o histórico, use "Movimentar → Descarte".`}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <HistoricoPneu pneu={historico} aoFechar={() => setHistorico(null)} />
    </div>
  );
}

function Medida({ rotulo, valor, children }: { rotulo: string; valor: string; children?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{rotulo}</p>
      <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-800">{valor}</p>
      {children}
    </div>
  );
}

function HistoricoPneu({ pneu, aoFechar }: { pneu: PneuComVeiculo | null; aoFechar: () => void }) {
  const [itens, setItens] = useState<(MovimentacaoPneu & { ativo_nome: string | null })[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const pneuId = pneu?.id ?? null;

  useEffect(() => {
    if (!pneuId) return;
    let ativo = true;
    setItens(null);
    setErro(null);
    historicoDoPneu(pneuId).then((r) => {
      if (!ativo) return;
      if (r.ok) setItens(r.itens);
      else setErro(r.erro);
    });
    return () => {
      ativo = false;
    };
  }, [pneuId]);

  const carregando = !itens && !erro;

  return (
    <Modal
      aberto={Boolean(pneu)}
      aoFechar={aoFechar}
      titulo={pneu ? `Histórico do pneu ${pneu.numero_fogo}` : "Histórico"}
      descricao={pneu ? `${pneu.marca} · ${pneu.medida}` : undefined}
      largura="max-w-lg"
    >
      <div className="px-5 py-5">
        {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
        {carregando ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Carregando...
          </p>
        ) : !itens || itens.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <ol className="lista-escalonada relative space-y-4 border-l border-slate-200 pl-5">
            {itens.map((i) => (
              <li key={i.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-900 ring-4 ring-white" />
                <p className="text-sm font-medium text-slate-900">{TIPOS_MOV_PNEU[i.tipo]}</p>
                <p className="text-xs text-slate-500">
                  {dataBR(i.data)}
                  {i.ativo_nome ? ` · ${i.ativo_nome}` : ""}
                  {i.posicao ? ` · ${i.posicao}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  {[
                    i.horimetro !== null ? `KM ${numero(i.horimetro)}` : null,
                    i.sulco_mm !== null ? `Sulco ${numero(i.sulco_mm, 1)} mm` : null,
                    i.valor ? moeda(i.valor) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {i.observacoes && <p className="mt-0.5 text-xs italic text-slate-500">{i.observacoes}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
