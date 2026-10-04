import { CalendarClock, ClipboardList, Package, TriangleAlert } from "lucide-react";
import { Abas } from "@/components/abas";
import { LimparHistorico } from "@/components/manutencoes/limpar-historico";
import { DialogoManutencao } from "@/components/manutencoes/dialogo-manutencao";
import { ListaManutencoes, type AnexoComUrl, type ItemManutencao } from "@/components/manutencoes/lista-manutencoes";
import { DialogoPlano } from "@/components/planos/dialogo-plano";
import { ListaPlanos } from "@/components/planos/lista-planos";
import { BotaoLink, Cabecalho, EstadoVazio } from "@/components/ui";
import { podeGerenciar, podeRegistrar } from "@/lib/permissoes";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { PlanoStatus, SituacaoPlano } from "@/lib/types";

export const metadata = { title: "Manutenções · Gestão de Manutenção" };

export default async function ManutencoesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro } = await searchParams;
  const { orgId, papel } = await getContexto();
  const gestor = podeGerenciar(papel);
  const registra = podeRegistrar(papel);
  const supabase = await createClient();

  const [{ data: planos }, { data: historico }, { data: ativos }] = await Promise.all([
    supabase.from("vw_planos_status").select("*").eq("org_id", orgId),
    supabase
      .from("vw_manutencoes_completo")
      .select("*")
      .eq("org_id", orgId)
      .order("data_manutencao", { ascending: false })
      .limit(300),
    supabase.from("ativos").select("id, nome, identificacao").eq("org_id", orgId).order("nome"),
  ]);

  const listaPlanos = (planos ?? []) as PlanoStatus[];
  const lista = (historico ?? []) as ItemManutencao[];
  const opcoesAtivos = ativos ?? [];
  const opcoesPlanos = listaPlanos.map((p) => ({ id: p.id, tipo: p.tipo, ativo_id: p.ativo_id }));

  // Anexos das manutenções carregadas
  let anexos: AnexoComUrl[] = [];
  if (lista.length) {
    const { data: linhas } = await supabase
      .from("manutencao_anexos")
      .select("id, manutencao_id, nome, path, tipo_mime")
      .in("manutencao_id", lista.map((m) => m.id));

    if (linhas?.length) {
      const { data: urls } = await supabase.storage
        .from("manutencoes")
        .createSignedUrls(linhas.map((l) => l.path), 3600);

      anexos = linhas.map((l, i) => ({
        id: l.id,
        manutencao_id: l.manutencao_id,
        nome: l.nome,
        tipo_mime: l.tipo_mime,
        url: urls?.[i]?.signedUrl ?? null,
      }));
    }
  }

  const contar = (s: SituacaoPlano) => listaPlanos.filter((p) => p.situacao === s).length;
  const atrasadas = contar("atrasada");
  const proximas = contar("proxima");

  if (opcoesAtivos.length === 0) {
    return (
      <>
        <Cabecalho titulo="Manutenções" descricao="Preventivas programadas e histórico de serviços." />
        <EstadoVazio
          icone={<Package className="h-6 w-6" />}
          titulo="Cadastre um ativo primeiro"
          descricao="As manutenções são sempre vinculadas a um ativo. Crie uma categoria e cadastre seus equipamentos."
          acao={<BotaoLink href="/ativos">Ir para Ativos</BotaoLink>}
        />
      </>
    );
  }

  return (
    <>
      <Cabecalho
        titulo="Manutenções"
        descricao="Preventivas programadas, alertas de vencimento e histórico de serviços."
        acoes={
          <>
            {gestor && lista.length > 0 && <LimparHistorico ativos={opcoesAtivos} />}
            {gestor && <DialogoPlano ativos={opcoesAtivos} variante="secundario" />}
            {registra && (
              <DialogoManutencao orgId={orgId} ativos={opcoesAtivos} planos={opcoesPlanos} />
            )}
          </>
        }
      />

      {(atrasadas > 0 || proximas > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {atrasadas > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <TriangleAlert className="h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-800">
                <strong>{atrasadas}</strong> manutenç{atrasadas === 1 ? "ão está atrasada" : "ões estão atrasadas"}.
              </p>
            </div>
          )}
          {proximas > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <CalendarClock className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                <strong>{proximas}</strong> manutenç{proximas === 1 ? "ão vence" : "ões vencem"} em breve.
              </p>
            </div>
          )}
        </div>
      )}

      <Abas
        abas={[
          {
            id: "preventivas",
            rotulo: "Periódicas / preventivas",
            contador: listaPlanos.length,
            conteudo:
              listaPlanos.length === 0 ? (
                <EstadoVazio
                  icone={<CalendarClock className="h-6 w-6" />}
                  titulo="Nenhuma manutenção periódica cadastrada"
                  descricao="Programe manutenções por dias, meses ou horas de uso e receba alertas antes do vencimento."
                  acao={gestor ? <DialogoPlano ativos={opcoesAtivos} /> : undefined}
                />
              ) : (
                <ListaPlanos
                  planos={listaPlanos}
                  orgId={orgId}
                  ativos={opcoesAtivos}
                  mostrarAtivo
                  filtroInicial={filtro === "alertas" ? "alertas" : "todos"}
                />
              ),
          },
          {
            id: "historico",
            rotulo: "Histórico realizado",
            contador: lista.length,
            conteudo:
              lista.length === 0 ? (
                <EstadoVazio
                  icone={<ClipboardList className="h-6 w-6" />}
                  titulo="Nenhuma manutenção registrada"
                  descricao="Registre os serviços executados para acompanhar custos e histórico."
                  acao={
                    registra ? (
                      <DialogoManutencao orgId={orgId} ativos={opcoesAtivos} planos={opcoesPlanos} />
                    ) : undefined
                  }
                />
              ) : (
                <ListaManutencoes
                  manutencoes={lista}
                  anexos={anexos}
                  orgId={orgId}
                  ativos={opcoesAtivos}
                  planos={opcoesPlanos}
                  mostrarAtivo
                />
              ),
          },
        ]}
        inicial={filtro === "historico" ? 1 : 0}
      />
    </>
  );
}
