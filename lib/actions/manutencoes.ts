"use server";

import { revalidatePath } from "next/cache";
import { hoje } from "@/lib/format";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  erroBanco,
  booleano,
  data,
  inteiro,
  mensagemErro,
  numero,
  texto,
  textoObrigatorio,
  type Resultado,
} from "@/lib/form";
import { SEM_PERMISSAO, podeGerenciar } from "@/lib/permissoes";
import { removerArquivos } from "@/lib/storage";
import type { TipoManutencao, UnidadePeriodicidade } from "@/lib/types";

function revalidarTudo() {
  revalidatePath("/dashboard");
  revalidatePath("/manutencoes");
  revalidatePath("/calendario");
  revalidatePath("/relatorios");
  revalidatePath("/ativos", "layout");
}

/** Soma dias a uma data "AAAA-MM-DD" sem passar pelo fuso local. */
function somarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

/** Soma meses sem estourar para o mês seguinte (31/01 + 1 mês = 28/02). */
function somarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(a, m - 1, 1));
  dt.setUTCMonth(dt.getUTCMonth() + meses);
  const ultimoDia = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, ultimoDia));
  return dt.toISOString().slice(0, 10);
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Avança a periódica depois da baixa.
 *
 * O banco já faz isso no trigger trg_avancar_plano (supabase/schema.sql), mas
 * numa base onde o SQL não foi aplicado a baixa não recalcularia nada. O cálculo
 * é o mesmo e parte sempre da data do serviço — rodar duas vezes dá no mesmo.
 */
async function avancarPlano(
  supabase: Supabase,
  planoId: string,
  dataManutencao: string,
  horimetro: number | null,
) {
  const { data: p } = await supabase
    .from("planos_manutencao")
    .select("periodicidade_valor, periodicidade_unidade, ultimo_horimetro")
    .eq("id", planoId)
    .maybeSingle();

  if (!p?.periodicidade_valor) return;

  const avanco =
    p.periodicidade_unidade === "dias"
      ? { proxima_data: somarDias(dataManutencao, p.periodicidade_valor) }
      : p.periodicidade_unidade === "meses"
        ? { proxima_data: somarMeses(dataManutencao, p.periodicidade_valor) }
        : {
            proximo_horimetro:
              Number(horimetro ?? p.ultimo_horimetro ?? 0) + p.periodicidade_valor,
          };

  await supabase
    .from("planos_manutencao")
    .update({
      ultima_data: dataManutencao,
      ultimo_horimetro: horimetro ?? p.ultimo_horimetro,
      ...avanco,
    })
    .eq("id", planoId);
}

export async function salvarManutencao(fd: FormData): Promise<Resultado> {
  try {
    const { orgId, userId } = await getContexto();
    const supabase = await createClient();

    const id = texto(fd, "id");
    const ativoId = textoObrigatorio(fd, "ativo_id", "o ativo");
    const dataManutencao = data(fd, "data_manutencao") ?? hoje();
    const horimetro = numero(fd, "horimetro");
    const valor = numero(fd, "valor") ?? 0;
    const responsavel = texto(fd, "responsavel");

    let planoId = texto(fd, "plano_id");

    // "Repetir esta manutenção": cria o plano periódico junto com o registro,
    // para quem não quer sair da tela e cadastrar a preventiva à parte.
    if (booleano(fd, "criar_plano")) {
      const periodicidade = inteiro(fd, "plano_periodicidade_valor", 0) ?? 0;
      const unidade = (texto(fd, "plano_periodicidade_unidade") ??
        "meses") as UnidadePeriodicidade;

      if (periodicidade <= 0) {
        return { ok: false, erro: "Informe de quanto em quanto tempo ela se repete." };
      }
      if (unidade === "horas" && horimetro === null) {
        return {
          ok: false,
          erro: "Para repetir por horas de uso, informe o horímetro / KM na data.",
        };
      }

      const { data: plano, error: erroPlano } = await supabase
        .from("planos_manutencao")
        .insert({
          org_id: orgId,
          ativo_id: ativoId,
          tipo: textoObrigatorio(fd, "plano_tipo", "o nome da manutenção periódica"),
          periodicidade_valor: periodicidade,
          periodicidade_unidade: unidade,
          proxima_data:
            unidade === "dias"
              ? somarDias(dataManutencao, periodicidade)
              : unidade === "meses"
                ? somarMeses(dataManutencao, periodicidade)
                : null,
          proximo_horimetro:
            unidade === "horas" ? Number(horimetro) + periodicidade : null,
          ultima_data: dataManutencao,
          ultimo_horimetro: horimetro,
          responsavel,
          custo_estimado: valor || null,
          ativo: true,
        })
        .select("id")
        .single();

      if (erroPlano) return erroBanco(erroPlano);
      planoId = plano.id;
    }

    const dados = {
      org_id: orgId,
      ativo_id: ativoId,
      plano_id: planoId,
      tipo: (texto(fd, "tipo") ?? "corretiva") as TipoManutencao,
      data_manutencao: dataManutencao,
      descricao: textoObrigatorio(fd, "descricao", "a descrição do serviço"),
      pecas: texto(fd, "pecas"),
      valor,
      responsavel,
      empresa: texto(fd, "empresa"),
      nota_fiscal: texto(fd, "nota_fiscal"),
      garantia_dias: inteiro(fd, "garantia_dias", 0) ?? 0,
      horimetro,
      observacoes: texto(fd, "observacoes"),
    };

    const { data: linha, error } = id
      ? await supabase.from("manutencoes").update(dados).eq("id", id).select("id").single()
      : await supabase
          .from("manutencoes")
          .insert({ ...dados, created_by: userId })
          .select("id")
          .single();

    if (error) return erroBanco(error);

    if (!id && planoId) await avancarPlano(supabase, planoId, dataManutencao, horimetro);

    revalidarTudo();
    return { ok: true, id: linha.id };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirManutencao(id: string): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { data: anexos } = await supabase
      .from("manutencao_anexos")
      .select("path")
      .eq("manutencao_id", id);

    const { data: apagados, error } = await supabase
      .from("manutencoes")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id");
    if (error) return erroBanco(error);
    if (!apagados?.length) return { ok: false, erro: SEM_PERMISSAO };

    // Arquivos só depois do banco: se a exclusão for recusada, nada some à toa.
    await removerArquivos(supabase, (anexos ?? []).map((a) => a.path));

    revalidarTudo();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export type FiltroLimpeza = {
  de: string;
  ate: string;
  /** "todos" apaga qualquer tipo; os demais apagam só aquele tipo. */
  tipo: "todos" | TipoManutencao;
  ativoId?: string | null;
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Monta a consulta do histórico a limpar, sempre presa à empresa aberta. */
async function consultaLimpeza(f: FiltroLimpeza) {
  if (!DATA_ISO.test(f.de) || !DATA_ISO.test(f.ate)) throw new Error("Informe as duas datas.");
  if (f.de > f.ate) throw new Error("A data inicial não pode ser maior que a final.");

  const { orgId, papel } = await getContexto();
  if (!podeGerenciar(papel)) throw new Error(SEM_PERMISSAO);

  const supabase = await createClient();
  let q = supabase
    .from("manutencoes")
    .select("id, valor")
    .eq("org_id", orgId)
    .gte("data_manutencao", f.de)
    .lte("data_manutencao", f.ate);

  if (f.tipo !== "todos") q = q.eq("tipo", f.tipo);
  if (f.ativoId && UUID.test(f.ativoId)) q = q.eq("ativo_id", f.ativoId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { supabase, orgId, linhas: data ?? [] };
}

/** Quantos registros a limpeza apagaria — mostrado antes de confirmar. */
export async function previaLimpeza(
  f: FiltroLimpeza,
): Promise<{ ok: true; quantidade: number; valor: number } | { ok: false; erro: string }> {
  try {
    const { linhas } = await consultaLimpeza(f);
    return {
      ok: true,
      quantidade: linhas.length,
      valor: linhas.reduce((t, l) => t + Number(l.valor ?? 0), 0),
    };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/**
 * Apaga o histórico de um período (opcionalmente só um tipo, como preventivas).
 * As periódicas não voltam no tempo: a próxima data continua a mesma.
 */
export async function limparHistorico(
  f: FiltroLimpeza,
): Promise<{ ok: true; quantidade: number } | { ok: false; erro: string }> {
  try {
    const { supabase, orgId, linhas } = await consultaLimpeza(f);
    if (!linhas.length) return { ok: true, quantidade: 0 };

    let apagadas = 0;
    // Em lotes: uma lista enorme de ids estoura o tamanho da URL da API.
    for (let i = 0; i < linhas.length; i += 200) {
      const ids = linhas.slice(i, i + 200).map((l) => l.id);

      const { data: anexos } = await supabase
        .from("manutencao_anexos")
        .select("path")
        .in("manutencao_id", ids);

      const { data: apagados, error } = await supabase
        .from("manutencoes")
        .delete()
        .eq("org_id", orgId)
        .in("id", ids)
        .select("id");
      if (error) return erroBanco(error);

      apagadas += apagados?.length ?? 0;
      await removerArquivos(supabase, (anexos ?? []).map((a) => a.path));
    }

    if (!apagadas) return { ok: false, erro: SEM_PERMISSAO };

    revalidarTudo();
    return { ok: true, quantidade: apagadas };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Tipos aceitos como anexo. Espelha a restrição do bucket no Supabase. */
const MIME_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

export async function registrarAnexo(entrada: {
  manutencaoId: string;
  nome: string;
  path: string;
  tipoMime: string | null;
  tamanho: number | null;
}): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    // A manutenção precisa ser da empresa de quem está enviando. Sem isto, dava
    // para pendurar anexo em registro de outra empresa (o RLS barraria a
    // leitura, mas sujaria o banco alheio).
    const { data: alvo } = await supabase
      .from("manutencoes")
      .select("id")
      .eq("id", entrada.manutencaoId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!alvo) return { ok: false, erro: "Manutenção não encontrada nesta empresa." };

    if (entrada.tipoMime && !MIME_PERMITIDOS.includes(entrada.tipoMime)) {
      return { ok: false, erro: "Tipo de arquivo não permitido. Envie imagem ou PDF." };
    }

    // O caminho precisa começar pela pasta da própria empresa.
    if (!entrada.path.startsWith(`${orgId}/${entrada.manutencaoId}/`)) {
      return { ok: false, erro: "Caminho de arquivo inválido." };
    }

    const { error } = await supabase.from("manutencao_anexos").insert({
      org_id: orgId,
      manutencao_id: entrada.manutencaoId,
      nome: entrada.nome,
      path: entrada.path,
      tipo_mime: entrada.tipoMime,
      tamanho: entrada.tamanho,
    });

    if (error) return erroBanco(error);

    revalidatePath("/ativos", "layout");
    revalidatePath("/manutencoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirAnexo(id: string): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { data: apagados, error } = await supabase
      .from("manutencao_anexos")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId)
      .select("path");
    if (error) return erroBanco(error);
    if (!apagados?.length) return { ok: false, erro: SEM_PERMISSAO };

    await removerArquivos(supabase, apagados.map((a) => a.path));

    revalidatePath("/ativos", "layout");
    revalidatePath("/manutencoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Gera links temporários (1h) para visualizar os anexos de uma manutenção. */
export async function linksDosAnexos(manutencaoId: string) {
  const supabase = await createClient();
  const { data: anexos } = await supabase
    .from("manutencao_anexos")
    .select("*")
    .eq("manutencao_id", manutencaoId)
    .order("created_at");

  if (!anexos?.length) return [];

  const { data: urls } = await supabase.storage
    .from("manutencoes")
    .createSignedUrls(anexos.map((a) => a.path), 3600);

  return anexos.map((a, i) => ({ ...a, url: urls?.[i]?.signedUrl ?? null }));
}
