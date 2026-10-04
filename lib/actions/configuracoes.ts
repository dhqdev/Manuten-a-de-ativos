"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  erroBanco,
  mensagemErro,
  texto,
  textoObrigatorio,
  type Resultado,
} from "@/lib/form";

export async function salvarEmpresa(fd: FormData): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase
      .from("organizacoes")
      .update({
        nome: textoObrigatorio(fd, "nome", "o nome da empresa"),
        cnpj: texto(fd, "cnpj"),
        telefone: texto(fd, "telefone"),
        endereco: texto(fd, "endereco"),
      })
      .eq("id", orgId);

    if (error) return erroBanco(error);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function salvarPerfil(fd: FormData): Promise<Resultado> {
  try {
    const { userId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase
      .from("profiles")
      .update({
        nome: textoObrigatorio(fd, "nome", "seu nome"),
        telefone: texto(fd, "telefone"),
        cargo: texto(fd, "cargo"),
      })
      .eq("id", userId);

    if (error) return erroBanco(error);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Troca a empresa ativa (para quem participa de mais de uma). */
export async function trocarEmpresa(fd: FormData): Promise<Resultado> {
  try {
    const { userId } = await getContexto();
    const supabase = await createClient();
    const orgId = textoObrigatorio(fd, "org_id", "a empresa");

    const { data: membro } = await supabase
      .from("org_membros")
      .select("org_id")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!membro) return { ok: false, erro: "Você não faz parte desta empresa." };

    const { error } = await supabase.from("profiles").update({ org_atual: orgId }).eq("id", userId);
    if (error) return erroBanco(error);

    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function alterarSenha(fd: FormData): Promise<Resultado> {
  try {
    const senha = String(fd.get("senha") ?? "");
    const confirmacao = String(fd.get("confirmacao") ?? "");

    if (senha.length < 6) return { ok: false, erro: "A senha deve ter no mínimo 6 caracteres." };
    if (senha !== confirmacao) return { ok: false, erro: "As senhas não conferem." };

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) return erroBanco(error);

    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
