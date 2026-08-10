"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro, texto, textoObrigatorio, type Resultado } from "@/lib/form";
import type { PapelMembro } from "@/lib/types";

export async function adicionarMembro(fd: FormData): Promise<Resultado> {
  try {
    // A empresa alvo é sempre a que está aberta na tela — nunca deduzida no banco.
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase.rpc("adicionar_membro", {
      p_org: orgId,
      p_email: textoObrigatorio(fd, "email", "o e-mail da pessoa"),
      p_papel: (texto(fd, "papel") ?? "tecnico") as PapelMembro,
    });

    if (error) return { ok: false, erro: error.message };

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function removerMembro(userId: string): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase.rpc("remover_membro", { p_org: orgId, p_user: userId });
    if (error) return { ok: false, erro: error.message };

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
