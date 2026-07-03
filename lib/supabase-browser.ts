import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseBrowser() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Faltan las variables públicas de Supabase");
  client = createClient(url, key);
  return client;
}
