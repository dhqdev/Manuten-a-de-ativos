import { CircleDot, Database, PackageCheck, Recycle, TriangleAlert, Wallet } from "lucide-react";
import { DialogoPneu } from "@/components/estoque/dialogo-pneu";
import { ListaPneus, type PneuComVeiculo } from "@/components/estoque/lista-pneus";
import { Cabecalho, EstadoVazio, cn } from "@/components/ui";
import { SULCO_ALERTA_MM, moeda, numero } from "@/lib/format";
import { podeGerenciar, podeRegistrar } from "@/lib/permissoes";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Pneu } from "@/lib/types";

export const metadata = { title: "Estoque · Gestão de Manutenção" };

export default async function EstoquePage() {
  const { orgId, papel } = await getContexto();
  const gestor = podeGerenciar(papel);
  const supabase = await createClient();

  const [{ data: linhas, error }, { data: ativos }] = await Promise.all([
    supabase
      .from("pneus")
      .select("*, ativo:ativos(nome)")
      .eq("org_id", orgId)
      .order("numero_fogo"),
    supabase
      .from("ativos")
      .select("id, nome, identificacao, horimetro_atual")
      .eq("org_id", orgId)
      .neq("status", "baixado")
      .order("nome"),
  ]);

  // Tabela ainda não existe: a migração v2 não foi aplicada no Supabase.
  if (error && /pneus|does not exist|schema cache/i.test(error.message)) {
    return (
      <>
        <Cabecalho titulo="Estoque de pneus" />
        <EstadoVazio
          icone={<Database className="h-6 w-6" />}
          titulo="Falta preparar o banco"
          descricao="Rode o arquivo supabase/migracao-v2.sql no SQL Editor do Supabase para ativar o estoque."
        />
      </>
    );
  }

  const pneus: PneuComVeiculo[] = (linhas ?? []).map((l) => ({
    ...(l as Pneu),
    ativo_nome: (l.ativo as unknown as { nome?: string } | null)?.nome ?? null,
  }));

  const ativosPneu = (ativos ?? []).map((a) => ({ ...a, horimetro_atual: Number(a.horimetro_atual ?? 0) }));

  const emEstoque = pneus.filter((p) => p.status === "estoque");
  const emUso = pneus.filter((p) => p.status === "em_uso").length;
  const recapagem = pneus.filter((p) => p.status === "recapagem").length;
  const alerta = pneus.filter(
    (p) => p.status !== "descartado" && p.sulco_atual_mm !== null && Number(p.sulco_atual_mm) <= SULCO_ALERTA_MM,
  ).length;
  const valorEstoque = emEstoque.reduce((t, p) => t + Number(p.valor_compra ?? 0), 0);

  return (
    <>
      <Cabecalho
        titulo="Estoque de pneus"
        descricao="Cada pneu com número de fogo, medida, sulco e o caminho completo: estoque, veículo, recapagem e descarte."
        acoes={gestor ? <DialogoPneu /> : undefined}
      />

      {pneus.length === 0 ? (
        <EstadoVazio
          icone={<CircleDot className="h-6 w-6" />}
          titulo="Nenhum pneu cadastrado"
          descricao="Cadastre os pneus do estoque e dos veículos para acompanhar sulco, KM rodado, recapagens e custo."
          acao={gestor ? <DialogoPneu rotulo="Cadastrar primeiro pneu" /> : undefined}
        />
      ) : (
        <>
          <div className="lista-escalonada mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Indicador rotulo="Em estoque" valor={numero(emEstoque.length)} Icone={PackageCheck} cor="text-marca-600 bg-marca-50" />
            <Indicador rotulo="Em uso" valor={numero(emUso)} Icone={CircleDot} cor="text-emerald-600 bg-emerald-50" />
            <Indicador rotulo="Na recapagem" valor={numero(recapagem)} Icone={Recycle} cor="text-amber-600 bg-amber-50" />
            <Indicador
              rotulo={`Sulco ≤ ${SULCO_ALERTA_MM} mm`}
              valor={numero(alerta)}
              Icone={TriangleAlert}
              cor={alerta ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-100"}
            />
            <Indicador rotulo="Valor em estoque" valor={moeda(valorEstoque)} Icone={Wallet} cor="text-slate-700 bg-slate-100" />
          </div>

          <ListaPneus pneus={pneus} ativos={ativosPneu} gestor={gestor} registra={podeRegistrar(papel)} />
        </>
      )}
    </>
  );
}

function Indicador({
  rotulo,
  valor,
  Icone,
  cor,
}: {
  rotulo: string;
  valor: string;
  Icone: React.ComponentType<{ className?: string }>;
  cor: string;
}) {
  return (
    <div className="card cartao-vivo flex items-center gap-3 p-4">
      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", cor)}>
        <Icone className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
        <p className="mt-0.5 truncate text-lg font-semibold text-slate-900">{valor}</p>
      </div>
    </div>
  );
}
