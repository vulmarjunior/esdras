"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { BookOpen, Lock } from "lucide-react";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/60 px-4">
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <BookOpen className="h-7 w-7" />
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Reforma do Estatuto Social da IBO
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ESDRAS — Espaço de Sugestões, Deliberações, Revisões, Atas e Sistematização
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            Acesso restrito à Comissão
          </div>
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
              />
            </div>
            {state?.error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {state.error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="h-10 w-full rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-60"
            >
              {pending ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Sem cadastro público — usuários são cadastrados pelo administrador.
        </p>
      </div>
    </div>
  );
}