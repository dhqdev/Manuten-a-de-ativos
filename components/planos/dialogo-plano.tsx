"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { salvarPlano } from "@/lib/actions/planos";
import { UNIDADES, hoje } from "@/lib/format";
import type { PlanoManutencao, UnidadePeriodicidade } from "@/lib/types";

const SUGESTOES = [
  "Troca de óleo e filtros",
  "Revisão preventiva geral",
  "Inspeção dos freios",
  "Lubrificação",
  "Troca de correias",
  "Recarga de bateria",
  "Verificação hidráulica",
  "Calibragem / alinhamento",
];

export function DialogoPlano({
  ativos,
  ativoPadrao,
  plano,
  rotulo = "Nova preventiva",
  variante = "primario",
  tamanho = "md",
}: {
  ativos: { id: string; nome: string; identificacao: string | null }[];
  ativoPadrao?: string;
  plano?: PlanoManutencao;
  rotulo?: string;
  variante?: "primario" | "secundario";
  tamanho?: "sm" | "md";
}) {
  const router = useRouter();
  const editando = Boolean(plano);

  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [unidade, setUnidade] = useState<UnidadePeriodicidade>(
    plano?.periodicidade_unidade ?? "meses",
  );
  const [enviando, iniciar] = useTransition();

  const porHoras = unidade === "horas";

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarPlano(fd);
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
        <button
          type="button"
          onClick={() => setAberto(true)}
          title="Editar plano"
          aria-label="Editar plano"
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
        aoFechar={() => !enviando && setAberto(false)}
        titulo={editando ? "Editar manutenção periódica" : "Nova manutenção periódica"}
        descricao="O sistema avisa quando o prazo estiver próximo ou vencido."
        largura="max-w-2xl"
      >
        <form action={enviar}>
          <div className="space-y-4 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            {plano && <input type="hidden" name="id" value={plano.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Ativo" obrigatorio className="sm:col-span-2">
                <select
                  name="ativo_id"
                  required
                  defaultValue={plano?.ativo_id ?? ativoPadrao ?? ""}
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

              <Campo label="Tipo de manutenção" obrigatorio className="sm:col-span-2">
                <input
                  name="tipo"
                  required
                  list="sugestoes-preventiva"
                  defaultValue={plano?.tipo ?? ""}
                  placeholder="Ex.: Troca de óleo e filtros"
                  className="campo"
                />
                <datalist id="sugestoes-preventiva">
                  {SUGESTOES.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </Campo>

              <Campo label="Repetir a cada" obrigatorio>
                <input
                  name="periodicidade_valor"
                  type="number"
                  min={1}
                  required
                  defaultValue={plano?.periodicidade_valor ?? 6}
                  className="campo"
                />
              </Campo>

              <Campo label="Unidade" obrigatorio>
                <select
                  name="periodicidade_unidade"
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value as UnidadePeriodicidade)}
                  className="campo"
                >
                  {(Object.keys(UNIDADES) as UnidadePeriodicidade[]).map((u) => (
                    <option key={u} value={u}>
                      {UNIDADES[u]}
                    </option>
                  ))}
                </select>
              </Campo>

              {porHoras ? (
                <>
                  <Campo label="Próxima manutenção no horímetro" obrigatorio>
                    <input
                      name="proximo_horimetro"
                      inputMode="decimal"
                      required
                      defaultValue={plano?.proximo_horimetro ?? ""}
                      placeholder="Ex.: 15000"
                      className="campo"
                    />
                  </Campo>
                  <Campo label="Avisar quando faltar (horas)">
                    <input
                      name="alerta_antecedencia_horas"
                      inputMode="decimal"
                      defaultValue={plano?.alerta_antecedencia_horas ?? 50}
                      className="campo"
                    />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo label="Data da próxima manutenção" obrigatorio>
                    <input
                      name="proxima_data"
                      type="date"
                      required
                      defaultValue={plano?.proxima_data ?? hoje()}
                      className="campo"
                    />
                  </Campo>
                  <Campo label="Avisar com antecedência (dias)">
                    <input
                      name="alerta_antecedencia_dias"
                      type="number"
                      min={0}
                      defaultValue={plano?.alerta_antecedencia_dias ?? 7}
                      className="campo"
                    />
                  </Campo>
                </>
              )}

              <Campo label="Responsável">
                <input
                  name="responsavel"
                  defaultValue={plano?.responsavel ?? ""}
                  placeholder="Ex.: Equipe interna"
                  className="campo"
                />
              </Campo>

              <Campo label="Custo estimado (R$)">
                <input
                  name="custo_estimado"
                  inputMode="decimal"
                  defaultValue={plano?.custo_estimado ?? ""}
                  placeholder="0,00"
                  className="campo"
                />
              </Campo>

              <Campo label="Descrição / checklist" className="sm:col-span-2">
                <textarea
                  name="descricao"
                  rows={3}
                  defaultValue={plano?.descricao ?? ""}
                  placeholder="O que deve ser feito nesta manutenção?"
                  className="campo resize-y"
                />
              </Campo>
            </div>

            <label className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 py-3">
              <input
                type="checkbox"
                name="ativo"
                defaultChecked={plano?.ativo ?? true}
                className="h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
              />
              <span className="text-sm text-slate-700">
                Plano ativo — gerar alertas e aparecer no calendário
              </span>
            </label>
          </div>

          <RodapeModal>
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={enviando}>
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {editando ? "Salvar alterações" : "Criar plano"}
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </>
  );
}
