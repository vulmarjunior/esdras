"use client";

import { Button } from "@/components/ui/button";

export function SubmitBtn({ label, pending, onClick }: { label: string; pending: boolean; onClick: () => void }) {
  return (
    <Button type="button" size="sm" disabled={pending} onClick={onClick}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}