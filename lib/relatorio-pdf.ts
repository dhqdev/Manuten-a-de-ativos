import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { TIPOS_MANUTENCAO, dataBR, moeda, numero } from "@/lib/format";
import type { ManutencaoCompleta, PlanoStatus } from "@/lib/types";

export type DadosRelatorio = {
  empresa: string;
  periodoDe: string;
  periodoAte: string;
  filtros: string[];
  manutencoes: ManutencaoCompleta[];
  proximas: PlanoStatus[];
};

export type Totais = {
  custoTotal: number;
  quantidade: number;
  ticketMedio: number;
  porCategoria: { nome: string; valor: number; quantidade: number }[];
  porAtivo: { nome: string; identificacao: string | null; valor: number; quantidade: number }[];
};

const AZUL: [number, number, number] = [37, 99, 235];
const ARDOSIA: [number, number, number] = [51, 65, 85];
const CINZA_CLARO: [number, number, number] = [241, 245, 249];

export function calcularTotais(manutencoes: ManutencaoCompleta[]): Totais {
  const custoTotal = manutencoes.reduce((s, m) => s + Number(m.valor ?? 0), 0);

  const catMap = new Map<string, { nome: string; valor: number; quantidade: number }>();
  const ativoMap = new Map<
    string,
    { nome: string; identificacao: string | null; valor: number; quantidade: number }
  >();

  for (const m of manutencoes) {
    const c = catMap.get(m.categoria_id) ?? { nome: m.categoria_nome, valor: 0, quantidade: 0 };
    c.valor += Number(m.valor ?? 0);
    c.quantidade += 1;
    catMap.set(m.categoria_id, c);

    const a = ativoMap.get(m.ativo_id) ?? {
      nome: m.ativo_nome,
      identificacao: m.ativo_identificacao,
      valor: 0,
      quantidade: 0,
    };
    a.valor += Number(m.valor ?? 0);
    a.quantidade += 1;
    ativoMap.set(m.ativo_id, a);
  }

  return {
    custoTotal,
    quantidade: manutencoes.length,
    ticketMedio: manutencoes.length ? custoTotal / manutencoes.length : 0,
    porCategoria: [...catMap.values()].sort((x, y) => y.valor - x.valor),
    porAtivo: [...ativoMap.values()].sort((x, y) => y.valor - x.valor),
  };
}

export function gerarPDF(dados: DadosRelatorio): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const margem = 14;
  const totais = calcularTotais(dados.manutencoes);

  // ---- Cabeçalho -----------------------------------------------------------
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, largura, 30, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Relatório de Manutenções", margem, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(dados.empresa, margem, 20);
  doc.setFontSize(8.5);
  doc.text(
    `Período: ${dataBR(dados.periodoDe)} a ${dataBR(dados.periodoAte)}`,
    largura - margem,
    13,
    { align: "right" },
  );
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, largura - margem, 20, {
    align: "right",
  });

  let y = 38;

  if (dados.filtros.length) {
    doc.setTextColor(...ARDOSIA);
    doc.setFontSize(8.5);
    doc.text(`Filtros: ${dados.filtros.join("  |  ")}`, margem, y);
    y += 7;
  }

  // ---- Indicadores ---------------------------------------------------------
  const cards = [
    { rotulo: "CUSTO TOTAL", valor: moeda(totais.custoTotal) },
    { rotulo: "MANUTENÇÕES", valor: numero(totais.quantidade) },
    { rotulo: "CUSTO MÉDIO", valor: moeda(totais.ticketMedio) },
    { rotulo: "PRÓXIMAS", valor: numero(dados.proximas.length) },
  ];

  const larguraCard = (largura - margem * 2 - 6) / 4;
  cards.forEach((c, i) => {
    const x = margem + i * (larguraCard + 2);
    doc.setFillColor(...CINZA_CLARO);
    doc.roundedRect(x, y, larguraCard, 17, 2, 2, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(c.rotulo, x + 3, y + 6);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(c.valor, x + 3, y + 13);
  });

  y += 25;

  const estiloTabela = {
    theme: "grid" as const,
    headStyles: { fillColor: ARDOSIA, textColor: 255, fontSize: 8, fontStyle: "bold" as const },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] as [number, number, number] },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number, number, number] },
    styles: { cellPadding: 2, lineColor: [226, 232, 240] as [number, number, number], lineWidth: 0.1 },
    margin: { left: margem, right: margem },
  };

  const titulo = (texto: string, posY: number) => {
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(texto, margem, posY);
    return posY + 3;
  };

  // ---- Custos por categoria ------------------------------------------------
  if (totais.porCategoria.length) {
    y = titulo("Custos por categoria", y);
    autoTable(doc, {
      ...estiloTabela,
      startY: y,
      head: [["Categoria", "Manutenções", "Custo total", "% do total"]],
      body: totais.porCategoria.map((c) => [
        c.nome,
        numero(c.quantidade),
        moeda(c.valor),
        totais.custoTotal > 0 ? `${((c.valor / totais.custoTotal) * 100).toFixed(1)}%` : "0%",
      ]),
      columnStyles: {
        1: { halign: "center", cellWidth: 26 },
        2: { halign: "right", cellWidth: 34 },
        3: { halign: "right", cellWidth: 24 },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ---- Custos por ativo ----------------------------------------------------
  if (totais.porAtivo.length) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y = titulo("Custos por ativo", y);
    autoTable(doc, {
      ...estiloTabela,
      startY: y,
      head: [["Ativo", "Identificação", "Manutenções", "Custo total"]],
      body: totais.porAtivo.map((a) => [
        a.nome,
        a.identificacao ?? "—",
        numero(a.quantidade),
        moeda(a.valor),
      ]),
      columnStyles: {
        1: { cellWidth: 34 },
        2: { halign: "center", cellWidth: 26 },
        3: { halign: "right", cellWidth: 34 },
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // ---- Histórico detalhado -------------------------------------------------
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  y = titulo("Histórico de serviços realizados", y);

  autoTable(doc, {
    ...estiloTabela,
    startY: y,
    head: [["Data", "Ativo", "Tipo", "Serviço realizado", "Horím. / KM", "Responsável / Empresa", "Valor"]],
    body: dados.manutencoes.length
      ? dados.manutencoes.map((m) => [
          dataBR(m.data_manutencao),
          `${m.ativo_nome}${m.ativo_identificacao ? `\n${m.ativo_identificacao}` : ""}`,
          TIPOS_MANUTENCAO[m.tipo],
          `${m.descricao}${m.pecas ? `\nPeças: ${m.pecas}` : ""}`,
          m.horimetro !== null && m.horimetro !== undefined ? numero(m.horimetro) : "—",
          [m.responsavel, m.empresa].filter(Boolean).join("\n") || "—",
          moeda(m.valor),
        ])
      : [["—", "—", "—", "Nenhuma manutenção no período selecionado", "—", "—", "—"]],
    foot: dados.manutencoes.length
      ? [["", "", "", "", "", "TOTAL", moeda(totais.custoTotal)]]
      : undefined,
    footStyles: {
      fillColor: CINZA_CLARO,
      textColor: [15, 23, 42],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "right",
    },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      4: { halign: "right", cellWidth: 18 },
      5: { cellWidth: 28 },
      6: { halign: "right", cellWidth: 24 },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // ---- Próximas manutenções ------------------------------------------------
  if (dados.proximas.length) {
    if (y > 230) {
      doc.addPage();
      y = 20;
    }
    y = titulo("Próximas manutenções programadas", y);

    autoTable(doc, {
      ...estiloTabela,
      startY: y,
      head: [["Ativo", "Tipo de manutenção", "Periodicidade", "Vencimento", "Situação"]],
      body: dados.proximas.map((p) => [
        `${p.ativo_nome}${p.ativo_identificacao ? `\n${p.ativo_identificacao}` : ""}`,
        p.tipo,
        `${numero(p.periodicidade_valor)} ${p.periodicidade_unidade}`,
        p.periodicidade_unidade === "horas"
          ? `${numero(p.proximo_horimetro)} h/km`
          : dataBR(p.proxima_data),
        p.situacao === "atrasada" ? "ATRASADA" : p.situacao === "proxima" ? "Vence em breve" : "Em dia",
      ]),
      columnStyles: {
        2: { cellWidth: 28 },
        3: { cellWidth: 28 },
        4: { cellWidth: 30 },
      },
      didParseCell: (dado) => {
        if (dado.section === "body" && dado.column.index === 4) {
          const texto = String(dado.cell.raw ?? "");
          if (texto === "ATRASADA") dado.cell.styles.textColor = [220, 38, 38];
          else if (texto === "Vence em breve") dado.cell.styles.textColor = [217, 119, 6];
        }
      },
    });
  }

  // ---- Rodapé com paginação ------------------------------------------------
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    const alturaPagina = doc.internal.pageSize.getHeight();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(dados.empresa, margem, alturaPagina - 8);
    doc.text(`Página ${i} de ${paginas}`, largura - margem, alturaPagina - 8, { align: "right" });
  }

  return doc;
}

/** Resumo em texto, usado na mensagem do WhatsApp. */
export function resumoTexto(dados: DadosRelatorio): string {
  const t = calcularTotais(dados.manutencoes);

  const linhas = [
    `*Relatório de Manutenções — ${dados.empresa}*`,
    `Período: ${dataBR(dados.periodoDe)} a ${dataBR(dados.periodoAte)}`,
    "",
    `• Manutenções realizadas: ${numero(t.quantidade)}`,
    `• Custo total: ${moeda(t.custoTotal)}`,
    `• Custo médio por serviço: ${moeda(t.ticketMedio)}`,
  ];

  if (t.porCategoria.length) {
    linhas.push("", "*Custos por categoria*");
    for (const c of t.porCategoria.slice(0, 8)) {
      linhas.push(`• ${c.nome}: ${moeda(c.valor)} (${c.quantidade}x)`);
    }
  }

  if (t.porAtivo.length) {
    linhas.push("", "*Maiores custos por ativo*");
    for (const a of t.porAtivo.slice(0, 5)) {
      linhas.push(`• ${a.nome}: ${moeda(a.valor)} (${a.quantidade}x)`);
    }
  }

  const atrasadas = dados.proximas.filter((p) => p.situacao === "atrasada");
  const emBreve = dados.proximas.filter((p) => p.situacao === "proxima");

  if (dados.proximas.length) {
    linhas.push("", "*Próximas manutenções*");
    if (atrasadas.length) linhas.push(`⚠️ ${atrasadas.length} atrasada(s)`);
    if (emBreve.length) linhas.push(`🔔 ${emBreve.length} vencendo em breve`);
    for (const p of dados.proximas.slice(0, 6)) {
      const quando =
        p.periodicidade_unidade === "horas"
          ? `${numero(p.proximo_horimetro)} h/km`
          : dataBR(p.proxima_data);
      linhas.push(`• ${p.ativo_nome} — ${p.tipo}: ${quando}`);
    }
  }

  return linhas.join("\n");
}

export function nomeArquivo(dados: DadosRelatorio) {
  const limpo = dados.empresa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `relatorio-manutencoes-${limpo || "empresa"}-${dados.periodoDe}-a-${dados.periodoAte}.pdf`;
}
