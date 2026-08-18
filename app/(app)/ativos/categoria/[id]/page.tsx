import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package } from "lucide-react";
import { DialogoAtivo } from "@/components/ativos/dialogo-ativo";
import { ListaAtivos, type AtivoResumo } from "@/components/ativos/lista-ativos";
import { Cabecalho, EstadoVazio } from "@/components/ui";
import { urlsDasFotos } from "@/lib/fotos";
import { IconeCategoria } from "@/lib/icones";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Ativo, Categoria } from "@/lib/types";

export default async function CategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getContexto();
  const supabase = await createClient();

  const { data: categoria } = await supabase
    .from("categorias")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!categoria) notFound();

  const [{ data: ativos }, { data: categorias }] = await Promise.all([
    supabase.from("ativos").select("*").eq("categoria_id", id).order("nome"),
    supabase.from("categorias").select("id, nome").eq("org_id", orgId).order("ordem").order("nome"),
  ]);

  const ids = (ativos ?? []).map((a) => a.id);

  const [{ data: manutencoes }, { data: planos }] = await Promise.all([
    ids.length
      ? supabase.from("manutencoes").select("ativo_id, valor, data_manutencao").in("ativo_id", ids)
      : Promise.resolve({ data: [] as { ativo_id: string; valor: number; data_manutencao: string }[] }),
    ids.length
      ? supabase.from("vw_planos_status").select("ativo_id, situacao").in("ativo_id", ids)
      : Promise.resolve({ data: [] as { ativo_id: string; situacao: string }[] }),
  ]);

  const resumo = new Map<string, { total: number; custo: number; ultima: string | null }>();
  for (const m of manutencoes ?? []) {
    const r = resumo.get(m.ativo_id) ?? { total: 0, custo: 0, ultima: null };
    r.total += 1;
    r.custo += Number(m.valor ?? 0);
    if (!r.ultima || m.data_manutencao > r.ultima) r.ultima = m.data_manutencao;
    resumo.set(m.ativo_id, r);
  }

  const alertas = new Map<string, number>();
  for (const p of planos ?? []) {
    if (p.situacao === "proxima" || p.situacao === "atrasada") {
      alertas.set(p.ativo_id, (alertas.get(p.ativo_id) ?? 0) + 1);
    }
  }

  const fotos = await urlsDasFotos((ativos ?? []).map((a) => a.foto_url));

  const lista: AtivoResumo[] = ((ativos ?? []) as Ativo[]).map((a) => {
    const r = resumo.get(a.id);
    return {
      ...a,
      total_manutencoes: r?.total ?? 0,
      custo_total: r?.custo ?? 0,
      ultima_manutencao: r?.ultima ?? null,
      alertas: alertas.get(a.id) ?? 0,
      foto_assinada: a.foto_url ? (fotos.get(a.foto_url) ?? null) : null,
    };
  });

  const cat = categoria as Categoria;

  return (
    <>
      <Link
        href="/ativos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Todas as categorias
      </Link>

      <Cabecalho
        titulo={cat.nome}
        descricao={cat.descricao ?? `${lista.length} ativo(s) nesta categoria`}
        acoes={<DialogoAtivo categorias={categorias ?? []} categoriaPadrao={cat.id} />}
      />

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: cat.cor }}
        >
          <IconeCategoria nome={cat.icone} className="h-5 w-5" />
        </span>
        <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Ativos</p>
            <p className="text-lg font-semibold text-slate-900">{lista.length}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Manutenções</p>
            <p className="text-lg font-semibold text-slate-900">
              {lista.reduce((s, a) => s + a.total_manutencoes, 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Alertas abertos</p>
            <p className="text-lg font-semibold text-slate-900">
              {lista.reduce((s, a) => s + a.alertas, 0)}
            </p>
          </div>
        </div>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          icone={<Package className="h-6 w-6" />}
          titulo="Nenhum ativo nesta categoria"
          descricao="Cadastre o primeiro equipamento para começar a registrar manutenções."
          acao={<DialogoAtivo categorias={categorias ?? []} categoriaPadrao={cat.id} />}
        />
      ) : (
        <ListaAtivos ativos={lista} />
      )}
    </>
  );
}
