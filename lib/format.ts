import type { SituacaoPlano, StatusAtivo, TipoManutencao, UnidadePeriodicidade } from "./types";

export const moeda = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const numero = (v: number | null | undefined, casas = 0) =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(
    Number(v ?? 0),
  );

/** Converte "2026-08-07" em Date local (sem o deslocamento de fuso do ISO). */
export function paraData(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
}

export function dataBR(iso: string | null | undefined) {
  const d = paraData(iso);
  return d ? d.toLocaleDateString("pt-BR") : "—";
}

export function dataHoraBR(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export const hoje = () => new Date().toISOString().slice(0, 10);

export function primeiroDiaDoMes(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toLocaleDateString("sv-SE");
}

export function ultimoDiaDoMes(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString("sv-SE");
}

export const isoLocal = (d: Date) => d.toLocaleDateString("sv-SE");

export const TIPOS_MANUTENCAO: Record<TipoManutencao, string> = {
  preventiva: "Preventiva",
  corretiva: "Corretiva",
  preditiva: "Preditiva",
  inspecao: "Inspeção",
  melhoria: "Melhoria",
};

export const STATUS_ATIVO: Record<StatusAtivo, { label: string; classe: string }> = {
  ativo: { label: "Em operação", classe: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  manutencao: { label: "Em manutenção", classe: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  inativo: { label: "Parado", classe: "bg-slate-100 text-slate-600 ring-slate-500/20" },
  baixado: { label: "Baixado", classe: "bg-red-50 text-red-700 ring-red-600/20" },
};

export const SITUACAO_PLANO: Record<SituacaoPlano, { label: string; classe: string; ponto: string }> = {
  em_dia: { label: "Em dia", classe: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", ponto: "#059669" },
  proxima: { label: "Vence em breve", classe: "bg-amber-50 text-amber-700 ring-amber-600/20", ponto: "#d97706" },
  atrasada: { label: "Atrasada", classe: "bg-red-50 text-red-700 ring-red-600/20", ponto: "#dc2626" },
  inativo: { label: "Pausada", classe: "bg-slate-100 text-slate-600 ring-slate-500/20", ponto: "#64748b" },
};

export const UNIDADES: Record<UnidadePeriodicidade, string> = {
  dias: "dia(s)",
  meses: "mês(es)",
  horas: "hora(s) de uso",
};

export function descreverPeriodicidade(valor: number, unidade: UnidadePeriodicidade) {
  return `A cada ${numero(valor)} ${UNIDADES[unidade]}`;
}

export function descreverPrazo(dias: number | null) {
  if (dias === null || dias === undefined) return "—";
  if (dias === 0) return "Vence hoje";
  if (dias < 0) return `${Math.abs(dias)} dia(s) em atraso`;
  return `Em ${dias} dia(s)`;
}

export function iniciais(nome: string | null | undefined) {
  if (!nome) return "?";
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
