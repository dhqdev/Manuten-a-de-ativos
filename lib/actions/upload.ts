"use server";

import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro } from "@/lib/form";

/** Único bucket do projeto. Ver "8. STORAGE" em supabase/schema.sql. */
const BUCKET = "manutencoes";

export type UploadAssinado =
  | { ok: true; caminho: string; token: string }
  | { ok: false; erro: string };

/**
 * Devolve um endereço assinado para o navegador enviar o arquivo direto ao
 * Storage.
 *
 * Por que não enviar pelo cliente do Supabase no navegador: os cookies de
 * sessão são httpOnly (lib/supabase/proxy.ts), então lá não existe sessão e o
 * Storage recusaria o envio. E por que não passar o arquivo por uma server
 * action: o corpo de uma action é limitado (1 MB por padrão) — um anexo de
 * 25 MB nunca chegaria.
 *
 * A assinatura é criada com a sessão do servidor, então o RLS do bucket é
 * verificado aqui. O caminho é obrigado a começar pela pasta da empresa.
 */
export async function criarUploadAssinado(caminho: string): Promise<UploadAssinado> {
  try {
    const { orgId } = await getContexto();

    if (!caminho.startsWith(`${orgId}/`) || caminho.includes("..")) {
      return { ok: false, erro: "Caminho de arquivo inválido." };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(caminho);

    if (error || !data) {
      return { ok: false, erro: error?.message ?? "Não foi possível preparar o envio." };
    }

    return { ok: true, caminho: data.path, token: data.token };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
