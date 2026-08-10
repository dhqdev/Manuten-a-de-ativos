import os from "node:os";
import type { NextConfig } from "next";

/**
 * Em desenvolvimento o Next bloqueia requisições vindas de uma origem diferente
 * de localhost — inclusive o WebSocket do hot-reload. Quando o navegador abre o
 * app pelo IP da rede (ex.: http://192.168.100.253:3001), o HMR falha com
 * "WebSocket connection failed".
 *
 * Aqui liberamos automaticamente os IPs desta máquina. Para adicionar outros
 * (um domínio de túnel, por exemplo), use DEV_ORIGINS=host1,host2 no .env.local.
 */
function origensDeDesenvolvimento(): string[] {
  const origens = new Set<string>(["localhost", "127.0.0.1"]);

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const rede of interfaces ?? []) {
      if (rede.family === "IPv4" && !rede.internal) origens.add(rede.address);
    }
  }

  for (const extra of (process.env.DEV_ORIGINS ?? "").split(",")) {
    const valor = extra.trim();
    if (valor) origens.add(valor);
  }

  return [...origens];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: origensDeDesenvolvimento(),
};

export default nextConfig;
