"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  data,
  inteiro,
  mensagemErro,
  numero,
  texto,
  textoObrigatorio,
  type Resultado,
} from "@/lib/form";
import type { TipoManutencao } from "@/lib/types";

function revalidarTudo() {
  revalidatePath("/dashboard");
  revalidatePath("/manutencoes");
  revalidatePath("/calendario");
  revalidatePath("/relatorios");
  revalidatePath("/ativos", "layout");
}

export async function salvarManutencao(fd: FormData): Promise<Resultado> {
  try {
    const { orgId, userId } = await getContexto();
    const supabase = await createClient();

    const id = texto(fd, "id");
    const dados = {
      org_id: orgId,
      ativo_id: textoObrigatorio(fd, "ativo_id", "o ativo"),
      plano_id: texto(fd, "plano_id"),
      tipo: (texto(fd, "tipo") ?? "corretiva") as TipoManutencao,
      data_manutencao: data(fd, "data_manutencao") ?? new Date().toLocaleDateString("sv-SE"),
      descricao: textoObrigatorio(fd, "descricao", "a descrição do serviço"),
      pecas: texto(fd, "pecas"),
      valor: numero(fd, "valor") ?? 0,
      responsavel: texto(fd, "responsavel"),
      empresa: texto(fd, "empresa"),
      nota_fiscal: texto(fd, "nota_fiscal"),
      garantia_dias: inteiro(fd, "garantia_dias", 0) ?? 0,
      horimetro: numero(fd, "horimetro"),
      observacoes: texto(fd, "observacoes"),
    };

    const { data: linha, error } = id
      ? await supabase.from("manutencoes").update(dados).eq("id", id).select("id").single()
      : await supabase
          .from("manutencoes")
          .insert({ ...dados, created_by: userId })
          .select("id")
          .single();

    if (error) return { ok: false, erro: error.message };

    revalidarTudo();
    return { ok: true, id: linha.id };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirManutencao(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();

    // Remove os arquivos do storage antes de apagar os registros.
    const { data: anexos } = await supabase
      .from("manutencao_anexos")
      .select("path")
      .eq("manutencao_id", id);

    if (anexos?.length) {
      await supabase.storage.from("manutencoes").remove(anexos.map((a) => a.path));
    }

    const { error } = await supabase.from("manutencoes").delete().eq("id", id);
    if (error) return { ok: false, erro: error.message };

    revalidarTudo();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

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

    const { error } = await supabase.from("manutencao_anexos").insert({
      org_id: orgId,
      manutencao_id: entrada.manutencaoId,
      nome: entrada.nome,
      path: entrada.path,
      tipo_mime: entrada.tipoMime,
      tamanho: entrada.tamanho,
    });

    if (error) return { ok: false, erro: error.message };

    revalidatePath("/ativos", "layout");
    revalidatePath("/manutencoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirAnexo(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();

    const { data: anexo } = await supabase
      .from("manutencao_anexos")
      .select("path")
      .eq("id", id)
      .maybeSingle();

    if (anexo?.path) await supabase.storage.from("manutencoes").remove([anexo.path]);

    const { error } = await supabase.from("manutencao_anexos").delete().eq("id", id);
    if (error) return { ok: false, erro: error.message };

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
