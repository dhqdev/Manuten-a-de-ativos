"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, RefreshCw, Send, Smartphone, TriangleAlert, Unplug } from "lucide-react";
import { Badge, Botao, Campo } from "@/components/ui";
import {
  consultarStatus,
  encerrarConexao,
  enviarResumoTeste,
  iniciarConexao,
  salvarPreferenciasWhatsapp,
  type StatusWhatsapp,
} from "@/lib/actions/whatsapp";

export type ConexaoAtual = {
  status: "desconectado" | "conectando" | "conectado";
  numero: string | null;
  nome_perfil: string | null;
  notificar: boolean;
  incluir_atrasadas: boolean;
  dias_antecedencia: number;
  horario_envio?: number | null;
  ultimo_envio: string | null;
} | null;

function formatarNumero(n: string | null) {
  if (!n) return "—";
  const d = n.replace(/\D/g, "");
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return `+${d}`;
}

export function PainelWhatsapp({ conexao }: { conexao: ConexaoAtual }) {
  const router = useRouter();

  const [estado, setEstado] = useState<StatusWhatsapp>({
    status: conexao?.status ?? "desconectado",
    qr: null,
    numero: conexao?.numero ?? null,
    nomePerfil: conexao?.nome_perfil ?? null,
  });
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const conectando = estado.status === "conectando";
  const conectado = estado.status === "conectado";
  const pararRef = useRef(false);

  // Enquanto o QR está na tela, pergunta ao servidor se já escanearam.
  const verificar = useCallback(async () => {
    const novo = await consultarStatus();
    if (pararRef.current) return;

    setEstado(novo);
    if (novo.erro) setErro(novo.erro);
    if (novo.status === "conectado") router.refresh();
  }, [router]);

  useEffect(() => {
    if (!conectando) return;
    pararRef.current = false;
    const timer = setInterval(verificar, 5000);
    return () => {
      pararRef.current = true;
      clearInterval(timer);
    };
  }, [conectando, verificar]);

  function conectar() {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const novo = await iniciarConexao();
      setEstado(novo);
      if (novo.erro) setErro(novo.erro);
    });
  }

  function desconectar() {
    setErro(null);
    iniciar(async () => {
      const r = await encerrarConexao();
      if (!r.ok) setErro(r.erro);
      else {
        setEstado({ status: "desconectado", qr: null, numero: null, nomePerfil: null });
        router.refresh();
      }
    });
  }

  function testar() {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await enviarResumoTeste();
      if (!r.ok) setErro(r.erro);
      else setAviso("Resumo enviado. Confira o WhatsApp conectado.");
    });
  }

  function salvar(fd: FormData) {
    setErro(null);
    setAviso(null);
    iniciar(async () => {
      const r = await salvarPreferenciasWhatsapp(fd);
      if (!r.ok) setErro(r.erro);
      else {
        setAviso("Preferências salvas.");
        router.refresh();
      }
    });
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Smartphone className="h-4 w-4 text-slate-400" />
          Notificações por WhatsApp
        </h2>
        {conectado ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Conectado
          </Badge>
        ) : conectando ? (
          <Badge className="bg-amber-50 text-amber-700 ring-amber-600/20">Aguardando leitura</Badge>
        ) : (
          <Badge>Desconectado</Badge>
        )}
      </header>

      <div className="space-y-4 px-4 py-5 sm:px-5">
        {erro && (
          <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {erro}
          </p>
        )}
        {aviso && (
          <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <Check className="h-4 w-4 shrink-0" />
            {aviso}
          </p>
        )}

        {/* --- Desconectado --- */}
        {!conectado && !conectando && (
          <>
            <p className="text-sm text-slate-600">
              Conecte um número e receba todo dia de manhã, no próprio WhatsApp, o resumo das
              manutenções atrasadas e das que estão para vencer.
            </p>
            <Botao onClick={conectar} disabled={ocupado}>
              {ocupado ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
              Conectar WhatsApp
            </Botao>
          </>
        )}

        {/* --- Aguardando leitura do QR --- */}
        {conectando && (
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
            <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-3">
              {estado.qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={estado.qr}
                  alt="QR Code para conectar o WhatsApp"
                  className="h-56 w-56"
                  width={224}
                  height={224}
                />
              ) : (
                <div className="flex h-56 w-56 items-center justify-center">
                  <LoaderCircle className="h-6 w-6 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">Escaneie com o WhatsApp</p>
              <ol className="mt-3 space-y-2 text-sm text-slate-600">
                {[
                  "Abra o WhatsApp no celular",
                  "Toque em Configurações → Aparelhos conectados",
                  "Toque em Conectar um aparelho",
                  "Aponte a câmera para este código",
                ].map((passo, i) => (
                  <li key={passo} className="flex gap-2.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {i + 1}
                    </span>
                    {passo}
                  </li>
                ))}
              </ol>

              <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                O código se renova sozinho. Assim que você escanear, a tela atualiza.
              </p>

              <div className="mt-4 flex gap-2">
                <Botao variante="secundario" tamanho="sm" onClick={conectar} disabled={ocupado}>
                  <RefreshCw className="h-4 w-4" />
                  Gerar novo código
                </Botao>
                <Botao variante="fantasma" tamanho="sm" onClick={desconectar} disabled={ocupado}>
                  Cancelar
                </Botao>
              </div>
            </div>
          </div>
        )}

        {/* --- Conectado --- */}
        {conectado && (
          <>
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {estado.nomePerfil || "WhatsApp conectado"}
                </p>
                <p className="truncate text-sm text-slate-500">{formatarNumero(estado.numero)}</p>
              </div>
              <div className="flex gap-2">
                <Botao variante="secundario" tamanho="sm" onClick={testar} disabled={ocupado}>
                  {ocupado ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Enviar teste
                </Botao>
                <Botao variante="secundario" tamanho="sm" onClick={desconectar} disabled={ocupado}>
                  <Unplug className="h-4 w-4" />
                  Desconectar
                </Botao>
              </div>
            </div>

            <form action={salvar} className="space-y-4">
              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3.5 py-3">
                <input
                  type="checkbox"
                  name="notificar"
                  defaultChecked={conexao?.notificar ?? true}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-800">Receber resumo diário</span>
                  <span className="mt-0.5 block text-slate-500">
                    Enviado no horário escolhido abaixo. Se não houver nada pendente, nada é enviado.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-2.5 rounded-lg border border-slate-200 px-3.5 py-3">
                <input
                  type="checkbox"
                  name="incluir_atrasadas"
                  defaultChecked={conexao?.incluir_atrasadas ?? true}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-marca-600 focus:ring-marca-500"
                />
                <span className="text-sm">
                  <span className="font-medium text-slate-800">Incluir manutenções atrasadas</span>
                  <span className="mt-0.5 block text-slate-500">
                    Cobra as pendências até que sejam registradas como feitas.
                  </span>
                </span>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Horário do envio" hint="Horário de Brasília.">
                  <select
                    name="horario_envio"
                    defaultValue={String(conexao?.horario_envio ?? 8)}
                    className="campo"
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo
                  label="Avisar com quantos dias de antecedência"
                  hint="Vale para as manutenções programadas por data."
                >
                  <input
                    name="dias_antecedencia"
                    type="number"
                    min={0}
                    max={60}
                    defaultValue={conexao?.dias_antecedencia ?? 3}
                    className="campo"
                  />
                </Campo>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs text-slate-500">
                  {conexao?.ultimo_envio
                    ? `Último envio: ${new Date(conexao.ultimo_envio).toLocaleString("pt-BR")}`
                    : "Nenhum resumo enviado ainda."}
                </p>
                <Botao type="submit" tamanho="sm" disabled={ocupado}>
                  {ocupado && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Salvar preferências
                </Botao>
              </div>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
