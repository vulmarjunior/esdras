"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { vote, removeVote } from "@/app/actions/provision";

export function VoteButtons({ provisionId, currentOpinion }: { provisionId: string; currentOpinion: string | null }) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const options = [
    { k: "concordo", label: "Concordo" },
    { k: "discordo", label: "Discordo" },
    { k: "ressalva", label: "Tenho ressalva" },
  ];
  async function go(k: string) {
    setPending(true);
    await vote(provisionId, k);
    setPending(false);
    router.refresh();
  }
  async function clear() {
    setPending(true);
    await removeVote(provisionId);
    setPending(false);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">Opinião consultiva:</span>
      {options.map((o) => {
        const active = currentOpinion === o.k;
        return (
          <Button
            key={o.k}
            size="sm"
            variant={active ? "default" : "outline"}
            disabled={pending}
            onClick={() => go(o.k)}
            className={cn(
              active &&
                (o.k === "concordo"
                  ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                  : o.k === "discordo"
                    ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                    : "border-amber-500 bg-amber-500 text-white hover:bg-amber-600")
            )}
          >
            {o.label}
          </Button>
        );
      })}
      {currentOpinion && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={clear}>Remover</Button>
      )}
    </div>
  );
}