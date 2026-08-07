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
import type { StatusAtivo } from "@/lib/types";

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
    };

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
