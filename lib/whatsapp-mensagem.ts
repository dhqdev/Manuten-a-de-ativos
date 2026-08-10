import { dataBR, numero } from "@/lib/format";

export type Pendencia = {
  plano_id: string;
  ativo_nome: string;
  identificacao: string | null;
  tipo: string;
  categoria: string;
  situacao: "atrasada" | "proxima" | "em_dia" | "inativo";
  proxima_data: string | null;
  dias_restantes: number | null;
  proximo_horimetro: number | null;
  horimetro_atual: number | null;
  unidade: "dias" | "meses" | "horas";
};

function quando(p: Pendencia) {
  if (p.unidade === "horas") {
    const faltam = Number(p.proximo_horimetro ?? 0) - Number(p.horimetro_atual ?? 0);
    return faltam <= 0
      ? `horímetro passou em ${numero(Math.abs(faltam))} h`
      : `faltam ${numero(faltam)} h`;
  }
  if (p.dias_restantes === null || p.dias_restantes === undefined) return dataBR(p.proxima_data);
  if (p.dias_restantes < 0) return `${Math.abs(p.dias_restantes)} dia(s) em atraso`;
  if (p.dias_restantes === 0) return "vence hoje";
  return `em ${p.dias_restantes} dia(s) — ${dataBR(p.proxima_data)}`;
}

/** Monta o texto do resumo diário enviado no WhatsApp. */
export function montarResumo(empresa: string, pendencias: Pendencia[], ehTeste = false): string {
  const atrasadas = pendencias.filter((p) => p.situacao === "atrasada");
  const proximas = pendencias.filter((p) => p.situacao !== "atrasada");

  const linhas: string[] = [];

  if (ehTeste) linhas.push("_Mensagem de teste_", "");

  linhas.push(`*Manutenções — ${empresa}*`, `_${dataBR(new Date().toLocaleDateString("sv-SE"))}_`, "");

  if (pendencias.length === 0) {
    linhas.push("✅ Nenhuma manutenção pendente. Tudo em dia.");
    return linhas.join("\n");
  }

  if (atrasadas.length) {
    linhas.push(`🔴 *ATRASADAS (${atrasadas.length})*`);
    for (const p of atrasadas.slice(0, 15)) {
      linhas.push(
        `• *${p.ativo_nome}*${p.identificacao ? ` (${p.identificacao})` : ""}`,
        `  ${p.tipo} — ${quando(p)}`,
      );
    }
    if (atrasadas.length > 15) linhas.push(`  _...e mais ${atrasadas.length - 15}_`);
    linhas.push("");
  }

  if (proximas.length) {
    linhas.push(`🟡 *PRÓXIMAS (${proximas.length})*`);
    for (const p of proximas.slice(0, 15)) {
      linhas.push(
        `• *${p.ativo_nome}*${p.identificacao ? ` (${p.identificacao})` : ""}`,
        `  ${p.tipo} — ${quando(p)}`,
      );
    }
    if (proximas.length > 15) linhas.push(`  _...e mais ${proximas.length - 15}_`);
    linhas.push("");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (site) linhas.push(`Abrir calendário: ${site}/calendario`);

  return linhas.join("\n").trim();
}
