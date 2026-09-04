"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createComment } from "@/app/actions/provision";
import { SubmitBtn } from "@/components/provision/submit-btn";
import type { Comment } from "@/lib/types";

function initials(name: string): string {
  const parts = (name || "?").trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CommentForm({ provisionId, suggestionId }: { provisionId: string | null; suggestionId: number | null }) {
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit() {
    setPending(true);
    const res = await createComment(provisionId, suggestionId, content);
    setPending(false);
    if (res.error) return toast.error(res.error);
    setContent("");
    router.refresh();
  }
  return (
    <div className="flex gap-2">
      <input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva um comentário..."
        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
      />
      <SubmitBtn label="Comentar" pending={pending} onClick={submit} />
    </div>
  );
}

export function CommentList({ comments }: { comments: Comment[] }) {
  if (!comments.length) return <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>;
  return (
    <ul className="space-y-2.5">
      {comments.map((c) => (
        <li key={c.id} className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(c.author_name || "")}
          </div>
          <div className="min-w-0 flex-1 rounded-xl rounded-tl-sm border bg-card p-3 text-sm">
            <p className="text-foreground">{c.content}</p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {c.author_name} · {new Date(c.created_at + "Z").toLocaleString("pt-BR")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}