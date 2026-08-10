import "server-only";

/**
 * Cliente da Evolution API.
 *
 * A chave é de administrador — dá acesso a TODAS as instâncias do servidor.
 * Por isso este arquivo é `server-only`: nunca pode ser importado por um
 * componente de cliente, e as variáveis não têm prefixo NEXT_PUBLIC_.
 */

const URL_PADRAO = "https://zap.tekvosoft.com";

function base() {
  return (process.env.EVOLUTION_API_URL || URL_PADRAO).replace(/\/+$/, "");
}

function chave() {
  const k = process.env.EVOLUTION_API_KEY?.trim();
  if (!k) {
    throw new Error(
      "EVOLUTION_API_KEY não configurada. Adicione a variável no .env.local e na Vercel.",
    );
  }
  return k;
}

export type EstadoConexao = "connecting" | "open" | "close" | "desconhecido";

async function chamar<T>(
  caminho: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const resposta = await fetch(`${base()}${caminho}`, {
    method: init.method ?? "GET",
    headers: {
      apikey: chave(),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });

  const texto = await resposta.text();
  let dados: unknown = null;
  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    dados = texto;
  }

  if (!resposta.ok) {
    const detalhe =
      (dados as { response?: { message?: unknown }; message?: unknown })?.response?.message ??
      (dados as { message?: unknown })?.message ??
      texto;
    throw new Error(
      `Evolution API (${resposta.status}): ${
        typeof detalhe === "string" ? detalhe : JSON.stringify(detalhe)
      }`,
    );
  }

  return dados as T;
}

/** Nome da instância desta empresa dentro da Evolution. */
export function nomeInstancia(orgId: string) {
  return `manut_${orgId.replace(/-/g, "").slice(0, 20)}`;
}

type RespostaQr = { base64?: string; code?: string; pairingCode?: string | null; count?: number };

/**
 * Cria a instância e devolve o QR code. Se a instância já existir, apenas
 * pede um QR novo (o código expira em cerca de um minuto).
 */
export async function abrirConexao(instancia: string): Promise<{ qr: string | null }> {
  try {
    const criada = await chamar<{ qrcode?: RespostaQr }>("/instance/create", {
      method: "POST",
      body: { instanceName: instancia, qrcode: true, integration: "WHATSAPP-BAILEYS" },
    });
    return { qr: criada?.qrcode?.base64 ?? null };
  } catch (e) {
    // "name already in use" → a instância já existe; só renova o QR.
    const msg = e instanceof Error ? e.message : "";
    if (!/already in use|already exists|já está em uso/i.test(msg)) throw e;
  }

  const conexao = await chamar<RespostaQr>(`/instance/connect/${encodeURIComponent(instancia)}`);
  return { qr: conexao?.base64 ?? null };
}

/** Pede um QR novo para uma instância que já existe. */
export async function renovarQr(instancia: string): Promise<string | null> {
  const r = await chamar<RespostaQr>(`/instance/connect/${encodeURIComponent(instancia)}`);
  return r?.base64 ?? null;
}

export async function estadoConexao(instancia: string): Promise<EstadoConexao> {
  try {
    const r = await chamar<{ instance?: { state?: string } }>(
      `/instance/connectionState/${encodeURIComponent(instancia)}`,
    );
    return (r?.instance?.state as EstadoConexao) ?? "desconhecido";
  } catch {
    return "close";
  }
}

/** Dados do número conectado (aparece na tela depois de escanear). */
export async function dadosInstancia(instancia: string) {
  const lista = await chamar<
    { name?: string; ownerJid?: string; profileName?: string; connectionStatus?: string }[]
  >("/instance/fetchInstances");

  const achada = Array.isArray(lista) ? lista.find((i) => i.name === instancia) : undefined;
  if (!achada) return null;

  return {
    numero: achada.ownerJid?.split("@")[0] ?? null,
    nomePerfil: achada.profileName ?? null,
    estado: (achada.connectionStatus as EstadoConexao) ?? "desconhecido",
  };
}

export async function desconectar(instancia: string) {
  try {
    await chamar(`/instance/logout/${encodeURIComponent(instancia)}`, { method: "DELETE" });
  } catch {
    // já estava desconectada
  }
  try {
    await chamar(`/instance/delete/${encodeURIComponent(instancia)}`, { method: "DELETE" });
  } catch {
    // já não existia
  }
}

/** Envia uma mensagem de texto. `numero` só com dígitos, com DDI. */
export async function enviarTexto(instancia: string, numero: string, texto: string) {
  return chamar(`/message/sendText/${encodeURIComponent(instancia)}`, {
    method: "POST",
    body: { number: numero.replace(/\D/g, ""), text: texto },
  });
}
