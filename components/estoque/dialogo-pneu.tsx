"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { salvarPneu } from "@/lib/actions/pneus";
import { CONDICAO_PNEU, hoje } from "@/lib/format";
import type { CondicaoPneu, Pneu } from "@/lib/types";

const MEDIDAS = [
  "295/80 R22.5",
  "275/80 R22.5",
  "215/75 R17.5",
  "235/75 R17.5",
  "11.00 R22",
  "1000 R20",
  "205/75 R16C",
  "7.00-12",
  "6.50-10",
  "28x9-15",
];

const MARCAS = ["Michelin", "Pirelli", "Bridgestone", "Goodyear", "Continental", "Firestone", "Dunlop", "Xbri"];

export function DialogoPneu({ pneu, rotulo = "Novo pneu" }: { pneu?: Pneu; rotulo?: string }) {
  const router = useRouter();
  const editando = Boolean(pneu);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarPneu(fd);
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
          title="Editar pneu"
          aria-label="Editar pneu"
          className="pressionavel rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <Botao onClick={() => setAberto(true)}>
          <Plus className="h-4 w-4" />
          {rotulo}
        </Botao>
      )}

      <Modal
        aberto={aberto}
        aoFechar={() => !enviando && setAberto(false)}
        titulo={editando ? `Editar pneu ${pneu?.numero_fogo}` : "Cadastrar pneu"}
        descricao="O número de fogo é a marcação gravada no pneu e identifica ele no estoque."
        largura="max-w-2xl"
      >
        <form action={enviar}>
          <div className="space-y-5 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>
            )}
            {pneu && <input type="hidden" name="id" value={pneu.id} />}

            <Grupo titulo="Identificação">
              <Campo label="Número de fogo" obrigatorio>
                <input
                  name="numero_fogo"
                  required
                  defaultValue={pneu?.numero_fogo ?? ""}
                  placeholder="Ex.: P-0001"
                  className="campo uppercase"
                />
              </Campo>
              <Campo label="Condição">
                <select name="condicao" defaultValue={pneu?.condicao ?? "novo"} className="campo">
                  {(Object.keys(CONDICAO_PNEU) as CondicaoPneu[]).map((c) => (
                    <option key={c} value={c}>
                      {CONDICAO_PNEU[c]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Marca" obrigatorio>
                <input name="marca" required list="marcas-pneu" defaultValue={pneu?.marca ?? ""} className="campo" />
                <datalist id="marcas-pneu">
                  {MARCAS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Campo>
              <Campo label="Modelo / desenho">
                <input name="modelo" defaultValue={pneu?.modelo ?? ""} placeholder="Ex.: X Multi Z" className="campo" />
              </Campo>
              <Campo label="Medida" obrigatorio>
                <input name="medida" required list="medidas-pneu" defaultValue={pneu?.medida ?? ""} placeholder="295/80 R22.5" className="campo" />
                <datalist id="medidas-pneu">
                  {MEDIDAS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Campo>
              <Campo label="DOT (semana e ano)" hint="Os 4 últimos dígitos do DOT. Ex.: 2324 = semana 23 de 2024.">
                <input name="dot" maxLength={8} defaultValue={pneu?.dot ?? ""} placeholder="2324" className="campo" />
              </Campo>
            </Grupo>

            <Grupo titulo="Medidas técnicas">
              <Campo label="Sulco inicial (mm)">
                <input name="sulco_inicial_mm" inputMode="decimal" defaultValue={pneu?.sulco_inicial_mm ?? ""} placeholder="Ex.: 16" className="campo" />
              </Campo>
              <Campo label="Pressão recomendada (PSI)">
                <input name="pressao_psi" inputMode="decimal" defaultValue={pneu?.pressao_psi ?? ""} placeholder="Ex.: 110" className="campo" />
              </Campo>
              <Campo label="Recapagens já feitas">
                <input name="recapagens" type="number" min={0} defaultValue={pneu?.recapagens ?? 0} className="campo" />
              </Campo>
              <Campo label="Local no estoque">
                <input name="localizacao" defaultValue={pneu?.localizacao ?? ""} placeholder="Ex.: Galpão 2, prateleira B" className="campo" />
              </Campo>
            </Grupo>

            <Grupo titulo="Compra">
              <Campo label="Data da compra">
                <input name="data_compra" type="date" defaultValue={pneu?.data_compra ?? (editando ? "" : hoje())} className="campo" />
              </Campo>
              <Campo label="Valor (R$)">
                <input name="valor_compra" inputMode="decimal" defaultValue={pneu?.valor_compra ?? ""} placeholder="0,00" className="campo" />
              </Campo>
              <Campo label="Fornecedor">
                <input name="fornecedor" defaultValue={pneu?.fornecedor ?? ""} className="campo" />
              </Campo>
              <Campo label="Nota fiscal">
                <input name="nota_fiscal" defaultValue={pneu?.nota_fiscal ?? ""} className="campo" />
              </Campo>
            </Grupo>

            <Campo label="Observações">
              <textarea name="observacoes" rows={2} defaultValue={pneu?.observacoes ?? ""} className="campo" />
            </Campo>
          </div>

          <RodapeModal>
            <Botao type="button" variante="secundario" onClick={() => setAberto(false)} disabled={enviando}>
              Cancelar
            </Botao>
            <Botao type="submit" disabled={enviando}>
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {editando ? "Salvar alterações" : "Cadastrar pneu"}
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{titulo}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
