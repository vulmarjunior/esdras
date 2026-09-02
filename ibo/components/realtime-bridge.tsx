"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * Escuta o canal global "esdras-realtime" e, a cada evento "refresh",
 * chama router.refresh() — preservando o estado dos componentes client
 * (digitação em andamento não é perdida).
 */
export function RealtimeBridge() {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const channel = client.channel("esdras-realtime");
    channel.on("broadcast", { event: "refresh" }, () => router.refresh());
    channel.subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [router]);

  return null;
}
