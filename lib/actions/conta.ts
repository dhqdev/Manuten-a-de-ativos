"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { desconectar } from "@/lib/evolution";
import { erroBanco, mensagemErro, texto, type Resultado } from "@/lib/form";

type RetornoExclusao = {
  orgs_apagadas: string[];
  arquivos: string[];
  instancias: string[];
};

/**
 * Apaga a conta e tudo que depende dela.
 *
 * Ordem importa: os dados saem primeiro (ainda com a sessão viva), depois os
 * arquivos e o WhatsApp, e só então o usuário no Auth. Invertendo isso, a
 * sessão morreria antes de conseguirmos limpar o resto.
 */
export async function excluirConta(fd: FormData): Promise<Resultado> {
  let concluido = false;

  try {
    const { userId, email } = await getContexto();

    // Confirmação explícita: digitar o próprio e-mail.
    const confirmacao = (texto(fd, "confirmacao") ?? "").toLowerCase();
    if (confirmacao !== email.toLowerCase()) {
      return { ok: false, erro: "Digite seu e-mail exatamente como aparece acima para confirmar." };
    }

    const supabase = await createClient();

    // 1. Dados: empresas onde era a única pessoa somem inteiras; nas demais,
    //    a propriedade é transferida antes da saída.
    const { data, error } = await supabase.rpc("excluir_minha_conta");
    if (error) {
      if (/excluir_minha_conta/i.test(error.message)) {
        return {
          ok: false,
          erro:
            "Função de exclusão ausente no banco. Rode supabase/migracao-seguranca.sql no SQL Editor.",
        };
      }
      return erroBanco(error);
    }

    const retorno = (data ?? { orgs_apagadas: [], arquivos: [], instancias: [] }) as RetornoExclusao;

    // 2. Arquivos e instâncias de WhatsApp das empresas que deixaram de existir.
    const admin = createAdminClient();

    if (retorno.arquivos?.length) {
      await admin.storage.from("manutencoes").remove(retorno.arquivos);
    }

    for (const instancia of retorno.instancias ?? []) {
      await desconectar(instancia);
    }

    // 3. O usuário no Auth. É o último passo: daqui em diante não há sessão.
    const { error: erroAuth } = await admin.auth.admin.deleteUser(userId);
    if (erroAuth) return { ok: false, erro: `Dados apagados, mas o login permaneceu: ${erroAuth.message}` };

    await supabase.auth.signOut();
    concluido = true;
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }

  // redirect() lança por dentro — precisa ficar fora do try/catch.
  if (concluido) {
    revalidatePath("/", "layout");
    redirect("/login?conta=excluida");
  }

  return { ok: false, erro: "Não foi possível concluir a exclusão." };
}
