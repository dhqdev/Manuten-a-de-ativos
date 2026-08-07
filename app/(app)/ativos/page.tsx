import Link from "next/link";
import { ChevronRight, FolderOpen, Package } from "lucide-react";
import { DialogoCategoria } from "@/components/categorias/dialogo-categoria";
import { BotaoExcluir } from "@/components/confirmar";
import { Cabecalho, EstadoVazio } from "@/components/ui";
import { excluirCategoria } from "@/lib/actions/categorias";
import { IconeCategoria } from "@/lib/icones";
import { moeda } from "@/lib/format";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Categoria } from "@/lib/types";

export const metadata = { title: "Ativos · Gestão de Manutenção" };

export default async function AtivosPage() {
  const { orgId } = await getContexto();
  const supabase = await createClient();

  const [{ data: categorias }, { data: ativos }, { data: gastos }] = await Promise.all([
    supabase.from("categorias").select("*").eq("org_id", orgId).order("ordem").order("nome"),
    supabase.from("ativos").select("id, categoria_id, status").eq("org_id", orgId),
    supabase.from("vw_manutencoes_completo").select("categoria_id, valor").eq("org_id", orgId),
  ]);

  const porCategoria = new Map<string, number>();
  for (const a of ativos ?? []) {
    if (a.status === "baixado") continue;
    porCategoria.set(a.categoria_id, (porCategoria.get(a.categoria_id) ?? 0) + 1);
  }

  const custoCategoria = new Map<string, number>();
  for (const g of gastos ?? []) {
    custoCategoria.set(g.categoria_id, (custoCategoria.get(g.categoria_id) ?? 0) + Number(g.valor ?? 0));
  }

  const lista = (categorias ?? []) as Categoria[];

  return (
    <>
      <Cabecalho
        titulo="Ativos"
        descricao="Cada categoria é uma pasta com os ativos cadastrados dentro dela."
        acoes={<DialogoCategoria />}
      />

      {lista.length === 0 ? (
        <EstadoVazio
          icone={<FolderOpen className="h-6 w-6" />}
          titulo="Nenhuma categoria cadastrada"
          descricao="Crie categorias como Caminhões, Hidráulicos ou Empilhadeiras para organizar seus ativos."
          acao={<DialogoCategoria />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((c) => {
            const total = porCategoria.get(c.id) ?? 0;
            return (
              <div key={c.id} className="card group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: c.cor }} />

                <div className="flex items-start justify-between gap-3">
                  <Link href={`/ativos/categoria/${c.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                      style={{ backgroundColor: c.cor }}
                    >
                      <IconeCategoria nome={c.icone} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-slate-900">{c.nome}</h3>
                      <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">
                        {c.descricao || "Sem descrição"}
                      </p>
                    </div>
                  </Link>

                  <div className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 max-lg:opacity-100">
                    <DialogoCategoria categoria={c} />
                    <BotaoExcluir
                      compacto
                      acao={excluirCategoria.bind(null, c.id)}
                      titulo="Excluir categoria"
                      mensagem={`Tem certeza que deseja excluir a categoria "${c.nome}"? Esta ação não pode ser desfeita.`}
                    />
                  </div>
                </div>

                <Link
                  href={`/ativos/categoria/${c.id}`}
                  className="mt-5 flex items-end justify-between border-t border-slate-100 pt-4"
                >
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      <Package className="h-4 w-4 text-slate-400" />
                      {total} {total === 1 ? "ativo" : "ativos"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {moeda(custoCategoria.get(c.id) ?? 0)} em manutenções
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-marca-600">
                    Abrir <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
