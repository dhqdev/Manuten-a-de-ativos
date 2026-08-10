import "server-only";
import { createClient as criarCliente } from "@supabase/supabase-js";
import { urlSupabase } from "./config";

/**
 * Cliente com a chave de serviço: IGNORA o RLS.
 *
 * Existe por um motivo só — a rotina diária de notificações precisa varrer
 * todas as empresas, e nenhuma sessão de usuário consegue fazer isso.
 * Nunca use este cliente em páginas ou server actions.
 */
export function createAdminClient() {
  const chave = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!chave) {
    throw new Error(
      "SUPABASE_SECRET_KEY não configurada. Ela é necessária apenas para a rotina " +
        "diária de notificações. Cadastre na Vercel SEM o prefixo NEXT_PUBLIC_.",
    );
  }

  return criarCliente(urlSupabase(), chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
