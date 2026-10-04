"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eraser, LoaderCircle, TriangleAlert } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo } from "@/components/ui";
import { limparHistorico, previaLimpeza, type FiltroLimpeza } from "@/lib/actions/manutencoes";
import { TIPOS_MANUTENCAO, moeda, primeiroDiaDoMes, ultimoDiaDoMes } from "@/lib/format";
import type { TipoManutencao } from "@/lib/types";

/**
 * Apaga o histórico de um período — tudo ou só um tipo (ex.: preventivas).
 * Mostra quantos registros vão sair antes de confirmar, e a confirmação exige
 * digitar APAGAR: não tem volta, as fotos dos registros também somem.
 */
export function LimparHistorico({ ativos }: { ativos: { id: string; nome: string }[] }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [filtro, setFiltro] = useState<FiltroLimpeza>({
    de: primeiroDiaDoMes(),
    ate: ultimoDiaDoMes(),
    tipo: "preventiva",
    ativoId: null,
  });
  const [previa, setPrevia] = useState<{ quantidade: number; valor: number } | null>(null);
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [calculando, iniciarCalculo] = useTransition();
  const [apagando, iniciarExclusao] = useTransition();

  useEffect(() => {
    if (!aberto) return;
    setPrevia(null);
    setErro(null);
    iniciarCalculo(async () => {
      const r = await previaLimpeza(filtro);
      if (r.ok) setPrevia({ quantidade: r.quantidade, valor: r.valor });
      else setErro(r.erro);
    });
  }, [aberto, filtro]);

  function fechar() {
    if (apagando) return;
    setAberto(false);
    setConfirmacao("");
    setSucesso(null);
  }

  function apagar() {
    setErro(null);
    iniciarExclusao(async () => {
      const r = await limparHistorico(filtro);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setSucesso(`${r.quantidade} registro(s) apagado(s).`);
      setConfirmacao("");
      setPrevia({ quantidade: 0, valor: 0 });
      router.refresh();
    });
  }

  const alterar = (parcial: Partial<FiltroLimpeza>) => {
    setSucesso(null);
    setFiltro((f) => ({ ...f, ...parcial }));
  };

  const podeApagar =
    !calculando && !apagando && (previa?.quantidade ?? 0) > 0 && confirmacao.trim().toUpperCase() === "APAGAR";

  return (
    <>
      <Botao variante="secundario" onClick={() => setAberto(true)}>
        <Eraser className="h-4 w-4" />
        Limpar histórico
      </Botao>

      <Modal
        aberto={aberto}
        aoFechar={fechar}
        titulo="Limpar histórico"
        descricao="Apague os serviços registrados em um período. Use para tirar registros antigos ou lançados errado."
        largura="max-w-lg"
      >
        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="De">
              <input
                type="date"
                value={filtro.de}
                onChange={(e) => alterar({ de: e.target.value })}
                className="campo"
              />
            </Campo>
            <Campo label="Até">
              <input
                type="date"
                value={filtro.ate}
                onChange={(e) => alterar({ ate: e.target.value })}
                className="campo"
              />
            </Campo>
          </div>

          <Campo label="O que apagar">
            <select
              value={filtro.tipo}
              onChange={(e) => alterar({ tipo: e.target.value as FiltroLimpeza["tipo"] })}
              className="campo"
            >
              <option value="preventiva">Só as preventivas</option>
              <option value="todos">Todos os tipos</option>
              {(Object.keys(TIPOS_MANUTENCAO) as TipoManutencao[])
                .filter((t) => t !== "preventiva")
                .map((t) => (
                  <option key={t} value={t}>
                    Só {TIPOS_MANUTENCAO[t].toLowerCase()}
                  </option>
                ))}
            </select>
          </Campo>

          <Campo label="Ativo">
            <select
              value={filtro.ativoId ?? ""}
              onChange={(e) => alterar({ ativoId: e.target.value || null })}
              className="campo"
            >
              <option value="">Todos os ativos</option>
              {ativos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </Campo>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            {calculando || !previa ? (
              <span className="flex items-center gap-2 text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Contando registros...
              </span>
            ) : previa.quantidade === 0 ? (
              <span className="text-slate-600">Nenhum registro nesse filtro.</span>
            ) : (
              <span className="text-slate-700">
                Serão apagados <strong>{previa.quantidade}</strong> registro(s), somando{" "}
                <strong>{moeda(previa.valor)}</strong>, com fotos e anexos.
              </span>
            )}
          </div>

          {(previa?.quantidade ?? 0) > 0 && (
            <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="flex items-start gap-2 text-sm text-red-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                Não dá para desfazer. Os relatórios desse período deixam de mostrar esses serviços.
                As datas das manutenções periódicas não mudam.
              </p>
              <Campo label='Digite "APAGAR" para confirmar'>
                <input
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  className="campo"
                  autoComplete="off"
                />
              </Campo>
            </div>
          )}

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {sucesso && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{sucesso}</p>
          )}
        </div>

        <RodapeModal>
          <Botao variante="secundario" onClick={fechar} disabled={apagando}>
            Fechar
          </Botao>
          <Botao variante="perigo" onClick={apagar} disabled={!podeApagar}>
            {apagando ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Eraser className="h-4 w-4" />}
            Apagar registros
          </Botao>
        </RodapeModal>
      </Modal>
    </>
  );
}
