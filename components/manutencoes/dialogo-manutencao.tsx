"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Paperclip, Pencil, Plus, X } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { registrarAnexo, salvarManutencao } from "@/lib/actions/manutencoes";
import { criarUploadAssinado } from "@/lib/actions/upload";
import { createClient } from "@/lib/supabase/client";
import { TIPOS_MANUTENCAO, hoje } from "@/lib/format";
import type { Manutencao, PlanoManutencao, TipoManutencao } from "@/lib/types";

type AtivoOpcao = { id: string; nome: string; identificacao: string | null };

/** Valor sentinela do select: cria a periódica junto com o registro. */
const NOVA_PERIODICA = "__nova__";

/** Deixa o nome do arquivo seguro para virar chave no storage. */
function nomeSeguro(nome: string) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-80);
}

export function DialogoManutencao({
  orgId,
  ativos,
  ativoPadrao,
  planos = [],
  planoPadrao,
  manutencao,
  rotulo = "Registrar manutenção",
  variante = "primario",
  tamanho = "md",
}: {
  orgId: string;
  ativos: AtivoOpcao[];
  ativoPadrao?: string;
  planos?: Pick<PlanoManutencao, "id" | "tipo" | "ativo_id">[];
  /** Já vem escolhida ao abrir pelo "Dar baixa" de uma periódica. */
  planoPadrao?: string;
  manutencao?: Manutencao;
  rotulo?: string;
  variante?: "primario" | "secundario";
  tamanho?: "sm" | "md";
}) {
  const router = useRouter();
  const editando = Boolean(manutencao);

  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [ativoId, setAtivoId] = useState(manutencao?.ativo_id ?? ativoPadrao ?? "");
  const [planoId, setPlanoId] = useState(manutencao?.plano_id ?? planoPadrao ?? "");
  const [enviando, iniciar] = useTransition();

  const planosDoAtivo = planos.filter((p) => p.ativo_id === ativoId);
  const criandoPeriodica = planoId === NOVA_PERIODICA;

  function fechar() {
    if (enviando) return;
    setAberto(false);
    setArquivos([]);
    setErro(null);
    setProgresso(null);
  }

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarManutencao(fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      // Anexos vão direto do navegador para o Storage do Supabase.
      if (arquivos.length && r.id) {
        const supabase = createClient();
        for (let i = 0; i < arquivos.length; i++) {
          const arquivo = arquivos[i];
          setProgresso(`Enviando anexo ${i + 1} de ${arquivos.length}...`);
          const caminho = `${orgId}/${r.id}/${crypto.randomUUID()}-${nomeSeguro(arquivo.name)}`;

          // A sessão é httpOnly, então aqui não há login: o servidor assina o
          // envio e o arquivo vai direto do navegador para o Storage.
          const assinado = await criarUploadAssinado(caminho);
          if (!assinado.ok) {
            setErro(`Manutenção salva, mas o anexo "${arquivo.name}" falhou: ${assinado.erro}`);
            setProgresso(null);
            router.refresh();
            return;
          }

          const { error } = await supabase.storage
            .from("manutencoes")
            .uploadToSignedUrl(assinado.caminho, assinado.token, arquivo);

          if (error) {
            setErro(`Manutenção salva, mas o anexo "${arquivo.name}" falhou: ${error.message}`);
            setProgresso(null);
            router.refresh();
            return;
          }

          await registrarAnexo({
            manutencaoId: r.id,
            nome: arquivo.name,
            path: caminho,
            tipoMime: arquivo.type || null,
            tamanho: arquivo.size,
          });
        }
      }

      setProgresso(null);
      setArquivos([]);
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <>
      {editando ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          title="Editar manutenção"
          aria-label="Editar manutenção"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <Botao variante={variante} tamanho={tamanho} onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" />
          {rotulo}
        </Botao>
      )}

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo={editando ? "Editar manutenção" : "Registrar manutenção"}
        descricao="Registre o serviço executado, custos e anexos."
        largura="max-w-3xl"
      >
        <form action={enviar}>
          <div className="space-y-4 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            {manutencao && <input type="hidden" name="id" value={manutencao.id} />}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Campo label="Ativo" obrigatorio className="lg:col-span-2">
                <select
                  name="ativo_id"
                  required
                  value={ativoId}
                  onChange={(e) => {
                    setAtivoId(e.target.value);
                    setPlanoId("");
                  }}
                  className="campo"
                >
                  <option value="" disabled>
                    Selecione o ativo...
                  </option>
                  {ativos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                      {a.identificacao ? ` — ${a.identificacao}` : ""}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Data da manutenção" obrigatorio>
                <input
                  name="data_manutencao"
                  type="date"
                  required
                  defaultValue={manutencao?.data_manutencao ?? hoje()}
                  className="campo"
                />
              </Campo>

              <Campo label="Tipo">
                <select
                  name="tipo"
                  defaultValue={manutencao?.tipo ?? (planoPadrao ? "preventiva" : "corretiva")}
                  className="campo"
                >
                  {(Object.keys(TIPOS_MANUTENCAO) as TipoManutencao[]).map((t) => (
                    <option key={t} value={t}>
                      {TIPOS_MANUTENCAO[t]}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo
                label="Manutenção periódica"
                hint="Ao vincular, a próxima data é recalculada automaticamente."
                className="lg:col-span-2"
              >
                <select
                  value={planoId}
                  onChange={(e) => setPlanoId(e.target.value)}
                  className="campo"
                >
                  <option value="">Nenhuma (manutenção avulsa)</option>
                  {planosDoAtivo.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.tipo}
                    </option>
                  ))}
                  <option value={NOVA_PERIODICA}>+ Criar nova periódica...</option>
                </select>
              </Campo>

              {criandoPeriodica ? (
                <input type="hidden" name="criar_plano" value="1" />
              ) : (
                <input type="hidden" name="plano_id" value={planoId} />
              )}

              {criandoPeriodica && (
                <>
                  <Campo
                    label="Nome da periódica"
                    obrigatorio
                    hint="Como ela aparece na lista de preventivas."
                    className="sm:col-span-2"
                  >
                    <input
                      name="plano_tipo"
                      required
                      placeholder="Ex.: Limpeza e lubrificação"
                      className="campo"
                    />
                  </Campo>

                  <Campo label="Repetir a cada" obrigatorio>
                    <div className="flex gap-2">
                      <input
                        name="plano_periodicidade_valor"
                        type="number"
                        min={1}
                        required
                        defaultValue={15}
                        className="campo w-24"
                      />
                      <select
                        name="plano_periodicidade_unidade"
                        defaultValue="dias"
                        className="campo flex-1"
                      >
                        <option value="dias">dia(s)</option>
                        <option value="meses">mês(es)</option>
                        <option value="horas">hora(s) de uso</option>
                      </select>
                    </div>
                  </Campo>
                </>
              )}

              <Campo label="Descrição do serviço realizado" obrigatorio className="sm:col-span-2 lg:col-span-3">
                <textarea
                  name="descricao"
                  required
                  rows={3}
                  defaultValue={manutencao?.descricao ?? ""}
                  placeholder="Ex.: Troca de óleo do motor, filtros de ar e combustível."
                  className="campo resize-y"
                />
              </Campo>

              <Campo label="Peças ou materiais utilizados" className="sm:col-span-2 lg:col-span-3">
                <textarea
                  name="pecas"
                  rows={2}
                  defaultValue={manutencao?.pecas ?? ""}
                  placeholder="Ex.: 40L óleo 15W40, 2 filtros de óleo, 1 filtro de ar"
                  className="campo resize-y"
                />
              </Campo>

              <Campo label="Valor gasto (R$)">
                <input
                  name="valor"
                  inputMode="decimal"
                  defaultValue={manutencao?.valor ?? ""}
                  placeholder="0,00"
                  className="campo"
                />
              </Campo>

              <Campo label="Responsável pela execução">
                <input
                  name="responsavel"
                  defaultValue={manutencao?.responsavel ?? ""}
                  placeholder="Ex.: Carlos Souza"
                  className="campo"
                />
              </Campo>

              <Campo label="Empresa / prestador">
                <input
                  name="empresa"
                  defaultValue={manutencao?.empresa ?? ""}
                  placeholder="Ex.: Oficina Diesel Center"
                  className="campo"
                />
              </Campo>

              <Campo label="Garantia do serviço (dias)" hint="0 = sem garantia.">
                <input
                  name="garantia_dias"
                  type="number"
                  min={0}
                  defaultValue={manutencao?.garantia_dias ?? 0}
                  className="campo"
                />
              </Campo>

              <Campo label="Horímetro / KM na data">
                <input
                  name="horimetro"
                  inputMode="decimal"
                  defaultValue={manutencao?.horimetro ?? ""}
                  placeholder="Ex.: 12500"
                  className="campo"
                />
              </Campo>

              <Campo label="Nota fiscal / OS">
                <input
                  name="nota_fiscal"
                  defaultValue={manutencao?.nota_fiscal ?? ""}
                  placeholder="Ex.: NF 12345"
                  className="campo"
                />
              </Campo>

              <Campo label="Observações" className="sm:col-span-2 lg:col-span-3">
                <textarea
                  name="observacoes"
                  rows={2}
                  defaultValue={manutencao?.observacoes ?? ""}
                  className="campo resize-y"
                />
              </Campo>
            </div>

            {/* Anexos */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="flex cursor-pointer items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200">
                  <Paperclip className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">
                    Fotos e anexos da manutenção
                  </span>
                  <span className="block text-xs text-slate-500">
                    Imagens, PDFs ou notas fiscais — até 25 MB por arquivo.
                  </span>
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    setArquivos((atual) => [...atual, ...Array.from(e.target.files ?? [])]);
                    e.target.value = "";
                  }}
                />
                <span className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700">
                  Escolher
                </span>
              </label>

              {arquivos.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {arquivos.map((a, i) => (
                    <li
                      key={`${a.name}-${i}`}
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200"
                    >
                      <span className="min-w-0 flex-1 truncate text-slate-700">{a.name}</span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {(a.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => setArquivos((atual) => atual.filter((_, j) => j !== i))}
                        className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        aria-label={`Remover ${a.name}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <RodapeModal>
            {progresso && (
              <span className="mr-auto self-center text-sm text-slate-500">{progresso}</span>
            )}
            <Botao type="button" variante="secundario" onClick={fechar} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={enviando}>
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {editando ? "Salvar alterações" : "Registrar manutenção"}
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </>
  );
}
