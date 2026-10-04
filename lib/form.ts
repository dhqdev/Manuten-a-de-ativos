/** Helpers de leitura de FormData (usados pelas server actions). */

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string };

export function texto(fd: FormData, chave: string): string | null {
  const v = String(fd.get(chave) ?? "").trim();
  return v.length ? v : null;
}

export function textoObrigatorio(fd: FormData, chave: string, rotulo: string): string {
  const v = texto(fd, chave);
  if (!v) throw new Error(`Informe ${rotulo}.`);
  return v;
}

/** Aceita "1234.56", "1.234,56" e "1234,56". */
export function paraNumero(entrada: unknown): number | null {
  if (entrada === null || entrada === undefined) return null;
  let s = String(entrada).trim();
  if (!s) return null;
  s = s.replace(/[R$\s]/g, "");
  const temPonto = s.includes(".");
  const temVirgula = s.includes(",");
  if (temPonto && temVirgula) s = s.replace(/\./g, "").replace(",", ".");
  else if (temVirgula) s = s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function numero(fd: FormData, chave: string): number | null {
  return paraNumero(fd.get(chave));
}

export function inteiro(fd: FormData, chave: string, padrao: number | null = null): number | null {
  const n = paraNumero(fd.get(chave));
  return n === null ? padrao : Math.trunc(n);
}

export function booleano(fd: FormData, chave: string): boolean {
  const v = fd.get(chave);
  return v === "on" || v === "true" || v === "1";
}

export function data(fd: FormData, chave: string): string | null {
  const v = texto(fd, chave);
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export function mensagemErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "object" && e && "message" in e) return String((e as { message: unknown }).message);
  return "Não foi possível concluir a operação.";
}

/**
 * Mensagem amigável para erros do banco. Os dois casos mais comuns depois dos
 * papéis (migracao-v2.sql) são o RLS recusando a gravação e o `.single()`
 * não achando a linha porque o RLS a escondeu — ambos são falta de permissão.
 */
export function erroBanco(erro: { code?: string; message?: string }): { ok: false; erro: string } {
  const m = erro.message ?? "";
  if (/row-level security/i.test(m) || erro.code === "42501" || erro.code === "PGRST116") {
    return { ok: false, erro: "Seu papel nesta empresa não permite esta ação. Fale com o gestor." };
  }
  if (erro.code === "23505") return { ok: false, erro: "Já existe um registro com esses dados." };
  return { ok: false, erro: m || "Não foi possível concluir a operação." };
}
