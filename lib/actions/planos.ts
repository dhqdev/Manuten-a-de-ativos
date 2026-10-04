"use server";

import { revalidatePath } from "next/cache";
import { SEM_PERMISSAO } from "@/lib/permissoes";
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
import type { UnidadePeriodicidade } from "@/lib/types";

function revalidar() {
  revalidatePath("/dashboard");
  revalidatePath("/manutencoes");
  revalidatePath("/calendario");
  revalidatePath("/relatorios");
  revalidatePath("/ativos", "layout");
}

export async function salvarPlano(fd: FormData): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const id = texto(fd, "id");
    const unidade = (texto(fd, "periodicidade_unidade") ?? "meses") as UnidadePeriodicidade;
    const periodicidade = inteiro(fd, "periodicidade_valor", 0) ?? 0;

    if (periodicidade <= 0) return { ok: false, erro: "A periodicidade deve ser maior que zero." };

    const proximaData = data(fd, "proxima_data");
    const proximoHorimetro = numero(fd, "proximo_horimetro");

    if (unidade === "horas" && proximoHorimetro === null)
      return { ok: false, erro: "Informe o horímetro da próxima manutenção." };
    if (unidade !== "horas" && !proximaData)
      return { ok: false, erro: "Informe a data da próxima manutenção." };

    const dados = {
      org_id: orgId,
      ativo_id: textoObrigatorio(fd, "ativo_id", "o ativo"),
      tipo: textoObrigatorio(fd, "tipo", "o tipo de manutenção"),
      descricao: texto(fd, "descricao"),
      periodicidade_valor: periodicidade,
      periodicidade_unidade: unidade,
      proxima_data: proximaData,
      proximo_horimetro: proximoHorimetro,
      alerta_antecedencia_dias: inteiro(fd, "alerta_antecedencia_dias", 7) ?? 7,
      alerta_antecedencia_horas: numero(fd, "alerta_antecedencia_horas") ?? 50,
      responsavel: texto(fd, "responsavel"),
      custo_estimado: numero(fd, "custo_estimado"),
      ativo: fd.has("ativo") ? booleano(fd, "ativo") : true,
      observacoes: texto(fd, "observacoes"),
    };

    const { data: linha, error } = id
      ? await supabase.from("planos_manutencao").update(dados).eq("id", id).select("id").single()
      : await supabase.from("planos_manutencao").insert(dados).select("id").single();

    if (error) return erroBanco(error);

    revalidar();
    return { ok: true, id: linha.id };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirPlano(id: string): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { data: afetadas, error } = await supabase.from("planos_manutencao").delete().eq("id", id).select("id");
    if (error) return erroBanco(error);
    if (!afetadas?.length) return { ok: false, erro: SEM_PERMISSAO };
    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function alternarPlano(id: string, ativo: boolean): Promise<Resultado> {
  try {
    const supabase = await createClient();
    const { data: afetadas, error } = await supabase
      .from("planos_manutencao")
      .update({ ativo })
      .eq("id", id)
      .select("id");
    if (error) return erroBanco(error);
    if (!afetadas?.length) return { ok: false, erro: SEM_PERMISSAO };
    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
