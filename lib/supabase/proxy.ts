import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { chaveSupabase, urlSupabase } from "./config";

/** Telas acessíveis sem sessão. */
const ROTAS_PUBLICAS = ["/login", "/cadastro", "/recuperar-senha", "/auth", "/offline"];

/**
 * Rotas de API cuidam da própria autenticação (a rotina diária usa CRON_SECRET).
 * Elas NÃO podem cair no redirecionamento para /login: o Vercel Cron não envia
 * cookie de sessão, e o redirect deixaria as notificações sem nunca disparar.
 */
const PREFIXO_API = "/api/";

function politicaDeSeguranca(nonce: string) {
  const dev = process.env.NODE_ENV === "development";
  const supa = "https://*.supabase.co";

  return [
    "default-src 'self'",
    // 'strict-dynamic': o navegador só confia nos scripts carregados a partir
    // dos scripts com nonce. Bloqueia injeção mesmo se algum HTML for adulterado.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Atributos style inline (cores das categorias, barras dos gráficos) não
    // aceitam nonce. Em style-src, 'unsafe-inline' não permite executar código.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supa}`,
    "font-src 'self' data:",
    `connect-src 'self' ${supa} wss://*.supabase.co`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

function aplicarCabecalhos(resposta: NextResponse, csp: string) {
  resposta.headers.set("Content-Security-Policy", csp);
  resposta.headers.set("X-Content-Type-Options", "nosniff");
  resposta.headers.set("X-Frame-Options", "DENY");
  resposta.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  resposta.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  resposta.headers.set("X-DNS-Prefetch-Control", "off");
  resposta.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    resposta.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  return resposta;
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = politicaDeSeguranca(nonce);

  const cabecalhos = new Headers(request.headers);
  cabecalhos.set("x-nonce", nonce);
  cabecalhos.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: cabecalhos } });

  // Rotas de API: só os cabeçalhos. Quem autentica é o próprio handler.
  if (pathname.startsWith(PREFIXO_API)) {
    return aplicarCabecalhos(response, csp);
  }

  const supabase = createServerClient(urlSupabase(), chaveSupabase(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: cabecalhos } });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          }),
        );
      },
    },
  });

  // IMPORTANTE: getUser() revalida o token no servidor. Não remova esta chamada.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const ehPublica = ROTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (!user && !ehPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return aplicarCabecalhos(NextResponse.redirect(url), csp);
  }

  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return aplicarCabecalhos(NextResponse.redirect(url), csp);
  }

  return aplicarCabecalhos(response, csp);
}
