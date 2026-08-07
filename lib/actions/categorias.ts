"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { inteiro, mensagemErro, texto, textoObrigatorio, type Resultado } from "@/lib/form";

export async function salvarCategoria(fd: FormData): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const id = texto(fd, "id");
    const dados = {
      org_id: orgId,
      nome: textoObrigatorio(fd, "nome", "o nome da categoria"),
      descricao: texto(fd, "descricao"),
      cor: texto(fd, "cor") ?? "#2563eb",
      icone: texto(fd, "icone") ?? "package",
      ordem: inteiro(fd, "ordem", 0) ?? 0,
    };

    const { data, error } = id
      ? await supabase.from("categorias").update(dados).eq("id", id).select("id").single()
      : await supabase.from("categorias").insert(dados).select("id").single();

    if (error) {
      if (error.code === "23505") return { ok: false, erro: "Já existe uma categoria com esse nome." };
      return { ok: false, erro: error.message };
    }

    revalidatePath("/ativos");
    revalidatePath("/dashboard");
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirCategoria(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();

    const { count } = await supabase
      .from("ativos")
      .select("id", { count: "exact", head: true })
      .eq("categoria_id", id);

    if (count && count > 0) {
      return {
        ok: false,
        erro: `Esta categoria tem ${count} ativo(s). Mova ou exclua os ativos antes de removê-la.`,
      };
    }

    const { error } = await supabase.from("categorias").delete().eq("id", id);
    if (error) return { ok: false, erro: error.message };

    revalidatePath("/ativos");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
