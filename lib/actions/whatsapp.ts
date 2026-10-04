"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  erroBanco,
  booleano,
  inteiro,
  mensagemErro,
  type Resultado,
} from "@/lib/form";
import {
  abrirConexao,
  dadosInstancia,
  desconectar,
  enviarTexto,
  estadoConexao,
  nomeInstancia,
  renovarQr,
} from "@/lib/evolution";
import { montarResumo } from "@/lib/whatsapp-mensagem";
import { SEM_PERMISSAO, podeGerenciar } from "@/lib/permissoes";

/**
 * Conectar, desconectar e mexer nas preferências é coisa de proprietário ou
 * gestor. A checagem vem antes de qualquer chamada à Evolution: o RLS só
 * protege o banco, não o servidor do WhatsApp.
 */
async function exigirGestor() {
  const ctx = await getContexto();
  if (!podeGerenciar(ctx.papel)) throw new Error(SEM_PERMISSAO);
  return ctx;
}

export type StatusWhatsapp = {
  status: "desconectado" | "conectando" | "conectado";
  qr: string | null;
  numero: string | null;
  nomePerfil: string | null;
  erro?: string;
};

/** Cria/reabre a instância da empresa e devolve o QR code para escanear. */
export async function iniciarConexao(): Promise<StatusWhatsapp> {
  try {
    const { orgId } = await exigirGestor();
    const supabase = await createClient();
    const instancia = nomeInstancia(orgId);

    const { qr } = await abrirConexao(instancia);

    await supabase.from("whatsapp_conexoes").upsert(
      { org_id: orgId, instancia, status: "conectando" },
      { onConflict: "org_id" },
    );

    revalidatePath("/configuracoes");
    return { status: "conectando", qr, numero: null, nomePerfil: null };
  } catch (e) {
    return {
      status: "desconectado",
      qr: null,
      numero: null,
      nomePerfil: null,
      erro: mensagemErro(e),
    };
  }
}

/** Consultado a cada poucos segundos enquanto o QR está na tela. */
export async function consultarStatus(): Promise<StatusWhatsapp> {
  try {
    const { orgId } = await exigirGestor();
    const supabase = await createClient();

    const { data: conexao } = await supabase
      .from("whatsapp_conexoes")
      .select("instancia, numero, nome_perfil, status")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!conexao) {
      return { status: "desconectado", qr: null, numero: null, nomePerfil: null };
    }

    const estado = await estadoConexao(conexao.instancia);

    if (estado === "open") {
      const dados = await dadosInstancia(conexao.instancia);

      await supabase
        .from("whatsapp_conexoes")
        .update({
          status: "conectado",
          numero: dados?.numero ?? conexao.numero,
          nome_perfil: dados?.nomePerfil ?? conexao.nome_perfil,
        })
        .eq("org_id", orgId);

      revalidatePath("/configuracoes");
      return {
        status: "conectado",
        qr: null,
        numero: dados?.numero ?? conexao.numero,
        nomePerfil: dados?.nomePerfil ?? conexao.nome_perfil,
      };
    }

    if (estado === "connecting") {
      // QR expira em ~1 minuto: pega um novo a cada consulta.
      const qr = await renovarQr(conexao.instancia);
      return { status: "conectando", qr, numero: null, nomePerfil: null };
    }

    await supabase.from("whatsapp_conexoes").update({ status: "desconectado" }).eq("org_id", orgId);
    return { status: "desconectado", qr: null, numero: null, nomePerfil: null };
  } catch (e) {
    return {
      status: "desconectado",
      qr: null,
      numero: null,
      nomePerfil: null,
      erro: mensagemErro(e),
    };
  }
}

export async function encerrarConexao(): Promise<Resultado> {
  try {
    const { orgId } = await exigirGestor();
    const supabase = await createClient();

    const { data: conexao } = await supabase
      .from("whatsapp_conexoes")
      .select("instancia")
      .eq("org_id", orgId)
      .maybeSingle();

    if (conexao) await desconectar(conexao.instancia);

    await supabase.from("whatsapp_conexoes").delete().eq("org_id", orgId);

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function salvarPreferenciasWhatsapp(fd: FormData): Promise<Resultado> {
  try {
    const { orgId } = await exigirGestor();
    const supabase = await createClient();

    const { error } = await supabase
      .from("whatsapp_conexoes")
      .update({
        notificar: booleano(fd, "notificar"),
        incluir_atrasadas: booleano(fd, "incluir_atrasadas"),
        dias_antecedencia: Math.min(Math.max(inteiro(fd, "dias_antecedencia", 3) ?? 3, 0), 60),
        horario_envio: Math.min(Math.max(inteiro(fd, "horario_envio", 8) ?? 8, 0), 23),
      })
      .eq("org_id", orgId);

    if (error) return erroBanco(error);

    revalidatePath("/configuracoes");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Manda agora o mesmo resumo que a rotina diária enviaria. */
export async function enviarResumoTeste(): Promise<Resultado> {
  try {
    const { orgId, organizacao } = await exigirGestor();
    const supabase = await createClient();

    const { data: conexao } = await supabase
      .from("whatsapp_conexoes")
      .select("instancia, numero, status, dias_antecedencia")
      .eq("org_id", orgId)
      .maybeSingle();

    if (!conexao || conexao.status !== "conectado" || !conexao.numero) {
      return { ok: false, erro: "Conecte um WhatsApp antes de enviar o teste." };
    }

    const { data: pendencias, error } = await supabase.rpc("whatsapp_pendencias", { p_org: orgId });
    if (error) return erroBanco(error);

    const texto = montarResumo(organizacao.nome, pendencias ?? [], true);
    await enviarTexto(conexao.instancia, conexao.numero, texto);

    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
