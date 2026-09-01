<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ESDRAS — Reforma do Estatuto da IBO

Aplicação web para a **Comissão de Reforma do Estatuto Social da Igreja Batista Olaria (IBO)** (9 membros): análise do Estatuto dispositivo por dispositivo, sugestões, reuniões com deliberações e atas, e geração do Estatuto consolidado. A especificação completa está em `../PRD_ESDRAS.md` (raiz do repositório) — **leia antes de alterar regras de negócio**.

## Estado do projeto (última atualização)

- MVP completo em Next.js 16 + SQLite local; **não há Supabase ainda** (decisão pendente do usuário). Toda a IA é via Groq API, chamada exclusivamente no servidor.
- Banco local em `data/esdras.db` (não versionado — recriado com `npm run seed`). O seed contém o Estatuto registrado da IBO + Proposta de Reforma importados dos PDFs em `../Documentos fonte/` (texto vigente, proposta inicial, justificativas, hierarquia completa).
- Autenticação local: JWT (jose) + bcrypt, sessão em cookie `esdras_session`. Usuários de demonstração: `admin@ibo.local`/`admin123`, `coordenador@ibo.local`/`coord123`, `membro1@ibo.local`…`membro7@ibo.local`/`membro123`.
- **Últimas features entregues**: CRUD completo de reuniões (editar/excluir com cascade), CRUD de dispositivos (incluir/editar/excluir; originais protegidos — usar status `revogado`), CRUD de usuários com edição de e-mail, correção de extração (admin) com auditoria, modal de confirmação (substituiu window.confirm), gaveta lateral mobile, distinção visual vigente/proposta/redação, ordenação entre irmãos (`ordem_pai`).
- Veja `PENDENCIAS.md` para a pauta de trabalho do próximo agente.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (http://localhost:3000)
npm run build      # build de produção (inclui type check)
npm run lint       # eslint
npm run seed       # RECRIA data/esdras.db do zero (usuários + estatuto + proposta)
node scripts/demo-meeting.mjs   # (opcional) recria a reunião demo nº 1
node scripts/migrate-ordem.mjs  # (opcional) adiciona/reindexa coluna ordem_pai
```

> Atenção: pare o `next dev` antes de rodar `npm run seed` (o arquivo do banco fica bloqueado no Windows).

## Arquitetura e convenções

- **Next.js 16** (App Router, Turbopack, RSC). Consulte os docs em `node_modules/next/dist/docs/` antes de escrever código (ex.: `proxy.ts` substitui `middleware.ts`; `params` é `Promise`; layout usa `LayoutProps`).
- **Páginas**: `app/(app)/` (área autenticada). Rotas com dados dinâmicos usam `export const dynamic = "force-dynamic"`.
- **Mutações**: Server Actions em `app/actions/*.ts` — cada ação valida perfil no servidor (`requireRole`/`requireUser` de `lib/auth.ts`) e registra em `audit_logs`. Nunca confiar só no frontend.
- **Banco**: `lib/db.ts` (better-sqlite3, WAL, FK on) + `lib/schema.sql`. Queries diretas com `get/all/run/transaction`. IDs dos dispositivos são slugs estáveis (`art-1`, `art-4-p2`, `cap-2`); novos usam `novo-<timestamp36>-<rand>`.
- **Perfis**: `admin` (tudo, corrige extração, auditoria/admin só dele), `coordenador` (redação de trabalho, status, reuniões, incluir/editar/excluir dispositivos não-originais), `membro` (sugestões, comentários, pendências, referências, votos consultivos). Auditoria e Administração visíveis **somente para admin**.
- **Regras de negócio centrais** (PRD §50): integridade dos dados → histórico → simplicidade → colaboração → estética. Nenhuma contribuição sobrescreve outra; toda alteração da redação de trabalho cria versão; decisão sempre vinculada à reunião e ao dispositivo.
- **Modelos de IA**: o `llama-3.3-70b-versatile` foi **descontinuado na Groq (16/08/2026)**. O `app/api/ai/route.ts` usa cadeia de fallback: `GROQ_MODEL` → `openai/gpt-oss-120b` → `qwen/qwen3.6-27b` → `openai/gpt-oss-20b`. A chave fica em `.env.local` (`GROQ_API_KEY`), nunca no frontend.
- **Ordenação da árvore**: `ordem_pai` (posição entre irmãos); `ordem` é a sequência global. Exportações seguem `ordem_pai`.

## Setup em máquina nova

```bash
npm install
cp .env.example .env.local   # ajustar SESSION_SECRET (e GROQ_API_KEY quando tiver)
npm run seed
npm run dev
```

## Estrutura relevante

- `app/(app)/dispositivo/[id]/page.tsx` — tela de análise (área central do sistema)
- `components/provision/*` — editor de redação, sugestões, comentários, pendências, ações do dispositivo
- `components/meetings/*` — CRUD de reuniões, modo reunião, deliberações, ata
- `components/confirm-dialog.tsx` — modal de confirmação reutilizável
- `lib/seed-data/*.json` — Estatuto + Proposta estruturados por capítulo (fonte dos dados)
- `scripts/seed.mjs` — cria o banco a partir dos JSONs