"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { caminhoInterno } from "@/lib/url-segura";

export type EstadoForm = { erro?: string; sucesso?: string } | null;

function traduzir(mensagem: string) {
  const m = mensagem.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Este e-mail já está cadastrado. Faça login.";
  if (m.includes("password should be at least"))
    return "A senha deve ter no mínimo 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  if (m.includes("unable to validate email")) return "E-mail inválido.";
  return mensagem;
}

/**
 * Endereço público do app — usado nos links de confirmação de e-mail e de
 * redefinição de senha. Em produção defina NEXT_PUBLIC_SITE_URL; sem ela,
 * caímos nos cabeçalhos da requisição (que funcionam bem em desenvolvimento).
 */
async function origem() {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configurado) return configurado.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function entrar(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  // Saneado de novo aqui: a página também filtra, mas o FormData vem do cliente.
  const destino = caminhoInterno(String(formData.get("redirect") ?? ""));

  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: traduzir(error.message) };

  revalidatePath("/", "layout");
  redirect(destino);
}

export async function cadastrar(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const empresa = String(formData.get("empresa") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (!nome || !email || !senha) return { erro: "Preencha nome, e-mail e senha." };
  if (senha.length < 6) return { erro: "A senha deve ter no mínimo 6 caracteres." };
  if (senha !== confirmacao) return { erro: "As senhas não conferem." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: { nome, empresa, telefone },
      emailRedirectTo: `${await origem()}/auth/confirmar`,
    },
  });

  if (error) return { erro: traduzir(error.message) };

  // Confirmação de e-mail ligada no Supabase: ainda não há sessão.
  if (!data.session) {
    return {
      sucesso: `Cadastro criado. Enviamos um link de confirmação para ${email}. Confirme para acessar o sistema.`,
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function recuperarSenha(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { erro: "Informe seu e-mail." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origem()}/auth/confirmar?next=/nova-senha`,
  });
  if (error) return { erro: traduzir(error.message) };

  return { sucesso: "Se este e-mail estiver cadastrado, você receberá o link de redefinição." };
}

export async function definirNovaSenha(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const senha = String(formData.get("senha") ?? "");
  const confirmacao = String(formData.get("confirmacao") ?? "");

  if (senha.length < 6) return { erro: "A senha deve ter no mínimo 6 caracteres." };
  if (senha !== confirmacao) return { erro: "As senhas não conferem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { erro: traduzir(error.message) };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
