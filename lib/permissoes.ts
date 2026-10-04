import type { PapelMembro } from "@/lib/types";

/**
 * O que cada papel pode fazer. Espelha as policies de RLS (supabase/migracao-v2.sql):
 * a tela usa isto só para esconder botões — quem barra de verdade é o banco.
 *
 *   proprietário / gestor -> tudo, inclusive equipe e configurações da empresa
 *   técnico               -> registra manutenções, anexos e movimenta pneus
 *   leitor                -> só consulta
 */
export function podeGerenciar(papel: PapelMembro) {
  return papel === "proprietario" || papel === "gestor";
}

export function podeRegistrar(papel: PapelMembro) {
  return papel !== "leitor";
}

export const SEM_PERMISSAO = "Seu papel nesta empresa não permite esta ação. Fale com o gestor.";
