"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Download,
  Funnel,
  LoaderCircle,
  Printer,
  Share2,
  TriangleAlert,
} from "lucide-react";
import { Badge, Botao, Campo, Secao, cn } from "@/components/ui";
import { dadosDoRelatorio } from "@/lib/actions/relatorios";
import {
  SITUACAO_PLANO,
  TIPOS_MANUTENCAO,
  dataBR,
  moeda,
  numero,
  primeiroDiaDoMes,
  ultimoDiaDoMes,
} from "@/lib/format";
import {
  calcularTotais,
  gerarPDF,
  nomeArquivo,
  resumoTexto,
  type DadosRelatorio,
} from "@/lib/relatorio-pdf";
import type { ManutencaoCompleta, PlanoStatus, TipoManutencao } from "@/lib/types";

type Opcao = { id: string; nome: string };
type AtivoOpcao = Opcao & { categoria_id: string };

const ATALHOS = [
  { rotulo: "Este mês", meses: 0 },
  { rotulo: "Últimos 3 meses", meses: 3 },
  { rotulo: "Últimos 6 meses", meses: 6 },
  { rotulo: "Últimos 12 meses", meses: 12 },
];

export function GeradorRelatorio({
  empresa,
  categorias,
  ativos,
}: {
  empresa: string;
  categorias: Opcao[];
  ativos: AtivoOpcao[];
}) {
  const [de, setDe] = useState(primeiroDiaDoMes());
  const [ate, setAte] = useState(ultimoDiaDoMes());
  const [categoria, setCategoria] = useState("todas");
  const [ativo, setAtivo] = useState("todos");
  const [tipo, setTipo] = useState<"todos" | TipoManutencao>("todos");

  const [manutencoes, setManutencoes] = useState<ManutencaoCompleta[]>([]);
  const [proximas, setProximas] = useState<PlanoStatus[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [compartilhando, setCompartilhando] = useState(false);

  const ativosFiltrados = useMemo(
    () => (categoria === "todas" ? ativos : ativos.filter((a) => a.categoria_id === categoria)),
    [ativos, categoria],
  );

  // Se a categoria muda e o ativo selecionado não pertence mais a ela, limpa.
  useEffect(() => {
    if (ativo !== "todos" && !ativosFiltrados.some((a) => a.id === ativo)) setAtivo("todos");
  }, [ativosFiltrados, ativo]);

  const buscar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const r = await dadosDoRelatorio({ de, ate, categoria, ativo, tipo });

    if (!r.ok) {
      setErro(r.erro);
      setManutencoes([]);
      setProximas([]);
    } else {
      setManutencoes(r.manutencoes);
      setProximas(r.proximas);
    }
    setCarregando(false);
  }, [de, ate, categoria, ativo, tipo]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const totais = useMemo(() => calcularTotais(manutencoes), [manutencoes]);

  const dados: DadosRelatorio = useMemo(() => {
    const filtros: string[] = [];
    if (categoria !== "todas")
      filtros.push(`Categoria: ${categorias.find((c) => c.id === categoria)?.nome ?? ""}`);
    if (ativo !== "todos") filtros.push(`Ativo: ${ativos.find((a) => a.id === ativo)?.nome ?? ""}`);
    if (tipo !== "todos") filtros.push(`Tipo: ${TIPOS_MANUTENCAO[tipo]}`);

    return { empresa, periodoDe: de, periodoAte: ate, filtros, manutencoes, proximas };
  }, [empresa, de, ate, categoria, ativo, tipo, categorias, ativos, manutencoes, proximas]);

  function aplicarAtalho(meses: number) {
    if (meses === 0) {
      setDe(primeiroDiaDoMes());
      setAte(ultimoDiaDoMes());
      return;
    }
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - meses);
    setDe(inicio.toLocaleDateString("sv-SE"));
    setAte(new Date().toLocaleDateString("sv-SE"));
  }

  function baixarPDF() {
    gerarPDF(dados).save(nomeArquivo(dados));
  }

  function imprimir() {
    const url = gerarPDF(dados).output("bloburl");
    window.open(url, "_blank");
  }

  async function compartilharWhatsApp() {
    setCompartilhando(true);
    try {
      const doc = gerarPDF(dados);
      const arquivo = new File([doc.output("blob")], nomeArquivo(dados), {
        type: "application/pdf",
      });
      const texto = resumoTexto(dados);

      // Em celulares, o menu nativo permite enviar o PDF direto no WhatsApp.
      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({
          files: [arquivo],
          title: "Relatório de Manutenções",
          text: texto,
        });
        return;
      }

      // No computador: baixa o PDF e abre o WhatsApp com o resumo em texto.
      doc.save(nomeArquivo(dados));
      window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
    } catch (e) {
      // O usuário cancelar o menu de compartilhamento não é erro.
      if ((e as Error)?.name !== "AbortError") {
        setErro("Não foi possível compartilhar. O PDF pode ser baixado pelo botão ao lado.");
      }
    } finally {
      setCompartilhando(false);
    }
  }

  const semDados = !carregando && manutencoes.length === 0 && proximas.length === 0;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card no-print p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Funnel className="h-4 w-4 text-slate-400" />
          Filtros do relatório
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Campo label="Data inicial">
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="campo" />
          </Campo>
          <Campo label="Data final">
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="campo" />
          </Campo>
          <Campo label="Categoria">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="campo">
              <option value="todas">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Ativo específico">
            <select value={ativo} onChange={(e) => setAtivo(e.target.value)} className="campo">
              <option value="todos">Todos os ativos</option>
              {ativosFiltrados.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Tipo de manutenção">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              className="campo"
            >
              <option value="todos">Todos os tipos</option>
              {(Object.keys(TIPOS_MANUTENCAO) as TipoManutencao[]).map((t) => (
                <option key={t} value={t}>
                  {TIPOS_MANUTENCAO[t]}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {ATALHOS.map((a) => (
              <button
                key={a.rotulo}
                type="button"
                onClick={() => aplicarAtalho(a.meses)}
                className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                {a.rotulo}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Botao variante="secundario" onClick={imprimir} disabled={carregando || semDados}>
              <Printer className="h-4 w-4" />
              Visualizar
            </Botao>
            <Botao variante="secundario" onClick={baixarPDF} disabled={carregando || semDados}>
              <Download className="h-4 w-4" />
              Baixar PDF
            </Botao>
            <Botao onClick={compartilharWhatsApp} disabled={carregando || semDados || compartilhando}>
              {compartilhando ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              WhatsApp
            </Botao>
          </div>
        </div>
      </div>

      {erro && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Montando o relatório...
        </div>
      ) : (
        <>
          {/* Totais */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Total rotulo="Custo total no período" valor={moeda(totais.custoTotal)} destaque />
            <Total rotulo="Manutenções realizadas" valor={numero(totais.quantidade)} />
            <Total rotulo="Custo médio por serviço" valor={moeda(totais.ticketMedio)} />
            <Total rotulo="Próximas programadas" valor={numero(proximas.length)} />
          </div>

          {semDados ? (
            <div className="card px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-900">
                Nenhum dado encontrado para esses filtros.
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Amplie o período ou remova algum filtro para ver resultados.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                <Secao titulo="Custos por categoria">
                  <TabelaResumo
                    linhas={totais.porCategoria.map((c) => ({
                      chave: c.nome,
                      principal: c.nome,
                      secundario: `${c.quantidade} manutenção(ões)`,
                      valor: c.valor,
                    }))}
                    total={totais.custoTotal}
                  />
                </Secao>

                <Secao titulo="Custos por ativo">
                  <TabelaResumo
                    linhas={totais.porAtivo.map((a) => ({
                      chave: a.nome + (a.identificacao ?? ""),
                      principal: a.nome,
                      secundario: `${a.identificacao ? `${a.identificacao} · ` : ""}${a.quantidade} manutenção(ões)`,
                      valor: a.valor,
                    }))}
                    total={totais.custoTotal}
                  />
                </Secao>
              </div>

              <Secao titulo={`Histórico de serviços realizados (${manutencoes.length})`}>
                {manutencoes.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    Nenhuma manutenção realizada no período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[46rem] text-sm">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Data</th>
                          <th className="px-4 py-2.5 font-semibold">Ativo</th>
                          <th className="px-4 py-2.5 font-semibold">Tipo</th>
                          <th className="px-4 py-2.5 font-semibold">Serviço</th>
                          <th className="px-4 py-2.5 font-semibold">Responsável</th>
                          <th className="px-4 py-2.5 text-right font-semibold">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {manutencoes.map((m) => (
                          <tr key={m.id} className="align-top">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                              {dataBR(m.data_manutencao)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1.5 font-medium text-slate-900">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: m.categoria_cor }}
                                  aria-hidden
                                />
                                {m.ativo_nome}
                              </span>
                              {m.ativo_identificacao && (
                                <span className="text-xs text-slate-500">{m.ativo_identificacao}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{TIPOS_MANUTENCAO[m.tipo]}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {m.descricao}
                              {m.pecas && (
                                <span className="mt-0.5 block text-xs text-slate-500">
                                  Peças: {m.pecas}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {[m.responsavel, m.empresa].filter(Boolean).join(" · ") || "—"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-900">
                              {moeda(m.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr>
                          <td colSpan={5} className="px-4 py-3 text-right font-semibold text-slate-700">
                            Total
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {moeda(totais.custoTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </Secao>

              <Secao titulo={`Próximas manutenções programadas (${proximas.length})`}>
                {proximas.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    Nenhuma manutenção programada para os filtros selecionados.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {proximas.map((p) => (
                      <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            p.situacao === "atrasada"
                              ? "bg-red-50 text-red-600"
                              : p.situacao === "proxima"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-slate-100 text-slate-500",
                          )}
                        >
                          {p.situacao === "atrasada" ? (
                            <TriangleAlert className="h-4 w-4" />
                          ) : (
                            <CalendarClock className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900">{p.tipo}</p>
                          <p className="truncate text-xs text-slate-500">
                            {p.ativo_nome}
                            {p.ativo_identificacao ? ` · ${p.ativo_identificacao}` : ""} ·{" "}
                            {p.categoria_nome}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge className={SITUACAO_PLANO[p.situacao].classe}>
                            {SITUACAO_PLANO[p.situacao].label}
                          </Badge>
                          <p className="mt-1 text-xs text-slate-500">
                            {p.periodicidade_unidade === "horas"
                              ? `${numero(p.proximo_horimetro)} h/km`
                              : dataBR(p.proxima_data)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Secao>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Total({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div className={cn("card p-4", destaque && "bg-slate-900")}>
      <p className={cn("text-xs font-medium uppercase tracking-wide", destaque ? "text-slate-400" : "text-slate-500")}>
        {rotulo}
      </p>
      <p
        className={cn(
          "mt-1.5 text-xl font-semibold tracking-tight",
          destaque ? "text-white" : "text-slate-900",
        )}
      >
        {valor}
      </p>
    </div>
  );
}

function TabelaResumo({
  linhas,
  total,
}: {
  linhas: { chave: string; principal: string; secundario: string; valor: number }[];
  total: number;
}) {
  if (linhas.length === 0) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">Sem dados no período.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {linhas.slice(0, 12).map((l) => (
        <li key={l.chave} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{l.principal}</p>
            <p className="truncate text-xs text-slate-500">{l.secundario}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums text-slate-900">{moeda(l.valor)}</p>
            <p className="text-xs tabular-nums text-slate-500">
              {total > 0 ? `${((l.valor / total) * 100).toFixed(1)}%` : "0%"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
