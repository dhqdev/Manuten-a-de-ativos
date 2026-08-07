"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { mensagemErro, texto, textoObrigatorio, type Resultado } from "@/lib/form";

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

    if (error) return { ok: false, erro: error.message };

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

    if (error) return { ok: false, erro: error.message };

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
    if (error) return { ok: false, erro: error.message };

    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
