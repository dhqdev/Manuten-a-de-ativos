"use server";

import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "@/lib/form";
import { SULCO_ALERTA_MM, TIPOS_MANUTENCAO } from "@/lib/format";
import type {
  DadosDoRelatorio,
  FiltrosRelatorio,
  ManutencaoCompleta,
  MovPneuRelatorio,
  PlanoStatus,
  PneusDoRelatorio,
  PneuResumo,
} from "@/lib/types";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Dados do relatório.
 *
 * Roda no servidor de propósito: os cookies de sessão são httpOnly (ver
 * lib/supabase/proxy.ts), então o cliente do navegador não enxerga a sessão e
 * o RLS devolveria zero linhas — que era o motivo de o relatório sair vazio.
 *
 * A empresa vem de getContexto(), nunca do navegador.
 */
export async function dadosDoRelatorio(f: FiltrosRelatorio): Promise<DadosDoRelatorio> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    if (!DATA_ISO.test(f.de) || !DATA_ISO.test(f.ate)) {
      return { ok: false, erro: "Período inválido. Informe as duas datas." };
    }
    if (f.de > f.ate) {
      return { ok: false, erro: "A data inicial não pode ser maior que a data final." };
    }

    const categorias = (Array.isArray(f.categorias) ? f.categorias : [])
      .filter((c) => UUID.test(c))
      .slice(0, 100);
    const ativo = f.ativo !== "todos" && UUID.test(f.ativo) ? f.ativo : null;
    const tipo = f.tipo !== "todos" && f.tipo in TIPOS_MANUTENCAO ? f.tipo : null;

    let qm = supabase
      .from("vw_manutencoes_completo")
      .select("*")
      .eq("org_id", orgId)
      .gte("data_manutencao", f.de)
      .lte("data_manutencao", f.ate)
      .order("data_manutencao", { ascending: false });

    let qp = supabase
      .from("vw_planos_status")
      .select("*")
      .eq("org_id", orgId)
      .eq("ativo", true)
      .neq("situacao", "inativo");

    if (categorias.length) {
      qm = qm.in("categoria_id", categorias);
      qp = qp.in("categoria_id", categorias);
    }
    if (ativo) {
      qm = qm.eq("ativo_id", ativo);
      qp = qp.eq("ativo_id", ativo);
    }
    if (tipo) qm = qm.eq("tipo", tipo);

    const [rm, rp] = await Promise.all([qm, qp]);

    if (rm.error || rp.error) {
      return { ok: false, erro: rm.error?.message ?? rp.error?.message ?? "Erro ao carregar." };
    }

    const proximas = ((rp.data ?? []) as PlanoStatus[]).sort((a, b) =>
      (a.proxima_data ?? "9999").localeCompare(b.proxima_data ?? "9999"),
    );

    const pneus = await dadosDePneus(supabase, orgId, f.de, f.ate, categorias, ativo);

    return { ok: true, manutencoes: (rm.data ?? []) as ManutencaoCompleta[], proximas, pneus };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Pneus no relatório: movimentações do período e a situação atual do estoque.
 *
 * Com filtro de ativo ou categoria, entram só as movimentações ligadas a esses
 * veículos e só os pneus montados neles (uma entrada no estoque não tem
 * veículo, então fica de fora). O filtro de tipo de manutenção não se aplica.
 *
 * Devolve null se o banco ainda não tiver as tabelas — o relatório de
 * manutenções continua funcionando.
 */
async function dadosDePneus(
  supabase: Supabase,
  orgId: string,
  de: string,
  ate: string,
  categorias: string[],
  ativo: string | null,
): Promise<PneusDoRelatorio | null> {
  // Veículos que entram no filtro. null = sem filtro de veículo.
  let ativosFiltro: string[] | null = ativo ? [ativo] : null;
  if (!ativo && categorias.length) {
    const { data } = await supabase
      .from("ativos")
      .select("id")
      .eq("org_id", orgId)
      .in("categoria_id", categorias);
    ativosFiltro = (data ?? []).map((a) => a.id);
  }

  if (ativosFiltro && ativosFiltro.length === 0) {
    return { movimentacoes: [], emEstoque: 0, emUso: 0, recapagem: 0, valorEstoque: 0, sulcoBaixo: [] };
  }

  let qm = supabase
    .from("pneu_movimentacoes")
    .select("*, pneu:pneus(numero_fogo, marca, medida), ativo:ativos(nome)")
    .eq("org_id", orgId)
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1000);

  let qp = supabase
    .from("pneus")
    .select("id, numero_fogo, marca, medida, status, posicao, sulco_atual_mm, valor_compra, ativo:ativos(nome)")
    .eq("org_id", orgId)
    .neq("status", "descartado");

  if (ativosFiltro) {
    qm = qm.in("ativo_id", ativosFiltro);
    qp = qp.in("ativo_id", ativosFiltro);
  }

  const [rm, rp] = await Promise.all([qm, qp]);
  if (rm.error || rp.error) return null;

  const nome = (v: unknown) => (v as { nome?: string } | null)?.nome ?? null;

  const movimentacoes: MovPneuRelatorio[] = (rm.data ?? []).map((m) => {
    const pneu = m.pneu as unknown as { numero_fogo?: string; marca?: string; medida?: string } | null;
    return {
      ...(m as MovPneuRelatorio),
      numero_fogo: pneu?.numero_fogo ?? "—",
      marca: pneu?.marca ?? "",
      medida: pneu?.medida ?? "",
      ativo_nome: nome(m.ativo),
    };
  });

  const lista = rp.data ?? [];
  const sulcoBaixo: PneuResumo[] = lista
    .filter((p) => p.sulco_atual_mm !== null && Number(p.sulco_atual_mm) <= SULCO_ALERTA_MM)
    .sort((a, b) => Number(a.sulco_atual_mm) - Number(b.sulco_atual_mm))
    .map((p) => ({
      id: p.id,
      numero_fogo: p.numero_fogo,
      marca: p.marca,
      medida: p.medida,
      status: p.status,
      posicao: p.posicao,
      sulco_atual_mm: p.sulco_atual_mm,
      ativo_nome: nome(p.ativo),
    }));

  const emEstoque = lista.filter((p) => p.status === "estoque");

  return {
    movimentacoes,
    emEstoque: emEstoque.length,
    emUso: lista.filter((p) => p.status === "em_uso").length,
    recapagem: lista.filter((p) => p.status === "recapagem").length,
    valorEstoque: emEstoque.reduce((t, p) => t + Number(p.valor_compra ?? 0), 0),
    sulcoBaixo,
  };
}
