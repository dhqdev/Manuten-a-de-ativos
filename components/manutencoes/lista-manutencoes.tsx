"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ClipboardList,
  ExternalLink,
  FileText,
  Image as ImagemIcone,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { BotaoExcluir } from "@/components/confirmar";
import { DialogoManutencao } from "@/components/manutencoes/dialogo-manutencao";
import { Badge, cn } from "@/components/ui";
import { excluirManutencao } from "@/lib/actions/manutencoes";
import { TIPOS_MANUTENCAO, dataBR, moeda, numero, paraData } from "@/lib/format";
import type { Manutencao, PlanoManutencao, TipoManutencao } from "@/lib/types";

export type AnexoComUrl = {
  id: string;
  manutencao_id: string;
  nome: string;
  tipo_mime: string | null;
  url: string | null;
};

export type ItemManutencao = Manutencao & {
  ativo_nome?: string;
  categoria_nome?: string;
  categoria_cor?: string;
};

const COR_TIPO: Record<TipoManutencao, string> = {
  preventiva: "bg-marca-50 text-marca-700 ring-marca-600/20",
  corretiva: "bg-orange-50 text-orange-700 ring-orange-600/20",
  preditiva: "bg-violet-50 text-violet-700 ring-violet-600/20",
  inspecao: "bg-cyan-50 text-cyan-700 ring-cyan-600/20",
  melhoria: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export function ListaManutencoes({
  manutencoes,
  anexos,
  orgId,
  ativos,
  planos,
  mostrarAtivo = false,
  comBusca = true,
}: {
  manutencoes: ItemManutencao[];
  anexos: AnexoComUrl[];
  orgId: string;
  ativos: { id: string; nome: string; identificacao: string | null }[];
  planos: Pick<PlanoManutencao, "id" | "tipo" | "ativo_id">[];
  mostrarAtivo?: boolean;
  comBusca?: boolean;
}) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState<"todos" | TipoManutencao>("todos");
  const [expandido, setExpandido] = useState<string | null>(null);

  const porManutencao = useMemo(() => {
    const m = new Map<string, AnexoComUrl[]>();
    for (const a of anexos) {
      const lista = m.get(a.manutencao_id) ?? [];
      lista.push(a);
      m.set(a.manutencao_id, lista);
    }
    return m;
  }, [anexos]);

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    return manutencoes.filter((m) => {
      if (tipo !== "todos" && m.tipo !== tipo) return false;
      if (!t) return true;
      return [m.descricao, m.pecas, m.responsavel, m.empresa, m.ativo_nome, m.nota_fiscal]
        .filter(Boolean)
        .some((c) => String(c).toLowerCase().includes(t));
    });
  }, [manutencoes, busca, tipo]);

  const total = filtradas.reduce((s, m) => s + Number(m.valor ?? 0), 0);

  return (
    <div className="space-y-4">
      {comBusca && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por serviço, peça, responsável ou prestador..."
              className="campo pl-9"
            />
          </div>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as typeof tipo)}
            className="campo sm:w-48"
          >
            <option value="todos">Todos os tipos</option>
            {(Object.keys(TIPOS_MANUTENCAO) as TipoManutencao[]).map((t) => (
              <option key={t} value={t}>
                {TIPOS_MANUTENCAO[t]}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtradas.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm text-slate-500">
          Nenhuma manutenção registrada.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg bg-slate-100 px-4 py-2.5 text-sm">
            <span className="text-slate-600">
              {filtradas.length} manutenç{filtradas.length === 1 ? "ão" : "ões"}
            </span>
            <span className="font-semibold text-slate-900">Total: {moeda(total)}</span>
          </div>

          <ul className="space-y-3">
            {filtradas.map((m) => {
              const anexosDaLinha = porManutencao.get(m.id) ?? [];
              const aberto = expandido === m.id;
              const garantiaAtiva =
                m.garantia_ate && (paraData(m.garantia_ate)?.getTime() ?? 0) >= Date.now() - 86400000;

              return (
                <li key={m.id} className="card overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-slate-100 py-2 text-center">
                      <span className="text-[11px] font-medium uppercase leading-none text-slate-500">
                        {paraData(m.data_manutencao)
                          ?.toLocaleDateString("pt-BR", { month: "short" })
                          .replace(".", "")}
                      </span>
                      <span className="text-lg font-semibold leading-tight text-slate-900">
                        {paraData(m.data_manutencao)?.getDate()}
                      </span>
                      <span className="text-[11px] leading-none text-slate-500">
                        {paraData(m.data_manutencao)?.getFullYear()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={COR_TIPO[m.tipo]}>{TIPOS_MANUTENCAO[m.tipo]}</Badge>
                        {mostrarAtivo && m.ativo_nome && (
                          <Link
                            href={`/ativos/${m.ativo_id}`}
                            className="text-xs font-medium text-marca-600 hover:text-marca-700"
                          >
                            {m.ativo_nome}
                          </Link>
                        )}
                        {garantiaAtiva && (
                          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">
                            <ShieldCheck className="h-3 w-3" />
                            Garantia até {dataBR(m.garantia_ate)}
                          </Badge>
                        )}
                        {anexosDaLinha.length > 0 && (
                          <Badge>
                            <ImagemIcone className="h-3 w-3" />
                            {anexosDaLinha.length}
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1.5 font-medium text-slate-900">{m.descricao}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {m.responsavel && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3.5 w-3.5" />
                            {m.responsavel}
                          </span>
                        )}
                        {m.empresa && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {m.empresa}
                          </span>
                        )}
                        {m.horimetro !== null && m.horimetro !== undefined && (
                          <span>{numero(m.horimetro)} h/km</span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-base font-semibold text-slate-900">{moeda(m.valor)}</span>
                      <div className="flex items-center">
                        <DialogoManutencao
                          orgId={orgId}
                          ativos={ativos}
                          planos={planos}
                          manutencao={m}
                        />
                        <BotaoExcluir
                          compacto
                          acao={excluirManutencao.bind(null, m.id)}
                          titulo="Excluir manutenção"
                          mensagem="Este registro e seus anexos serão removidos permanentemente."
                        />
                        <button
                          type="button"
                          onClick={() => setExpandido(aberto ? null : m.id)}
                          aria-label={aberto ? "Recolher detalhes" : "Ver detalhes"}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", aberto && "rotate-180")}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  {aberto && (
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Detalhe rotulo="Peças / materiais" valor={m.pecas} />
                        <Detalhe rotulo="Nota fiscal / OS" valor={m.nota_fiscal} />
                        <Detalhe
                          rotulo="Garantia"
                          valor={
                            m.garantia_dias > 0
                              ? `${m.garantia_dias} dias — até ${dataBR(m.garantia_ate)}`
                              : "Sem garantia"
                          }
                        />
                        <Detalhe rotulo="Observações" valor={m.observacoes} className="sm:col-span-2" />
                      </dl>

                      {anexosDaLinha.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Anexos
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {anexosDaLinha.map((a) => {
                              const ehImagem = a.tipo_mime?.startsWith("image/");
                              return (
                                <a
                                  key={a.id}
                                  href={a.url ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group/anexo relative overflow-hidden rounded-lg border border-slate-200 bg-white transition-shadow hover:shadow-md"
                                >
                                  {ehImagem && a.url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={a.url}
                                      alt={a.nome}
                                      className="h-24 w-32 object-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span className="flex h-24 w-32 flex-col items-center justify-center gap-1 px-2 text-center">
                                      <FileText className="h-6 w-6 text-slate-400" />
                                      <span className="line-clamp-2 text-[11px] text-slate-600">
                                        {a.nome}
                                      </span>
                                    </span>
                                  )}
                                  <span className="absolute right-1 top-1 rounded bg-slate-900/70 p-1 opacity-0 transition-opacity group-hover/anexo:opacity-100">
                                    <ExternalLink className="h-3 w-3 text-white" />
                                  </span>
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Detalhe({
  rotulo,
  valor,
  className,
}: {
  rotulo: string;
  valor: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm text-slate-700">{valor || "—"}</dd>
    </div>
  );
}

export const IconeVazioManutencao = ClipboardList;
