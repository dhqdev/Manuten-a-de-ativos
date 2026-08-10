/**
 * Só aceita caminhos internos ao próprio app.
 *
 * Sem isto, `?redirect=//site-falso.com` faz o app jogar o usuário recém-logado
 * em um domínio de terceiros (open redirect) — o truque clássico para roubar
 * credenciais em página clonada, já que o link parte do domínio legítimo.
 *
 * Casos barrados: `//host`, `/\host` (o `\` vira `/` em vários navegadores),
 * URLs absolutas e quebras de linha (injeção de cabeçalho).
 */
export function caminhoInterno(valor: string | null | undefined, padrao = "/dashboard"): string {
  const v = (valor ?? "").trim();

  if (!v.startsWith("/")) return padrao;
  if (v.startsWith("//") || v.startsWith("/\\")) return padrao;
  if (/[\r\n\t]/.test(v)) return padrao;

  return v;
}
