<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ESDRAS — Reforma do Estatuto da IBO

Aplicação web para a **Comissão de Reforma do Estatuto Social da Igreja Batista Olaria (IBO)** (9 membros): análise do Estatuto dispositivo por dispositivo, sugestões, reuniões com deliberações e atas, e geração do Estatuto consolidado. A especificação completa está em `../PRD_ESDRAS.md` (raiz do repositório) — **leia antes de alterar regras de negócio**.

## Estado do projeto (última atualização)

- MVP completo em **Next.js 16 + Supabase Postgres** (via `pg`, connection string do shared pooler). Deploy alvo: Vercel. Toda a IA é via Groq API, chamada exclusivamente no servidor.
- **Banco**: Postgres (Supabase). `DATABASE_URL` no `.env.local` (pooler Session, porta 5432). A camada `lib/db.ts` converte `?`→`$N`, `datetime('now')`→`to_char(now(),...)` e `INSERT OR IGNORE`→`ON CONFLICT DO NOTHING`. Dados carregados via `scripts/migrate-to-pg.mjs` (idempotente: drop + recria + copia do SQLite). `lib/schema.sql` é a referência de schema; datas ficam como TEXT no mesmo formato do SQLite.
- Autenticação local: JWT (jose) + bcrypt, sessão em cookie `esdras_session`. **Troca de senha obrigatória no primeiro acesso**: `must_change_password` (claim `mc` no JWT; `proxy.ts` + layout + `requireUser` bloqueiam até trocar; página `/trocar-senha`). Usuários criados pelo admin e senha redefinida pelo admin reativam a obrigação. Usuários de demonstração: `admin@ibo.local`/`admin123`, `coordenador@ibo.local`/`coord123`, `membro1@ibo.local`…`membro7@ibo.local`/`membro123` (trocam a senha no 1º login). Telefone em `users.phone` com link WhatsApp (`lib/phone.ts`: `normalizarTelefone`/`formatarTelefone`/`whatsappLink`) — exibido no Admin e na presença das reuniões.
- **Últimas features entregues**: migração Supabase (`pg`, async), CRUD de reuniões/dispositivos/usuários, editor de texto rico (zero-dep) com sanitização, renumeração (§17 simulador + aplicar + **reordenação física de artigos** via `moveProvision`/`lib/reorder-core.ts`), referências cruzadas (§18), votação de sugestões, aprovar dispositivo na reunião (§23), retificação de ata (§29), coerência IA (§33), paginação de auditoria, perfis centralizados (`lib/permissions.ts`), troca de senha obrigatória no 1º acesso, telefone com link WhatsApp (`lib/phone.ts`), realtime (§40 Broadcast + Presence via `lib/realtime.ts`), **tela do dispositivo em abas** (`components/provision/device-tabs.tsx`), **anotação pessoal por membro** (`personal_notes` — privada, no topo da aba Colaboração; `app/actions/notes.ts` + `components/provision/personal-note-form.tsx`), **guia de redação (LC 95/1998 + Manual de Redação da Presidência)** — `lib/legal-refs.ts` curado, prompts de IA enriquecidos, `action: duvida` e `action: valida_tecnica` (checklist LC 95 no editor), página `/guia-redacao` (`components/guia/*`), testes Vitest (50), **biblioteca doutrinária (`/documentos`)** — 6 documentos confessionais batistas (Londres 1689, New Hampshire 1833, Fé e Mensagem 2000, Declaração Doutrinária da CBB, Princípios Batistas, Pacto das Igrejas Batistas; **Filadélfia 1742 removida por decisão do usuário**; Declaração de Fé da Igreja Local fica fora — outro projeto), dados gerados por `scripts/build-confissoes.mjs` em `lib/confissoes/data/*.json` a partir de `../Documentos fonte`, leitura por seções + busca em `components/documentos/biblioteca.tsx`, consulta IA (`action: consulta_doutrinaria` no `/api/ai`, injeta trechos via `lib/confissoes/recuperacao.ts` `buscarTrechos`), testes Vitest (66).
- Veja `PENDENCIAS.md` para a pauta de trabalho do próximo agente.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento (http://localhost:3000) — usa DATABASE_URL (Supabase)
npm run build      # build de produção (inclui type check)
npm run lint       # eslint
npm test           # vitest (módulos puros)
node scripts/migrate-to-pg.mjs   # PORTA schema+dados do SQLite local para o Supabase (drop+recria)
node scripts/migrate-users-phone-password.mjs   # adiciona users.phone/must_change_password no Postgres existente
node scripts/migrate-personal-notes.mjs         # cria a tabela personal_notes no Postgres existente
node scripts/build-confissoes.mjs               # regenera lib/confissoes/data/*.json a partir de ../Documentos fonte
npm run seed       # (só SQLite local/dev) recria data/esdras.db
node scripts/demo-meeting.mjs    # (opcional) recria a reunião demo nº 1
```

> O `npm run seed` recria o SQLite local (`data/esdras.db`) — usado como fonte para a migração; o app em execução usa o Postgres do Supabase.

## Arquitetura e convenções

- **Next.js 16** (App Router, Turbopack, RSC). Consulte os docs em `node_modules/next/dist/docs/` antes de escrever código (ex.: `proxy.ts` substitui `middleware.ts`; `params` é `Promise`; layout usa `LayoutProps`).
- **Páginas**: `app/(app)/` (área autenticada). Rotas com dados dinâmicos usam `export const dynamic = "force-dynamic"`.
- **Mutações**: Server Actions em `app/actions/*.ts` — cada ação valida perfil no servidor (`requireRole`/`requireUser` de `lib/auth.ts`) e registra em `audit_logs`. Nunca confiar só no frontend.
- **Banco**: `lib/db.ts` (pg async: `get/all/run/transaction`). Queries usam `?` (convertido em runtime). `run()` retorna `lastInsertRowid` via `RETURNING id`. IDs dos dispositivos são slugs estáveis (`art-1`, `art-4-p2`, `cap-2`); novos usam `novo-<timestamp36>-<rand>`. Datas: string `YYYY-MM-DD HH:MM:SS` (evitar `now()` do Postgres direto — usar `now()` de `lib/db.ts` ou `datetime('now')` que é convertido).
- **Perfis**: centralizados em `lib/permissions.ts` (módulo puro `PERMISSOES`/`rolesCom`/`temPermissao`) — os server actions usam `requireRole(...rolesCom("..."))`, nunca listas de roles hardcoded. `admin` (tudo, corrige extração, auditoria/admin só dele), `coordenador` (redação de trabalho, status, reuniões, incluir/editar/excluir dispositivos não-originais, mover, renumeração), `membro` (contribuir: sugestões, comentários, pendências, referências, votos; e revisar atas). Auditoria e Administração visíveis **somente para admin**. Controle de concorrência da redação (§41) via `lib/version-guard.ts` (`avaliarConflito`).
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
- `lib/seed-data/*.json` — Estatuto registrado estruturado por capítulo (fonte dos dados)
- `lib/legal-refs.ts` — guia curado de técnica legislativa (LC 95/1998) e redação oficial (MRPR); usado nos prompts de IA e na página `/guia-redacao` (`components/guia/*`)
- `lib/confissoes/` — biblioteca doutrinária: `data/*.json` (textos gerados por `scripts/build-confissoes.mjs`), módulos por documento (metadados), `recuperacao.ts` (busca por trechos para IA); página `/documentos` (`components/documentos/*`)
- `scripts/seed.mjs` — cria o banco a partir dos JSONs