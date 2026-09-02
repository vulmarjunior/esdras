"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Users } from "lucide-react";

interface PresenceUser {
  name: string;
  role: string;
}

/**
 * Presença no Modo Reunião: mostra quem está com a tela da reunião aberta agora
 * (via Supabase Realtime Presence — não exige RLS/Auth).
 */
export function MeetingPresence({
  meetingId,
  userId,
  userName,
  userRole,
}: {
  meetingId: number;
  userId: number;
  userName: string;
  userRole: string;
}) {
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const channel = client.channel(`esdras-presence-${meetingId}`, {
      config: { presence: { key: String(userId) } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      const list = Object.values(state)
        .flat()
        .map((p) => ({ name: p.name, role: p.role }));
      setOnline(list);
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({ name: userName, role: userRole });
      }
    });

    return () => {
      void client.removeChannel(channel);
    };
  }, [meetingId, userId, userName, userRole]);

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      <Users className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Online:</span>
      {online.length === 0 ? (
        <span className="text-xs text-muted-foreground/70">aguardando conexão…</span>
      ) : (
        <span className="flex flex-wrap gap-1">
          {online.map((p) => (
            <span key={p.name} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {p.name}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
