"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CalendarDays, Gauge, Pause, Play, Repeat, Search, User, Wallet } from "lucide-react";
import { BotaoExcluir } from "@/components/confirmar";
import { DialogoPlano } from "@/components/planos/dialogo-plano";
import { DialogoManutencao } from "@/components/manutencoes/dialogo-manutencao";
import { Badge, cn } from "@/components/ui";
import { alternarPlano, excluirPlano } from "@/lib/actions/planos";
import {
  SITUACAO_PLANO,
  dataBR,
  descreverPeriodicidade,
  descreverPrazo,
  moeda,
  numero,
} from "@/lib/format";
import type { PlanoStatus, SituacaoPlano } from "@/lib/types";

export function ListaPlanos({
  planos,
  orgId,
  ativos,
  mostrarAtivo = false,
  comFiltros = true,
  filtroInicial = "todos",
}: {
  planos: PlanoStatus[];
  orgId: string;
  ativos: { id: string; nome: string; identificacao: string | null }[];
  mostrarAtivo?: boolean;
  comFiltros?: boolean;
  filtroInicial?: "todos" | SituacaoPlano | "alertas";
}) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<"todos" | SituacaoPlano | "alertas">(filtroInicial);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const ordem: Record<SituacaoPlano, number> = { atrasada: 0, proxima: 1, em_dia: 2, inativo: 3 };

    return planos
      .filter((p) => {
        if (situacao === "alertas" && p.situacao !== "atrasada" && p.situacao !== "proxima") return false;
        if (situacao !== "todos" && situacao !== "alertas" && p.situacao !== situacao) return false;
        if (!t) return true;
        return [p.tipo, p.ativo_nome, p.responsavel, p.categoria_nome]
          .filter(Boolean)
          .some((c) => String(c).toLowerCase().includes(t));
      })
      .sort((a, b) => {
        const d = ordem[a.situacao] - ordem[b.situacao];
        if (d !== 0) return d;
        return (a.proxima_data ?? "9999").localeCompare(b.proxima_data ?? "9999");
      });
  }, [planos, busca, situacao]);

  return (
    <div className="space-y-4">
      {comFiltros && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por tipo, ativo ou responsável..."
              className="campo pl-9"
            />
          </div>
          <select
            value={situacao}
            onChange={(e) => setSituacao(e.target.value as typeof situacao)}
            className="campo sm:w-56"
          >
            <option value="todos">Todas as situações</option>
            <option value="alertas">Somente alertas</option>
            <option value="atrasada">Atrasadas</option>
            <option value="proxima">Vencendo em breve</option>
            <option value="em_dia">Em dia</option>
            <option value="inativo">Pausadas</option>
          </select>
        </div>
      )}

      {filtrados.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm text-slate-500">
          Nenhuma manutenção periódica encontrada.
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {filtrados.map((p) => (
            <CartaoPlano key={p.id} plano={p} orgId={orgId} ativos={ativos} mostrarAtivo={mostrarAtivo} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoPlano({
  plano: p,
  orgId,
  ativos,
  mostrarAtivo,
}: {
  plano: PlanoStatus;
  orgId: string;
  ativos: { id: string; nome: string; identificacao: string | null }[];
  mostrarAtivo: boolean;
}) {
  const [alternando, iniciar] = useTransition();
  const s = SITUACAO_PLANO[p.situacao];
  const porHoras = p.periodicidade_unidade === "horas";

  const borda =
    p.situacao === "atrasada"
      ? "border-l-4 border-l-red-500"
      : p.situacao === "proxima"
        ? "border-l-4 border-l-amber-500"
        : p.situacao === "inativo"
          ? "border-l-4 border-l-slate-300"
          : "border-l-4 border-l-emerald-500";

  return (
    <li className={cn("card p-3.5 sm:p-4", borda, p.situacao === "inativo" && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={s.classe}>{s.label}</Badge>
            {mostrarAtivo && (
              <Link
                href={`/ativos/${p.ativo_id}`}
                className="truncate text-xs font-medium text-marca-600 hover:text-marca-700"
              >
                {p.ativo_nome}
              </Link>
            )}
          </div>

          <h3 className="mt-1.5 font-semibold text-slate-900">{p.tipo}</h3>

          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
            <Repeat className="h-3.5 w-3.5" />
            {descreverPeriodicidade(p.periodicidade_valor, p.periodicidade_unidade)}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            disabled={alternando}
            onClick={() => iniciar(async () => void (await alternarPlano(p.id, !p.ativo)))}
            title={p.ativo ? "Pausar plano" : "Reativar plano"}
            aria-label={p.ativo ? "Pausar plano" : "Reativar plano"}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            {p.ativo ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <DialogoPlano ativos={ativos} plano={p} />
          <BotaoExcluir
            compacto
            acao={excluirPlano.bind(null, p.id)}
            titulo="Excluir plano preventivo"
            mensagem={`O plano "${p.tipo}" deixará de gerar alertas. O histórico de manutenções não é afetado.`}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:mt-4">
        <div>
          <p className="text-xs text-slate-500">
            {porHoras ? "Próxima no horímetro" : "Próxima manutenção"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 font-medium text-slate-900">
            {porHoras ? <Gauge className="h-4 w-4 text-slate-400" /> : <CalendarDays className="h-4 w-4 text-slate-400" />}
            {porHoras ? `${numero(p.proximo_horimetro)} h/km` : dataBR(p.proxima_data)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{porHoras ? "Faltam" : "Prazo"}</p>
          <p
            className={cn(
              "mt-0.5 font-medium",
              p.situacao === "atrasada"
                ? "text-red-600"
                : p.situacao === "proxima"
                  ? "text-amber-600"
                  : "text-slate-900",
            )}
          >
            {porHoras
              ? p.horas_restantes !== null && p.horas_restantes !== undefined
                ? `${numero(p.horas_restantes)} h`
                : "—"
              : descreverPrazo(p.dias_restantes)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          {p.responsavel && (
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {p.responsavel}
            </span>
          )}
          {p.custo_estimado ? (
            <span className="inline-flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" />
              {moeda(p.custo_estimado)} estimado
            </span>
          ) : null}
          {p.ultima_data && <span>Última: {dataBR(p.ultima_data)}</span>}
        </div>

        <DialogoManutencao
          orgId={orgId}
          ativos={ativos}
          ativoPadrao={p.ativo_id}
          planos={[{ id: p.id, tipo: p.tipo, ativo_id: p.ativo_id }]}
          planoPadrao={p.id}
          rotulo="Dar baixa"
          variante="secundario"
          tamanho="sm"
        />
      </div>
    </li>
  );
}
