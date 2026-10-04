"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Gauge, Hash, Package, Search } from "lucide-react";
import { Badge } from "@/components/ui";
import { STATUS_ATIVO, dataBR, moeda, numero } from "@/lib/format";
import type { Ativo, StatusAtivo } from "@/lib/types";

export type AtivoResumo = Ativo & {
  total_manutencoes: number;
  custo_total: number;
  ultima_manutencao: string | null;
  alertas: number;
  /** Link temporário da foto — o bucket é privado. */
  foto_assinada?: string | null;
};

export function ListaAtivos({ ativos }: { ativos: AtivoResumo[] }) {
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todos" | StatusAtivo>("todos");

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return ativos.filter((a) => {
      if (status !== "todos" && a.status !== status) return false;
      if (!t) return true;
      return [a.nome, a.marca, a.modelo, a.identificacao]
        .filter(Boolean)
        .some((c) => String(c).toLowerCase().includes(t));
    });
  }, [ativos, busca, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, marca, modelo ou placa..."
            className="campo pl-9"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          className="campo sm:w-52"
        >
          <option value="todos">Todas as situações</option>
          {(Object.keys(STATUS_ATIVO) as StatusAtivo[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_ATIVO[s].label}
            </option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm text-slate-500">
          Nenhum ativo encontrado com esses filtros.
        </p>
      ) : (
        <div className="lista-escalonada grid gap-3 lg:grid-cols-2">
          {filtrados.map((a) => (
            <Link
              key={a.id}
              href={`/ativos/${a.id}`}
              className="card cartao-vivo pressionavel group flex items-center gap-4 p-4"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                {a.foto_assinada ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.foto_assinada} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-slate-400" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-semibold text-slate-900">{a.nome}</h3>
                  <Badge className={STATUS_ATIVO[a.status].classe}>{STATUS_ATIVO[a.status].label}</Badge>
                  {a.alertas > 0 && (
                    <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">
                      {a.alertas} alerta{a.alertas > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {[a.marca, a.modelo].filter(Boolean).join(" · ") || "Sem marca/modelo informados"}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {a.identificacao && (
                    <span className="inline-flex items-center gap-1">
                      <Hash className="h-3.5 w-3.5" />
                      {a.identificacao}
                    </span>
                  )}
                  {Number(a.horimetro_atual) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      {numero(a.horimetro_atual)} h/km
                    </span>
                  )}
                  <span>
                    {a.total_manutencoes} manut. · {moeda(a.custo_total)}
                  </span>
                  {a.ultima_manutencao && <span>Última: {dataBR(a.ultima_manutencao)}</span>}
                </div>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-colors group-hover:text-marca-600" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
