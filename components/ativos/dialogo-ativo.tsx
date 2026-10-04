"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { definirFotoAtivo, prepararFotoAtivo, salvarAtivo } from "@/lib/actions/ativos";
import { createClient } from "@/lib/supabase/client";
import { STATUS_ATIVO, hoje } from "@/lib/format";
import type { Ativo, Categoria, StatusAtivo } from "@/lib/types";

/** Acima disto o envio fica lento no celular e o bucket recusa a partir de 25 MB. */
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

export function DialogoAtivo({
  categorias,
  categoriaPadrao,
  ativo,
  fotoAtual,
  rotulo = "Novo ativo",
  variante = "primario",
}: {
  categorias: Pick<Categoria, "id" | "nome">[];
  categoriaPadrao?: string;
  ativo?: Ativo;
  /** Link temporário da foto já salva, para mostrar na edição. */
  fotoAtual?: string | null;
  rotulo?: string;
  variante?: "primario" | "secundario";
}) {
  const router = useRouter();
  const editando = Boolean(ativo);

  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [removerFoto, setRemoverFoto] = useState(false);
  const [enviando, iniciar] = useTransition();

  // Mostra a foto nova escolhida; senão a que já está salva (a não ser que o
  // usuário tenha pedido para remover).
  const imagem = previa ?? (removerFoto ? null : (fotoAtual ?? null));

  function fechar() {
    if (enviando) return;
    setAberto(false);
    limparFoto();
    setErro(null);
    setProgresso(null);
  }

  function limparFoto() {
    if (previa) URL.revokeObjectURL(previa);
    setFoto(null);
    setPrevia(null);
    setRemoverFoto(false);
  }

  function escolherFoto(arquivo: File | undefined) {
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO) {
      setErro("A foto passa de 10 MB. Escolha uma imagem menor.");
      return;
    }

    setErro(null);
    if (previa) URL.revokeObjectURL(previa);
    setFoto(arquivo);
    setPrevia(URL.createObjectURL(arquivo));
    setRemoverFoto(false);
  }

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarAtivo(fd);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }

      // A foto vai depois: num cadastro novo o id do ativo só existe agora.
      if (foto && r.id) {
        setProgresso("Enviando a foto...");

        const assinado = await prepararFotoAtivo(r.id, foto.name);
        if (!assinado.ok) {
          setErro(`Ativo salvo, mas a foto falhou: ${assinado.erro}`);
          setProgresso(null);
          router.refresh();
          return;
        }

        const supabase = createClient();
        const { error } = await supabase.storage
          .from("manutencoes")
          .uploadToSignedUrl(assinado.caminho, assinado.token, foto);

        if (error) {
          setErro(`Ativo salvo, mas a foto falhou: ${error.message}`);
          setProgresso(null);
          router.refresh();
          return;
        }

        const gravou = await definirFotoAtivo(r.id, assinado.caminho);
        if (!gravou.ok) {
          setErro(`Ativo salvo, mas a foto falhou: ${gravou.erro}`);
          setProgresso(null);
          router.refresh();
          return;
        }
      }

      setProgresso(null);
      limparFoto();
      setAberto(false);
      router.refresh();
    });
  }

  return (
    <>
      {editando ? (
        <Botao variante="secundario" tamanho="sm" onClick={() => setAberto(true)}>
          <Pencil className="h-4 w-4" />
          Editar
        </Botao>
      ) : (
        <Botao variante={variante} onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" />
          {rotulo}
        </Botao>
      )}

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo={editando ? "Editar ativo" : "Cadastrar ativo"}
        descricao="Dados de identificação do equipamento."
      >
        <form action={enviar}>
          <div className="space-y-4 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            {ativo && <input type="hidden" name="id" value={ativo.id} />}
            {removerFoto && <input type="hidden" name="remover_foto" value="1" />}

            {/* Foto do ativo */}
            <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-superficie ring-1 ring-slate-200">
                {imagem ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagem} alt="Foto do ativo" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-6 w-6 text-slate-400" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800">Foto do ativo</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  JPG, PNG, WEBP ou HEIC — até 10 MB.
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-slate-300 bg-superficie px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                    {imagem ? "Trocar foto" : "Escolher foto"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        escolherFoto(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {imagem && (
                    <button
                      type="button"
                      onClick={() => {
                        if (previa) URL.revokeObjectURL(previa);
                        setFoto(null);
                        setPrevia(null);
                        setRemoverFoto(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Nome do ativo" obrigatorio className="sm:col-span-2">
                <input
                  name="nome"
                  required
                  defaultValue={ativo?.nome ?? ""}
                  placeholder="Ex.: Caminhão Volvo FH 540"
                  className="campo"
                  autoFocus
                />
              </Campo>

              <Campo label="Categoria" obrigatorio>
                <select
                  name="categoria_id"
                  required
                  defaultValue={ativo?.categoria_id ?? categoriaPadrao ?? ""}
                  className="campo"
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Situação">
                <select name="status" defaultValue={ativo?.status ?? "ativo"} className="campo">
                  {(Object.keys(STATUS_ATIVO) as StatusAtivo[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_ATIVO[s].label}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Marca">
                <input name="marca" defaultValue={ativo?.marca ?? ""} placeholder="Ex.: Volvo" className="campo" />
              </Campo>

              <Campo label="Modelo">
                <input name="modelo" defaultValue={ativo?.modelo ?? ""} placeholder="Ex.: FH 540 6x4" className="campo" />
              </Campo>

              <Campo label="Nº de identificação / placa" hint="Placa, patrimônio ou número de série.">
                <input
                  name="identificacao"
                  defaultValue={ativo?.identificacao ?? ""}
                  placeholder="Ex.: ABC-1D23"
                  className="campo"
                />
              </Campo>

              <Campo label="Ano">
                <input
                  name="ano"
                  type="number"
                  min={1900}
                  max={2100}
                  defaultValue={ativo?.ano ?? ""}
                  placeholder="Ex.: 2021"
                  className="campo"
                />
              </Campo>

              <Campo label="Data de cadastro">
                <input
                  name="data_cadastro"
                  type="date"
                  defaultValue={ativo?.data_cadastro ?? hoje()}
                  className="campo"
                />
              </Campo>

              <Campo label="Horímetro / KM atual" hint="Usado nos planos por horas de uso.">
                <input
                  name="horimetro_atual"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={ativo?.horimetro_atual ?? 0}
                  className="campo"
                />
              </Campo>

              <Campo label="Observações" className="sm:col-span-2">
                <textarea
                  name="observacoes"
                  rows={3}
                  defaultValue={ativo?.observacoes ?? ""}
                  placeholder="Informações adicionais sobre o ativo"
                  className="campo resize-y"
                />
              </Campo>
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
              {editando ? "Salvar alterações" : "Cadastrar ativo"}
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </>
  );
}
