import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Único bucket do projeto. Ver "8. STORAGE" em supabase/schema.sql. */
const BUCKET = "manutencoes";

/**
 * Links temporários (1 h) para as fotos dos ativos. O bucket é privado, então
 * o caminho guardado em `ativos.foto_url` não abre sozinho no navegador.
 */
export async function urlsDasFotos(caminhos: (string | null)[]) {
  const validos = [...new Set(caminhos.filter((c): c is string => Boolean(c)))];
  const mapa = new Map<string, string>();
  if (!validos.length) return mapa;

  const supabase = await createClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(validos, 3600);

  data?.forEach((item, i) => {
    if (item.signedUrl) mapa.set(item.path ?? validos[i], item.signedUrl);
  });

  return mapa;
}
