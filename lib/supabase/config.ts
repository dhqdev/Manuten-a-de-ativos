/**
 * Sem as variáveis de ambiente o build passa normalmente, mas o app quebra em
 * runtime com um erro genérico ("supabaseUrl is required") — difícil de
 * entender quando acontece só em produção. Estas funções trocam isso por uma
 * mensagem que diz exatamente o que fazer.
 */

function exigir(nome: string, valor: string | undefined) {
  const limpo = valor?.trim();

  if (!limpo) {
    throw new Error(
      `Variável de ambiente ${nome} não configurada. ` +
        `Na Vercel: Settings → Environment Variables → adicione ${nome} ` +
        `(marcando Production, Preview e Development) e faça um Redeploy. ` +
        `Localmente: preencha o arquivo .env.local.`,
    );
  }

  return limpo;
}

export function urlSupabase() {
  return exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function chaveSupabase() {
  return exigir(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
