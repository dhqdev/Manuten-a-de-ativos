"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { salvarAtivo } from "@/lib/actions/ativos";
import { STATUS_ATIVO, hoje } from "@/lib/format";
import type { Ativo, Categoria, StatusAtivo } from "@/lib/types";

export function DialogoAtivo({
  categorias,
  categoriaPadrao,
  ativo,
  rotulo = "Novo ativo",
  variante = "primario",
}: {
  categorias: Pick<Categoria, "id" | "nome">[];
  categoriaPadrao?: string;
  ativo?: Ativo;
  rotulo?: string;
  variante?: "primario" | "secundario";
}) {
  const router = useRouter();
  const editando = Boolean(ativo);

  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarAtivo(fd);
      if (!r.ok) setErro(r.erro);
      else {
        setAberto(false);
        router.refresh();
      }
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
        aoFechar={() => !enviando && setAberto(false)}
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
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)} disabled={enviando}>
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
