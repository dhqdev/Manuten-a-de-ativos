/**
 * Service worker mínimo e conservador.
 *
 * Regra de ouro deste app: nunca servir HTML de cache. As páginas dependem da
 * sessão e mostram dados de manutenção — entregar uma versão antiga seria pior
 * do que não funcionar. Por isso:
 *
 *   - navegação  -> rede primeiro; sem rede, cai na página /offline;
 *   - estáticos  -> cache primeiro (hash no nome, então nunca fica velho);
 *   - resto      -> passa direto, sem interferir.
 *
 * Nada de API, Supabase ou Evolution passa por aqui.
 */

const VERSAO = "manutencao-v1";
const CACHE_ESTATICO = `${VERSAO}-estatico`;
const PAGINA_OFFLINE = "/offline";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll([PAGINA_OFFLINE, "/icones/icone-192.png"]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => !c.startsWith(VERSAO)).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;

  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);

  // Só cuidamos do próprio domínio.
  if (url.origin !== self.location.origin) return;

  // Rotas de API e autenticação nunca são interceptadas.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Navegação: rede primeiro, offline como último recurso.
  if (requisicao.mode === "navigate") {
    evento.respondWith(
      fetch(requisicao).catch(async () => {
        const cache = await caches.open(CACHE_ESTATICO);
        return (await cache.match(PAGINA_OFFLINE)) ?? Response.error();
      }),
    );
    return;
  }

  // Estáticos com hash no nome: cache primeiro.
  const ehEstatico =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icones/") ||
    /\.(?:css|js|woff2?|png|svg|jpg|jpeg|webp|ico)$/.test(url.pathname);

  if (!ehEstatico) return;

  evento.respondWith(
    caches.match(requisicao).then(
      (guardado) =>
        guardado ??
        fetch(requisicao).then((resposta) => {
          if (resposta.ok && resposta.type === "basic") {
            const copia = resposta.clone();
            caches.open(CACHE_ESTATICO).then((cache) => cache.put(requisicao, copia));
          }
          return resposta;
        }),
    ),
  );
});
