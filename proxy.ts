import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /**
     * Tudo, menos:
     *  - assets do Next e imagens;
     *  - o service worker e o manifest (o navegador busca sem sessão; se caíssem
     *    no redirecionamento para /login, o PWA não instalaria).
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|icones/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
