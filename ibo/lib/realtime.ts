import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Publicador de eventos realtime (server-side). Usa Broadcast do Supabase
 * Realtime, que NÃO exige RLS nem Auth — funciona com a chave publishable.
 * Se as env vars não estiverem configuradas, vira no-op silencioso.
 */

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;

function ensure(): RealtimeChannel | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  if (!channel) {
    channel = client.channel("esdras-realtime", { config: { broadcast: { self: false } } });
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        channel = null;
      }
    });
  }
  return channel;
}

/** Publica um evento "refresh" no canal global; os clientes fazem router.refresh(). */
export async function publishRealtime(payload?: Record<string, unknown>): Promise<void> {
  const ch = ensure();
  if (!ch) return;
  try {
    await ch.send({ type: "broadcast", event: "refresh", payload: payload ?? {} });
  } catch {
    // realtime é best-effort: falha não deve derrubar a ação
  }
}
