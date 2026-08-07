"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Pencil, Plus } from "lucide-react";
import { Modal, RodapeModal } from "@/components/modal";
import { Botao, Campo, cn } from "@/components/ui";
import { CORES_CATEGORIA, ICONES, OPCOES_ICONE } from "@/lib/icones";
import { salvarCategoria } from "@/lib/actions/categorias";
import type { Categoria } from "@/lib/types";

export function DialogoCategoria({ categoria }: { categoria?: Categoria }) {
  const router = useRouter();
  const editando = Boolean(categoria);

  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cor, setCor] = useState(categoria?.cor ?? CORES_CATEGORIA[0]);
  const [icone, setIcone] = useState(categoria?.icone ?? "package");
  const [enviando, iniciar] = useTransition();

  function abrir() {
    setCor(categoria?.cor ?? CORES_CATEGORIA[0]);
    setIcone(categoria?.icone ?? "package");
    setErro(null);
    setAberto(true);
  }

  function enviar(fd: FormData) {
    setErro(null);
    iniciar(async () => {
      const r = await salvarCategoria(fd);
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
          onClick={abrir}
          title="Editar categoria"
          aria-label="Editar categoria"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-4 w-4" />
        </button>
      ) : (
        <Botao onClick={abrir}>
          <Plus className="h-4 w-4" />
          Nova categoria
        </Botao>
      )}

      <Modal
        aberto={aberto}
        aoFechar={() => !enviando && setAberto(false)}
        titulo={editando ? "Editar categoria" : "Nova categoria"}
        descricao="As categorias funcionam como pastas para organizar seus ativos."
        largura="max-w-lg"
      >
        <form action={enviar}>
          <div className="space-y-4 px-5 py-5">
            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}

            {categoria && <input type="hidden" name="id" value={categoria.id} />}
            <input type="hidden" name="cor" value={cor} />
            <input type="hidden" name="icone" value={icone} />

            <Campo label="Nome" obrigatorio>
              <input
                name="nome"
                required
                defaultValue={categoria?.nome ?? ""}
                placeholder="Ex.: Caminhões"
                className="campo"
                autoFocus
              />
            </Campo>

            <Campo label="Descrição">
              <input
                name="descricao"
                defaultValue={categoria?.descricao ?? ""}
                placeholder="Ex.: Frota de caminhões e veículos pesados"
                className="campo"
              />
            </Campo>

            <Campo label="Cor">
              <div className="flex flex-wrap gap-2">
                {CORES_CATEGORIA.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    aria-label={`Cor ${c}`}
                    className={cn(
                      "h-8 w-8 rounded-full ring-offset-2 transition-all",
                      cor === c ? "ring-2 ring-slate-900" : "hover:scale-110",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Campo>

            <Campo label="Ícone">
              <div className="flex flex-wrap gap-2">
                {OPCOES_ICONE.map((nome) => {
                  const Icone = ICONES[nome];
                  const sel = icone === nome;
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => setIcone(nome)}
                      aria-label={nome}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors",
                        sel
                          ? "border-transparent text-white"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50",
                      )}
                      style={sel ? { backgroundColor: cor } : undefined}
                    >
                      <Icone className="h-[18px] w-[18px]" />
                    </button>
                  );
                })}
              </div>
            </Campo>
          </div>

          <RodapeModal>
            <Botao
              type="button"
              variante="secundario"
              onClick={() => setAberto(false)}
              disabled={enviando}
            >
              Cancelar
            </Botao>
            <Botao type="submit" disabled={enviando}>
              {enviando && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {editando ? "Salvar alterações" : "Criar categoria"}
            </Botao>
          </RodapeModal>
        </form>
      </Modal>
    </>
  );
}
