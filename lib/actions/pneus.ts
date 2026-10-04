"use server";

import { revalidatePath } from "next/cache";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  data,
  erroBanco,
  inteiro,
  mensagemErro,
  numero,
  texto,
  textoObrigatorio,
  type Resultado,
} from "@/lib/form";
import { hoje } from "@/lib/format";
import { SEM_PERMISSAO } from "@/lib/permissoes";
import type { CondicaoPneu, MovimentacaoPneu, TipoMovPneu } from "@/lib/types";

const CONDICOES: CondicaoPneu[] = ["novo", "recapado", "usado"];
const TIPOS_MOV: TipoMovPneu[] = ["instalacao", "remocao", "recapagem", "retorno", "inspecao", "descarte"];

function revalidar() {
  revalidatePath("/estoque");
  revalidatePath("/ativos", "layout");
}

/** Cadastra ou edita um pneu. Cadastro novo já registra a entrada no estoque. */
export async function salvarPneu(fd: FormData): Promise<Resultado> {
  try {
    const { orgId, userId } = await getContexto();
    const supabase = await createClient();

    const id = texto(fd, "id");
    const condicao = texto(fd, "condicao") as CondicaoPneu | null;
    const sulcoInicial = numero(fd, "sulco_inicial_mm");

    const dados = {
      org_id: orgId,
      numero_fogo: textoObrigatorio(fd, "numero_fogo", "o número de fogo").toUpperCase(),
      marca: textoObrigatorio(fd, "marca", "a marca"),
      modelo: texto(fd, "modelo"),
      medida: textoObrigatorio(fd, "medida", "a medida"),
      dot: texto(fd, "dot"),
      condicao: condicao && CONDICOES.includes(condicao) ? condicao : "novo",
      sulco_inicial_mm: sulcoInicial,
      pressao_psi: numero(fd, "pressao_psi"),
      recapagens: Math.max(inteiro(fd, "recapagens", 0) ?? 0, 0),
      data_compra: data(fd, "data_compra"),
      valor_compra: numero(fd, "valor_compra"),
      fornecedor: texto(fd, "fornecedor"),
      nota_fiscal: texto(fd, "nota_fiscal"),
      localizacao: texto(fd, "localizacao"),
      observacoes: texto(fd, "observacoes"),
    };

    if (id) {
      const { error } = await supabase
        .from("pneus")
        .update(dados)
        .eq("id", id)
        .eq("org_id", orgId)
        .select("id")
        .single();
      if (error) return erroBanco(error);
      revalidar();
      return { ok: true, id };
    }

    const { data: novo, error } = await supabase
      .from("pneus")
      .insert({ ...dados, sulco_atual_mm: sulcoInicial })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, erro: "Já existe um pneu com esse número de fogo." };
      }
      return erroBanco(error);
    }

    await supabase.from("pneu_movimentacoes").insert({
      org_id: orgId,
      pneu_id: novo.id,
      tipo: "entrada",
      data: dados.data_compra ?? hoje(),
      sulco_mm: sulcoInicial,
      valor: dados.valor_compra,
      observacoes: dados.fornecedor ? `Fornecedor: ${dados.fornecedor}` : null,
      created_by: userId,
    });

    revalidar();
    return { ok: true, id: novo.id };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

export async function excluirPneu(id: string): Promise<Resultado> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { data: apagados, error } = await supabase
      .from("pneus")
      .delete()
      .eq("id", id)
      .eq("org_id", orgId)
      .select("id");

    if (error) return erroBanco(error);
    if (!apagados?.length) return { ok: false, erro: SEM_PERMISSAO };

    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/**
 * Registra montagem, remoção, recapagem, inspeção ou descarte. As regras (não
 * montar pneu já montado, posição ocupada, KM rodado) ficam no trigger
 * aplicar_movimentacao_pneu do banco — valem para qualquer caminho de escrita.
 */
export async function movimentarPneu(fd: FormData): Promise<Resultado> {
  try {
    const { orgId, userId } = await getContexto();
    const supabase = await createClient();

    const tipo = texto(fd, "tipo") as TipoMovPneu | null;
    if (!tipo || !TIPOS_MOV.includes(tipo)) return { ok: false, erro: "Escolha o tipo de movimentação." };

    const ativoId = texto(fd, "ativo_id");
    const horimetro = numero(fd, "horimetro");

    const { error } = await supabase.from("pneu_movimentacoes").insert({
      org_id: orgId,
      pneu_id: textoObrigatorio(fd, "pneu_id", "o pneu"),
      tipo,
      data: data(fd, "data") ?? hoje(),
      ativo_id: ativoId,
      posicao: texto(fd, "posicao"),
      horimetro,
      sulco_mm: numero(fd, "sulco_mm"),
      valor: numero(fd, "valor"),
      observacoes: texto(fd, "observacoes"),
      created_by: userId,
    });

    if (error) return erroBanco(error);

    // Montagem/remoção informam o KM do veículo: aproveita para atualizar o
    // horímetro do ativo (o banco só aceita se a pessoa puder editar ativos).
    if (ativoId && horimetro !== null) {
      const { data: ativo } = await supabase
        .from("ativos")
        .select("horimetro_atual")
        .eq("id", ativoId)
        .eq("org_id", orgId)
        .maybeSingle();
      if (ativo && Number(ativo.horimetro_atual) < horimetro) {
        await supabase.from("ativos").update({ horimetro_atual: horimetro }).eq("id", ativoId);
      }
    }

    revalidar();
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}

/** Histórico de um pneu, do mais recente para o mais antigo. */
export async function historicoDoPneu(
  pneuId: string,
): Promise<{ ok: true; itens: (MovimentacaoPneu & { ativo_nome: string | null })[] } | { ok: false; erro: string }> {
  try {
    const { orgId } = await getContexto();
    const supabase = await createClient();

    const { data: itens, error } = await supabase
      .from("pneu_movimentacoes")
      .select("*, ativo:ativos(nome)")
      .eq("pneu_id", pneuId)
      .eq("org_id", orgId)
      .order("data", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) return erroBanco(error);

    return {
      ok: true,
      itens: (itens ?? []).map((i) => ({
        ...(i as MovimentacaoPneu),
        ativo_nome: (i.ativo as unknown as { nome?: string } | null)?.nome ?? null,
      })),
    };
  } catch (e) {
    return { ok: false, erro: mensagemErro(e) };
  }
}
