import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ClipboardList, Repeat, TrendingUp, Wallet } from "lucide-react";
import { Abas } from "@/components/abas";
import { DialogoAtivo } from "@/components/ativos/dialogo-ativo";
import { BotaoExcluir } from "@/components/confirmar";
import { DialogoManutencao } from "@/components/manutencoes/dialogo-manutencao";
import { ListaManutencoes, type AnexoComUrl } from "@/components/manutencoes/lista-manutencoes";
import { DialogoPlano } from "@/components/planos/dialogo-plano";
import { ListaPlanos } from "@/components/planos/lista-planos";
import { Badge, Cabecalho, EstadoVazio } from "@/components/ui";
import { excluirAtivo } from "@/lib/actions/ativos";
import { urlsDasFotos } from "@/lib/fotos";
import { IconeCategoria } from "@/lib/icones";
import { STATUS_ATIVO, dataBR, moeda, numero } from "@/lib/format";
import { podeGerenciar, podeRegistrar } from "@/lib/permissoes";
import { getContexto } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { Ativo, Categoria, Manutencao, PlanoStatus } from "@/lib/types";

export default async function AtivoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId, papel } = await getContexto();
  const gestor = podeGerenciar(papel);
  const registra = podeRegistrar(papel);
  const supabase = await createClient();

  const { data: ativo } = await supabase
    .from("ativos")
    .select("*, categoria:categorias(*)")
    .eq("id", id)
    .eq("org_id", orgId)
    .maybeSingle();

  if (!ativo) notFound();

  const [{ data: manutencoes }, { data: planos }, { data: categorias }, { data: ativosOrg }] =
    await Promise.all([
      supabase
        .from("manutencoes")
        .select("*")
        .eq("ativo_id", id)
        .order("data_manutencao", { ascending: false }),
      supabase.from("vw_planos_status").select("*").eq("ativo_id", id),
      supabase.from("categorias").select("id, nome").eq("org_id", orgId).order("ordem").order("nome"),
      supabase.from("ativos").select("id, nome, identificacao").eq("org_id", orgId).order("nome"),
    ]);

  const historico = (manutencoes ?? []) as Manutencao[];
  const idsManutencao = historico.map((m) => m.id);

  // Anexos + links temporários para visualização.
  let anexos: AnexoComUrl[] = [];
  if (idsManutencao.length) {
    const { data: linhas } = await supabase
      .from("manutencao_anexos")
      .select("id, manutencao_id, nome, path, tipo_mime")
      .in("manutencao_id", idsManutencao)
      .order("created_at");

    if (linhas?.length) {
      const { data: urls } = await supabase.storage
        .from("manutencoes")
        .createSignedUrls(
          linhas.map((l) => l.path),
          3600,
        );

      anexos = linhas.map((l, i) => ({
        id: l.id,
        manutencao_id: l.manutencao_id,
        nome: l.nome,
        tipo_mime: l.tipo_mime,
        url: urls?.[i]?.signedUrl ?? null,
      }));
    }
  }

  const item = ativo as Ativo & { categoria: Categoria };
  const fotoUrl = item.foto_url
    ? ((await urlsDasFotos([item.foto_url])).get(item.foto_url) ?? null)
    : null;
  const listaPlanos = (planos ?? []) as PlanoStatus[];
  const opcoesAtivos = ativosOrg ?? [];
  const opcoesPlanos = listaPlanos.map((p) => ({ id: p.id, tipo: p.tipo, ativo_id: p.ativo_id }));

  const custoTotal = historico.reduce((s, m) => s + Number(m.valor ?? 0), 0);
  const alertas = listaPlanos.filter(
    (p) => p.situacao === "atrasada" || p.situacao === "proxima",
  ).length;
  const ultima = historico[0]?.data_manutencao ?? null;

  return (
    <>
      <Link
        href={`/ativos/categoria/${item.categoria_id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        {item.categoria?.nome ?? "Voltar"}
      </Link>

      <Cabecalho
        titulo={item.nome}
        descricao={[item.marca, item.modelo, item.identificacao].filter(Boolean).join(" · ")}
        acoes={
          <>
            {gestor && <DialogoAtivo categorias={categorias ?? []} ativo={item} fotoAtual={fotoUrl} />}
            {gestor && (
              <BotaoExcluir
                acao={excluirAtivo.bind(null, item.id)}
                titulo="Excluir ativo"
                mensagem={`Excluir "${item.nome}" apaga também todo o histórico de manutenções, planos preventivos, fotos e anexos dele.`}
              />
            )}
            {registra && (
              <DialogoManutencao
                orgId={orgId}
                ativos={opcoesAtivos}
                ativoPadrao={item.id}
                planos={opcoesPlanos}
              />
            )}
          </>
        }
      />

      {/* Indicadores do ativo */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador
          icone={<ClipboardList className="h-4 w-4" />}
          rotulo="Manutenções"
          valor={String(historico.length)}
          detalhe={ultima ? `Última em ${dataBR(ultima)}` : "Nenhuma registrada"}
        />
        <Indicador
          icone={<Wallet className="h-4 w-4" />}
          rotulo="Custo acumulado"
          valor={moeda(custoTotal)}
          detalhe={
            historico.length ? `Média de ${moeda(custoTotal / historico.length)} por serviço` : "—"
          }
        />
        <Indicador
          icone={<Repeat className="h-4 w-4" />}
          rotulo="Preventivas"
          valor={String(listaPlanos.length)}
          detalhe={alertas > 0 ? `${alertas} exigindo atenção` : "Tudo em dia"}
          alerta={alertas > 0}
        />
        <Indicador
          icone={<TrendingUp className="h-4 w-4" />}
          rotulo="Horímetro / KM"
          valor={numero(item.horimetro_atual)}
          detalhe={`Cadastrado em ${dataBR(item.data_cadastro)}`}
        />
      </div>

      <Abas
        abas={[
          {
            id: "historico",
            rotulo: "Histórico de manutenção",
            contador: historico.length,
            conteudo:
              historico.length === 0 ? (
                <EstadoVazio
                  icone={<ClipboardList className="h-6 w-6" />}
                  titulo="Nenhuma manutenção registrada"
                  descricao="Registre o primeiro serviço para começar o histórico deste ativo."
                  acao={
                    registra && (
                    <DialogoManutencao
                      orgId={orgId}
                      ativos={opcoesAtivos}
                      ativoPadrao={item.id}
                      planos={opcoesPlanos}
                    />
                    )
                  }
                />
              ) : (
                <ListaManutencoes
                  manutencoes={historico}
                  anexos={anexos}
                  orgId={orgId}
                  ativos={opcoesAtivos}
                  planos={opcoesPlanos}
                />
              ),
          },
          {
            id: "preventivas",
            rotulo: "Manutenções periódicas",
            contador: listaPlanos.length,
            conteudo: (
              <div className="space-y-4">
                {gestor && (
                  <div className="flex justify-end">
                    <DialogoPlano ativos={opcoesAtivos} ativoPadrao={item.id} />
                  </div>
                )}
                {listaPlanos.length === 0 ? (
                  <EstadoVazio
                    icone={<CalendarDays className="h-6 w-6" />}
                    titulo="Nenhuma manutenção periódica"
                    descricao="Cadastre planos preventivos por dias, meses ou horas de uso para receber alertas automáticos."
                    acao={gestor ? <DialogoPlano ativos={opcoesAtivos} ativoPadrao={item.id} /> : undefined}
                  />
                ) : (
                  <ListaPlanos
                    planos={listaPlanos}
                    orgId={orgId}
                    ativos={opcoesAtivos}
                    comFiltros={false}
                  />
                )}
              </div>
            ),
          },
          {
            id: "dados",
            rotulo: "Dados do ativo",
            conteudo: (
              <div className="card p-5">
                <div className="mb-5 flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: item.categoria?.cor ?? "#2563eb" }}
                  >
                    <IconeCategoria nome={item.categoria?.icone} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">{item.categoria?.nome}</p>
                    <Badge className={STATUS_ATIVO[item.status].classe}>
                      {STATUS_ATIVO[item.status].label}
                    </Badge>
                  </div>
                </div>

                {fotoUrl && (
                  <div className="mb-5 overflow-hidden rounded-xl ring-1 ring-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoUrl}
                      alt={`Foto de ${item.nome}`}
                      className="max-h-80 w-full bg-slate-50 object-contain"
                    />
                  </div>
                )}

                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Dado rotulo="Nome do ativo" valor={item.nome} />
                  <Dado rotulo="Marca" valor={item.marca} />
                  <Dado rotulo="Modelo" valor={item.modelo} />
                  <Dado rotulo="Nº de identificação / placa" valor={item.identificacao} />
                  <Dado rotulo="Ano" valor={item.ano ? String(item.ano) : null} />
                  <Dado rotulo="Data de cadastro" valor={dataBR(item.data_cadastro)} />
                  <Dado rotulo="Horímetro / KM atual" valor={numero(item.horimetro_atual)} />
                  <Dado rotulo="Observações" valor={item.observacoes} className="sm:col-span-2" />
                </dl>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}

function Indicador({
  icone,
  rotulo,
  valor,
  detalhe,
  alerta,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  detalhe?: string;
  alerta?: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-slate-500">
        <span className={alerta ? "text-amber-600" : "text-slate-400"}>{icone}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{rotulo}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{valor}</p>
      {detalhe && (
        <p className={`mt-0.5 text-xs ${alerta ? "text-amber-600" : "text-slate-500"}`}>{detalhe}</p>
      )}
    </div>
  );
}

function Dado({
  rotulo,
  valor,
  className,
}: {
  rotulo: string;
  valor: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm text-slate-800">{valor || "—"}</dd>
    </div>
  );
}
