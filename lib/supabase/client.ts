import { createBrowserClient } from "@supabase/ssr";
import { chaveSupabase, urlSupabase } from "./config";

export function createClient() {
  return createBrowserClient(urlSupabase(), chaveSupabase());
}
