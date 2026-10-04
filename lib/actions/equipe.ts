"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { erroBanco, mensagemErro, texto, textoObrigatorio, type Resultado } from "@/lib/form";
import type { PapelMembro } from "@/lib/types";

const PAPEIS_CONVIDAVEIS: PapelMembro[] = ["gestor", "tecnico", "leitor"];

export type Credenciais =
  | { ok: true; nome: string; email: string; senha: string | null; aviso?: string }
  | { ok: false; erro: string };

/** Senha legível para ditar ou mandar no WhatsApp: sem 0/O, 1/l/I. */
function gerarSenha(tamanho = 10) {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let senha = "";
  for (let i = 0; i < tamanho; i++) senha += letras[randomInt(letras.length)];
  return senha;
}

function papelValido(valor: string | null): PapelMembro {
  return PAPEIS_CONVIDAVEIS.includes(valor as PapelMembro) ? (valor as PapelMembro) : "tecnico";
}

/**
 * A empresa é sempre a aberta na tela, e a permissão é conferida NO BANCO com
 * a sessão de quem pediu — só depois disso a chave de serviço entra em cena.
 */
async function exigirGestor() {
  const ctx = await getContexto();
  const supabase = await createClient();
  const { data: pode } = await supabase.rpc("pode_gerenciar_equipe", { p_org: ctx.orgId });
  if (!pode) throw new Error("Só o proprietário ou um gestor pode gerenciar a equipe.");
  return { ...ctx, supabase };
}

/**
 * Cria o login de uma pessoa já dentro da empresa, com o papel escolhido.
 * A senha volta para a tela (para copiar ou mandar no WhatsApp) e não fica
 * guardada em lugar nenhum além do Auth do Supabase.
 *
 * Se o e-mail já tem conta, apenas adiciona a pessoa à equipe.
 */
export async function criarUsuario(fd: FormData): Promise<Credenciais> {
  try {
    const { orgId, supabase } = await exigirGestor();

    const nome = textoObrigatorio(fd, "nome", "o nome da pessoa");
    const email = textoObrigatorio(fd, "email", "o e-mail").toLowerCase();
    const papel = papelValido(texto(fd, "papel"));
    const senha = texto(fd, "senha") ?? gerarSenha();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
    if (senha.length < 6) return { ok: false, erro: "A senha deve ter no mínimo 6 caracteres." };

    const admin = createAdminClient();
    const { data: criado, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
      // app_metadata só a chave de serviço define: é ele que o trigger
      // handle_new_user usa para pôr a pessoa direto nesta empresa.
      app_metadata: { convite_org: orgId, convite_papel: papel },
    });

    if (error || !criado?.user) {
      const jaExiste =
        error?.code === "email_exists" || /already (been )?registered|already exists/i.test(error?.message ?? "");

      if (!jaExiste) return { ok: false, erro: error?.message ?? "Não foi possível criar o usuário." };

      // Conta existente: entra na equipe com a senha que já tem.
      const { error: erroMembro } = await supabase.rpc("adicionar_membro", {
        p_org: orgId,
        p_email: email,
        p_papel: papel,
      });
      if (erroMembro) return erroBanco(erroMembro);

      revalidatePath("/configuracoes");
      return {
        ok: true,
        nome,
        email,
        senha: null,
        aviso: "Este e-mail já tinha conta. A pessoa foi adicionada à equipe e entra com a senha que já usa.",
      };
    }

    const novoId = criado.user.id;

    // Rede de segurança caso o banco ainda não tenha a migração v2 (trigger
    // antigo): garante o vínculo e descarta a empresa vazia criada no cadastro.
    await admin.from("profiles").upsert({ id: novoId, nome, email, org_atual: orgId }, { onConflict: "id" });
    await admin
      .from("org_membros")
      .upsert({ org_id: orgId, user_id: novoId, papel }, { onConflict: "org_id,user_id" });
    await admin.from("organizacoes").delete().eq("criado_por", novoId).neq("id", orgId);

    revalidatePath("/configuracoes");
    return { ok: true, nome, email, senha };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Adiciona alguém que já tem conta, pelo e-mail. */
export async function adicionarMembro(fd: FormData): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase.rpc("adicionar_membro", {
      p_org: orgId,
      p_email: textoObrigatorio(fd, "email", "o e-mail da pessoa"),
      p_papel: papelValido(texto(fd, "papel")),
    });

    if (error) return erroBanco(error);

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function alterarPapel(userId: string, papel: PapelMembro): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase.rpc("alterar_papel_membro", {
      p_org: orgId,
      p_user: userId,
      p_papel: papelValido(papel),
    });
    if (error) return erroBanco(error);

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/**
 * Gera uma senha nova para alguém da equipe.
 *
 * Só vale para quem participa APENAS desta empresa: sem essa trava, o gestor
 * de uma empresa poderia trocar a senha de alguém que é dono de outra — e
 * entrar nos dados dela.
 */
export async function redefinirSenha(userId: string): Promise<Credenciais> {
  try {
    const { orgId, userId: eu } = await exigirGestor();
    if (userId === eu) return { ok: false, erro: "Para trocar a sua senha, use \"Alterar senha\"." };

    const admin = createAdminClient();
    const { data: vinculos } = await admin
      .from("org_membros")
      .select("org_id, papel")
      .eq("user_id", userId);

    const aqui = vinculos?.find((v) => v.org_id === orgId);
    if (!aqui) return { ok: false, erro: "Esta pessoa não faz parte da equipe." };
    if (aqui.papel === "proprietario") {
      return { ok: false, erro: "A senha do proprietário não pode ser trocada por aqui." };
    }
    if ((vinculos?.length ?? 0) > 1) {
      return {
        ok: false,
        erro: "Esta pessoa também participa de outra empresa. Peça para ela usar \"Esqueci minha senha\" no login.",
      };
    }

    const { data: alvo, error: erroBusca } = await admin.auth.admin.getUserById(userId);
    if (erroBusca || !alvo?.user) return { ok: false, erro: "Usuário não encontrado." };

    const senha = gerarSenha();
    const { error } = await admin.auth.admin.updateUserById(userId, { password: senha });
    if (error) return { ok: false, erro: error.message };

    const { data: perfil } = await admin.from("profiles").select("nome").eq("id", userId).maybeSingle();

    return { ok: true, nome: perfil?.nome ?? "", email: alvo.user.email ?? "", senha };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/**
 * Tira a pessoa da equipe. Se o login foi criado por esta empresa e ela não
 * participa de nenhuma outra, o login também é apagado — senão, no próximo
 * acesso, ela cairia numa empresa vazia criada automaticamente.
 */
export async function removerMembro(userId: string): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { error } = await supabase.rpc("remover_membro", { p_org: orgId, p_user: userId });
    if (error) return erroBanco(error);

    try {
      const admin = createAdminClient();
      const { data: alvo } = await admin.auth.admin.getUserById(userId);
      const { count } = await admin
        .from("org_membros")
        .select("org_id", { count: "exact", head: true })
        .eq("user_id", userId);

      if (alvo?.user?.app_metadata?.convite_org === orgId && (count ?? 0) === 0) {
        await admin.from("profiles").delete().eq("id", userId);
        await admin.auth.admin.deleteUser(userId);
      }
    } catch {
      // Sem a chave de serviço a pessoa só sai da equipe; o login fica.
    }

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
