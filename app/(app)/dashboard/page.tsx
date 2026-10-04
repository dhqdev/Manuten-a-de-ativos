import Link from "next/link";
import {
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Package,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Contador } from "@/components/efeitos/contador";
import { BarrasCategoria, type GastoCategoria } from "@/components/dashboard/barras-categoria";
import { GraficoMensal, type PontoMensal } from "@/components/dashboard/grafico-mensal";
import { Badge, BotaoLink, Cabecalho, EstadoVazio, Secao } from "@/components/ui";
import {
  SITUACAO_PLANO,
  TIPOS_MANUTENCAO,
  dataBR,
  descreverPrazo,
  moeda,
  numero,
} from "@/lib/format";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { ManutencaoCompleta, PlanoStatus } from "@/lib/types";

export const metadata = { title: "Dashboard · Gestão de Manutenção" };

export default async function DashboardPage() {
  const { orgId, profile } = await getContexto();
  const supabase = await createClient();

  const inicioJanela = new Date();
  inicioJanela.setDate(1);
  inicioJanela.setMonth(inicioJanela.getMonth() - 5);
  const janelaISO = inicioJanela.toLocaleDateString("sv-SE");

  const [{ data: totais }, { data: planos }, { data: recentes }, { data: doPeriodo }, { count: qtdAtivos }] =
    await Promise.all([
      supabase.rpc("dashboard_resumo", { p_org: orgId }),
      supabase.from("vw_planos_status").select("*").eq("org_id", orgId).in("situacao", ["atrasada", "proxima"]),
      supabase
        .from("vw_manutencoes_completo")
        .select("*")
        .eq("org_id", orgId)
        .order("data_manutencao", { ascending: false })
        .limit(6),
      supabase
        .from("vw_manutencoes_completo")
        .select("valor, data_manutencao, categoria_id, categoria_nome, categoria_cor")
        .eq("org_id", orgId)
        .gte("data_manutencao", janelaISO),
      supabase
        .from("ativos")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .neq("status", "baixado"),
    ]);

  const resumo = (totais ?? {}) as Partial<{
    total_ativos: number;
    gasto_mes: number;
    gasto_ano: number;
    manutencoes_mes: number;
    alertas_proximas: number;
    alertas_atrasadas: number;
  }>;

  const alertas = ((planos ?? []) as PlanoStatus[]).sort((a, b) => {
    if (a.situacao !== b.situacao) return a.situacao === "atrasada" ? -1 : 1;
    return (a.proxima_data ?? "9999").localeCompare(b.proxima_data ?? "9999");
  });

  const atrasadas = alertas.filter((p) => p.situacao === "atrasada").length;
  const proximas = alertas.filter((p) => p.situacao === "proxima").length;
  const totalAtivos = resumo.total_ativos ?? qtdAtivos ?? 0;

  // Gasto dos últimos 6 meses
  const meses: PontoMensal[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    meses.push({
      rotulo: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      valor: 0,
      quantidade: 0,
    });
  }
  const indicePorMes = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    indicePorMes.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 5 - i);
  }

  const porCategoria = new Map<string, GastoCategoria>();

  for (const m of doPeriodo ?? []) {
    const chave = m.data_manutencao.slice(0, 7);
    const idx = indicePorMes.get(chave);
    if (idx !== undefined) {
      meses[idx].valor += Number(m.valor ?? 0);
      meses[idx].quantidade += 1;
    }

    const atual = porCategoria.get(m.categoria_id) ?? {
      id: m.categoria_id,
      nome: m.categoria_nome,
      cor: m.categoria_cor,
      valor: 0,
      quantidade: 0,
    };
    atual.valor += Number(m.valor ?? 0);
    atual.quantidade += 1;
    porCategoria.set(m.categoria_id, atual);
  }

  const gastosCategoria = [...porCategoria.values()].sort((a, b) => b.valor - a.valor);
  const historicoRecente = (recentes ?? []) as ManutencaoCompleta[];
  const primeiroNome = (profile.nome ?? "").split(" ")[0];

  return (
    <>
      <Cabecalho
        titulo={primeiroNome ? `Olá, ${primeiroNome}` : "Dashboard"}
        descricao="Visão geral da manutenção dos seus ativos."
        acoes={<BotaoLink href="/relatorios" variante="secundario">Gerar relatório</BotaoLink>}
      />

      {/* Indicadores */}
      <div className="lista-escalonada grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          href="/ativos"
          icone={<Package className="h-5 w-5" />}
          rotulo="Ativos cadastrados"
          valor={<Contador valor={Number(totalAtivos)} />}
          detalhe="Equipamentos em operação"
          tom="neutro"
        />
        <Indicador
          href="/manutencoes?filtro=alertas"
          icone={<CalendarClock className="h-5 w-5" />}
          rotulo="Vencendo em breve"
          valor={<Contador valor={proximas} />}
          detalhe={proximas > 0 ? "Manutenções a programar" : "Nada vencendo agora"}
          tom={proximas > 0 ? "aviso" : "neutro"}
        />
        <Indicador
          href="/manutencoes?filtro=alertas"
          icone={<TriangleAlert className="h-5 w-5" />}
          rotulo="Atrasadas"
          valor={<Contador valor={atrasadas} />}
          detalhe={atrasadas > 0 ? "Exigem ação imediata" : "Nenhuma pendência"}
          tom={atrasadas > 0 ? "critico" : "neutro"}
        />
        <Indicador
          href="/relatorios"
          icone={<Wallet className="h-5 w-5" />}
          rotulo="Gastos no mês"
          valor={<Contador valor={Number(resumo.gasto_mes ?? 0)} formato="moeda" />}
          detalhe={`${numero(resumo.manutencoes_mes ?? 0)} manutenção(ões) · ${moeda(
            resumo.gasto_ano ?? 0,
          )} no ano`}
          tom="neutro"
        />
      </div>

      {/* Gráficos */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Secao titulo="Gastos com manutenção — últimos 6 meses">
          <GraficoMensal dados={meses} />
        </Secao>

        <Secao
          titulo="Gastos por categoria — últimos 6 meses"
          acoes={
            <Link href="/relatorios" className="text-sm font-medium text-marca-600 hover:text-marca-700">
              Detalhar
            </Link>
          }
        >
          <BarrasCategoria dados={gastosCategoria} />
        </Secao>
      </div>

      {/* Alertas + recentes */}
      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Secao
          titulo="Próximas manutenções e alertas"
          acoes={
            <Link
              href="/manutencoes?filtro=alertas"
              className="text-sm font-medium text-marca-600 hover:text-marca-700"
            >
              Ver todas
            </Link>
          }
        >
          {alertas.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              Nenhuma manutenção próxima do vencimento. Tudo em dia.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {alertas.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/ativos/${p.ativo_id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: SITUACAO_PLANO[p.situacao].ponto }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{p.tipo}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.ativo_nome}
                        {p.ativo_identificacao ? ` · ${p.ativo_identificacao}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <Badge className={SITUACAO_PLANO[p.situacao].classe}>
                        {SITUACAO_PLANO[p.situacao].label}
                      </Badge>
                      <p className="mt-1 text-xs text-slate-500">
                        {p.periodicidade_unidade === "horas"
                          ? `Faltam ${numero(p.horas_restantes)} h`
                          : descreverPrazo(p.dias_restantes)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao
          titulo="Manutenções realizadas recentemente"
          acoes={
            <Link
              href="/manutencoes?filtro=historico"
              className="text-sm font-medium text-marca-600 hover:text-marca-700"
            >
              Ver histórico
            </Link>
          }
        >
          {historicoRecente.length === 0 ? (
            <div className="px-5 py-6">
              <EstadoVazio
                icone={<ClipboardList className="h-6 w-6" />}
                titulo="Nenhuma manutenção registrada"
                descricao="Registre o primeiro serviço para acompanhar custos e histórico."
                acao={<BotaoLink href="/manutencoes">Registrar manutenção</BotaoLink>}
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {historicoRecente.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/ativos/${m.ativo_id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: m.categoria_cor }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{m.descricao}</p>
                      <p className="truncate text-xs text-slate-500">
                        {m.ativo_nome} · {TIPOS_MANUTENCAO[m.tipo]} · {dataBR(m.data_manutencao)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-900">
                      {moeda(m.valor)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      {totalAtivos === 0 && (
        <div className="mt-6">
          <EstadoVazio
            icone={<TrendingUp className="h-6 w-6" />}
            titulo="Comece cadastrando seus ativos"
            descricao="Suas categorias padrão já foram criadas. Abra uma delas e cadastre o primeiro equipamento."
            acao={<BotaoLink href="/ativos">Ir para Ativos</BotaoLink>}
          />
        </div>
      )}
    </>
  );
}

function Indicador({
  href,
  icone,
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  href: string;
  icone: React.ReactNode;
  rotulo: string;
  valor: React.ReactNode;
  detalhe: string;
  tom: "neutro" | "aviso" | "critico";
}) {
  const cores = {
    neutro: "bg-slate-100 text-slate-600",
    aviso: "bg-amber-50 text-amber-600",
    critico: "bg-red-50 text-red-600",
  }[tom];

  return (
    <Link href={href} className="card cartao-vivo pressionavel group p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{valor}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${cores}`}>
          {icone}
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-slate-500">{detalhe}</p>
    </Link>
  );
}
