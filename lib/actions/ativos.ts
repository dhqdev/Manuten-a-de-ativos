"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  booleano,
  data,
  inteiro,
  mensagemErro,
  numero,
  texto,
  textoObrigatorio,
  type Resultado,
} from "@/lib/form";
import type { StatusAtivo } from "@/lib/types";

/** Único bucket do projeto. Ver "8. STORAGE" em supabase/schema.sql. */
const BUCKET = "manutencoes";

const EXTENSOES = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Remove do Storage a foto atual do ativo, se houver. */
async function apagarFoto(supabase: Supabase, ativoId: string) {
  const { data: atual } = await supabase
    .from("ativos")
    .select("foto_url")
    .eq("id", ativoId)
    .maybeSingle();

  if (atual?.foto_url) await supabase.storage.from(BUCKET).remove([atual.foto_url]);
}

function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-80);
}

export async function salvarAtivo(fd: FormData): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const id = texto(fd, "id");
    const dados = {
      org_id: orgId,
      categoria_id: textoObrigatorio(fd, "categoria_id", "a categoria"),
      nome: textoObrigatorio(fd, "nome", "o nome do ativo"),
      modelo: texto(fd, "modelo"),
      marca: texto(fd, "marca"),
      identificacao: texto(fd, "identificacao"),
      ano: inteiro(fd, "ano"),
      data_cadastro: data(fd, "data_cadastro") ?? new Date().toLocaleDateString("sv-SE"),
      horimetro_atual: numero(fd, "horimetro_atual") ?? 0,
      status: (texto(fd, "status") ?? "ativo") as StatusAtivo,
      observacoes: texto(fd, "observacoes"),
      ...(booleano(fd, "remover_foto") ? { foto_url: null } : {}),
    };

    if (id && booleano(fd, "remover_foto")) await apagarFoto(supabase, id);

    const { data: linha, error } = id
      ? await supabase.from("ativos").update(dados).eq("id", id).select("id").single()
      : await supabase.from("ativos").insert(dados).select("id").single();

    if (error) return { ok: false, erro: error.message };

    revalidatePath("/ativos", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/manutencoes");
    return { ok: true, id: linha.id };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirAtivo(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();

    // O arquivo não sai por cascade: tem que ser apagado antes da linha.
    await apagarFoto(supabase, id);

    const { error } = await supabase.from("ativos").delete().eq("id", id);
    if (error) return { ok: false, erro: error.message };

    revalidatePath("/ativos", "layout");
    revalidatePath("/dashboard");
    revalidatePath("/manutencoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function atualizarHorimetro(id: string, valor: number): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ativos").update({ horimetro_atual: valor }).eq("id", id);
    if (error) return { ok: false, erro: error.message };

    revalidatePath("/ativos", "layout");
    revalidatePath("/manutencoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/**
 * Prepara o envio da foto: confere que o ativo é da empresa, monta o caminho
 * dentro da pasta dela e assina o upload. O arquivo vai direto do navegador
 * para o Storage — ver o porquê em lib/actions/upload.ts.
 */
export async function prepararFotoAtivo(
  ativoId: string,
  nomeArquivo: string,
): Promise<{ ok: true; caminho: string; token: string } | { ok: false; erro: string }> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { data: alvo } = await supabase
      .from("ativos")
      .select("id")
      .eq("id", ativoId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!alvo) return { ok: false, erro: "Ativo não encontrado nesta empresa." };

    const extensao = nomeArquivo.split(".").pop()?.toLowerCase() ?? "";
    if (!EXTENSOES.includes(extensao)) {
      return { ok: false, erro: "Envie uma imagem JPG, PNG, WEBP ou HEIC." };
    }

    const caminho = `${orgId}/ativos/${ativoId}/${crypto.randomUUID()}-${nomeSeguro(nomeArquivo)}`;
    const { data: assinado, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(caminho);

    if (error || !assinado) {
      return { ok: false, erro: error?.message ?? "Não foi possível preparar o envio." };
    }

    return { ok: true, caminho: assinado.path, token: assinado.token };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Grava o caminho da foto no ativo e descarta a anterior. */
export async function definirFotoAtivo(ativoId: string, caminho: string): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    if (!caminho.startsWith(`${orgId}/ativos/${ativoId}/`) || caminho.includes("..")) {
      return { ok: false, erro: "Caminho de arquivo inválido." };
    }

    await apagarFoto(supabase, ativoId);

    const { error } = await supabase
      .from("ativos")
      .update({ foto_url: caminho })
      .eq("id", ativoId)
      .eq("org_id", orgId);

    if (error) return { ok: false, erro: error.message };

    revalidatePath("/ativos", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
