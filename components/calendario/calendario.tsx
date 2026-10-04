"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, cn } from "@/components/ui";
import { dataBR, isoLocal, moeda } from "@/lib/format";

export type EventoCalendario = {
  id: string;
  tipo: "realizada" | "programada" | "atrasada";
  data: string;
  titulo: string;
  ativoId: string;
  ativoNome: string;
  categoriaId: string;
  categoriaNome: string;
  categoriaCor: string;
  valor: number | null;
};

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const ESTILO_TIPO = {
  realizada: {
    rotulo: "Realizada",
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    ponto: "#059669",
  },
  programada: {
    rotulo: "Programada",
    chip: "bg-marca-50 text-marca-800 ring-marca-600/20",
    ponto: "#2563eb",
  },
  atrasada: {
    rotulo: "Atrasada",
    chip: "bg-red-50 text-red-800 ring-red-600/20",
    ponto: "#dc2626",
  },
} as const;

export function Calendario({
  eventos,
  categorias,
}: {
  eventos: EventoCalendario[];
  categorias: { id: string; nome: string; cor: string }[];
}) {
  const agora = new Date();
  const [mes, setMes] = useState(new Date(agora.getFullYear(), agora.getMonth(), 1));
  const [categoria, setCategoria] = useState("todas");
  const [tipos, setTipos] = useState<Record<EventoCalendario["tipo"], boolean>>({
    realizada: true,
    programada: true,
    atrasada: true,
  });
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(isoLocal(agora));

  const filtrados = useMemo(
    () =>
      eventos.filter(
        (e) => tipos[e.tipo] && (categoria === "todas" || e.categoriaId === categoria),
      ),
    [eventos, tipos, categoria],
  );

  const porDia = useMemo(() => {
    const m = new Map<string, EventoCalendario[]>();
    for (const e of filtrados) {
      const lista = m.get(e.data) ?? [];
      lista.push(e);
      m.set(e.data, lista);
    }
    return m;
  }, [filtrados]);

  // Grade do mês (começa no domingo)
  const celulas = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [mes]);

  const hojeISO = isoLocal(agora);
  const doMes = filtrados.filter(
    (e) =>
      e.data >= isoLocal(new Date(mes.getFullYear(), mes.getMonth(), 1)) &&
      e.data <= isoLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 0)),
  );

  const resumoMes = {
    realizada: doMes.filter((e) => e.tipo === "realizada").length,
    programada: doMes.filter((e) => e.tipo === "programada").length,
    atrasada: doMes.filter((e) => e.tipo === "atrasada").length,
    custo: doMes.reduce((s, e) => s + Number(e.valor ?? 0), 0),
  };

  const eventosDoDia = diaSelecionado ? (porDia.get(diaSelecionado) ?? []) : [];

  function mover(delta: number) {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => mover(-1)}
            aria-label="Mês anterior"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => mover(1)}
            aria-label="Próximo mês"
            className="rounded-lg border border-slate-300 p-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setMes(new Date(agora.getFullYear(), agora.getMonth(), 1));
              setDiaSelecionado(hojeISO);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Hoje
          </button>
          <h2 className="ml-2 text-base font-semibold capitalize text-slate-900">
            {mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
          </h2>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="campo sm:w-56"
            aria-label="Filtrar por categoria"
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(ESTILO_TIPO) as EventoCalendario["tipo"][]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipos((a) => ({ ...a, [t]: !a[t] }))}
                aria-pressed={tipos[t]}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  tipos[t]
                    ? "border-slate-300 bg-superficie text-slate-700"
                    : "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tipos[t] ? ESTILO_TIPO[t].ponto : "#cbd5e1" }}
                />
                {ESTILO_TIPO[t].rotulo}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ResumoCartao rotulo="Realizadas no mês" valor={String(resumoMes.realizada)} cor="#059669" />
        <ResumoCartao rotulo="Programadas" valor={String(resumoMes.programada)} cor="#2563eb" />
        <ResumoCartao rotulo="Atrasadas" valor={String(resumoMes.atrasada)} cor="#dc2626" />
        <ResumoCartao rotulo="Custo no mês" valor={moeda(resumoMes.custo)} cor="#64748b" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        {/* Grade */}
        <div className="card overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {DIAS.map((d) => (
              <div
                key={d}
                className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500"
              >
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {celulas.map((d) => {
              const iso = isoLocal(d);
              const doMesAtual = d.getMonth() === mes.getMonth();
              const eventosDia = porDia.get(iso) ?? [];
              const ehHoje = iso === hojeISO;
              const selecionado = iso === diaSelecionado;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setDiaSelecionado(iso)}
                  className={cn(
                    "min-h-20 border-b border-r border-slate-100 p-1.5 text-left align-top transition-colors sm:min-h-28 sm:p-2",
                    !doMesAtual && "bg-slate-50/60",
                    selecionado ? "bg-marca-50 ring-1 ring-inset ring-marca-400" : "hover:bg-slate-50",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      ehHoje
                        ? "bg-marca-600 text-white"
                        : doMesAtual
                          ? "text-slate-700"
                          : "text-slate-400",
                    )}
                  >
                    {d.getDate()}
                  </span>

                  <div className="mt-1 space-y-0.5">
                    {eventosDia.slice(0, 2).map((e) => (
                      <span
                        key={e.id}
                        className={cn(
                          "flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] font-medium ring-1 ring-inset sm:text-[11px]",
                          ESTILO_TIPO[e.tipo].chip,
                        )}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: e.categoriaCor }}
                        />
                        <span className="truncate">{e.titulo}</span>
                      </span>
                    ))}
                    {eventosDia.length > 2 && (
                      <span className="block px-1 text-[10px] font-medium text-slate-500">
                        +{eventosDia.length - 2} mais
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel do dia */}
        <aside className="card flex flex-col p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            {diaSelecionado ? dataBR(diaSelecionado) : "Selecione um dia"}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {eventosDoDia.length} evento{eventosDoDia.length === 1 ? "" : "s"} neste dia
          </p>

          {eventosDoDia.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <CalendarDays className="h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">Nenhuma manutenção neste dia.</p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {eventosDoDia.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/ativos/${e.ativoId}`}
                    className="block rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={ESTILO_TIPO[e.tipo].chip}>{ESTILO_TIPO[e.tipo].rotulo}</Badge>
                      {e.valor !== null && (
                        <span className="text-sm font-semibold text-slate-900">{moeda(e.valor)}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-900">{e.titulo}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{e.ativoNome}</p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: e.categoriaCor }}
                      />
                      {e.categoriaNome}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}

function ResumoCartao({ rotulo, valor, cor }: { rotulo: string; valor: string; cor: string }) {
  return (
    <div className="card min-w-0 p-3.5 sm:p-4">
      <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
        {rotulo}
      </p>
      <p className="mt-1 truncate text-lg font-semibold text-slate-900 sm:mt-1.5 sm:text-xl">{valor}</p>
    </div>
  );
}
