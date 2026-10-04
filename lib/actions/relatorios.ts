"use server";

import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "@/lib/form";
import { TIPOS_MANUTENCAO } from "@/lib/format";
import type {
  DadosDoRelatorio,
  FiltrosRelatorio,
  ManutencaoCompleta,
  PlanoStatus,
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

    return { ok: true, manutencoes: (rm.data ?? []) as ManutencaoCompleta[], proximas };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
