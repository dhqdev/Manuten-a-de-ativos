import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Único bucket do projeto. Ver "8. STORAGE" em supabase/schema.sql. */
export const BUCKET = "manutencoes";

/**
 * Apaga arquivos do bucket em lotes. Linhas apagadas no banco não levam os
 * arquivos junto (não existe cascade para o Storage), então toda exclusão que
 * envolve anexos ou fotos precisa passar por aqui depois de apagar as linhas.
 */
export async function removerArquivos(supabase: SupabaseClient, caminhos: (string | null)[]) {
  const validos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];

  for (let i = 0; i < validos.length; i += 500) {
    await supabase.storage.from(BUCKET).remove(validos.slice(i, i + 500));
  }
}
