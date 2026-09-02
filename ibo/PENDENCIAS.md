# PENDÊNCIAS DE PAUTA — ESDRAS

Pauta de trabalho para o próximo agente/dev. Estado do projeto: **MVP funcional e rodando** (Next.js 16 + SQLite local). Especificação: `../PRD_ESDRAS.md`.

## Entregas recentes (nesta sessão)

- **Reordenação física de artigos (PRD §17 — 2ª etapa)**: mover artigos entre capítulos/seções/raiz e reordenar irmãos (`parent_id`/`ordem_pai`), com validação de hierarquia/ciclos em módulo puro (`lib/reorder-core.ts`), ação `moveProvision` (auditoria + evento de reunião), UI em `/renumeracao` e 18 testes novos (Vitest, total 31).
- Base limpa: removido o **seed da proposta inicial** (erro de projeto) — origem agora é só `original | novo`; raiz = Estatuto registrado (Cap. I–VI + Art. 27 dissolução + Cap. VII), artigos 1º–33.
- **Editor de texto rico** (zero dependência) em Redação/Proposta/Justificativa; versionamento grava o texto salvo; navegação estrutural com colapse; helpers por campo; revogar original; contador por artigos.
- **§18 Referências cruzadas — UI**: vincular/desvincular dispositivos (card na tela do dispositivo).
- **§17 Renumeração — 2ª etapa**: botão "Aplicar numeração" (confirmação + auditoria + evento de reunião). Obs.: grava números conforme a ordem ATUAL da árvore; a reordenação física entre capítulos é etapa separada.
- **§31 IA "Comparar versões"** (compara redação de trabalho x vigente).
- **Votação de sugestões** (`votes.suggestion_id`) — consulta aos membros em cada sugestão.
- **§23 Aprovar dispositivo dentro da reunião** (atalho na tela da reunião).
- **§29 Ata — retificação**: ata aprovada fica bloqueada; correções viram retificação (nova tabela `minutes_retifications`).
- **Auditoria — paginação** (100/página).
- **§33 Análise de coerência com IA** (página /coerencia, só alerta).
- **Testes automatizados** (Vitest, 13 testes: renumeração + sanitização de rich text) — `npm test`.
- **Migração Supabase**: backend agora é **Postgres** (`lib/db.ts` → `pg` async; conversor SQLite→Postgres em runtime). `scripts/migrate-to-pg.mjs` porta schema+dados (idempotente). App verificado end-to-end contra o Supabase.
- Groq: `GROQ_API_KEY` preenchida; `.env.local` com `DATABASE_URL` (shared pooler IPv4).

## 1. Decisões pendentes do usuário (perguntar antes de implementar)

- [ ] **Supabase Auth/RLS/Realtime** (PRD §37–43) — backend já está em **Postgres (Supabase)** com auth local (JWT). Opcional evoluir para Supabase Auth + RLS + Realtime; requer Service Role key/decidir escopo.
- [ ] **Deploy Vercel** — configurar env vars no painel Vercel (`DATABASE_URL`, `SESSION_SECRET`, `GROQ_API_KEY`) e publicar.
- [ ] **Nomes reais dos 9 membros da comissão** — usuários seed são fictícios. Editar no painel Admin ou via SQL no Postgres.

## 2. Funcionalidades previstas no PRD, ainda não implementadas

- [x] **Renumeração** (PRD §17): simulador + "Aplicar numeração" (números + auditoria) + **reordenação física de artigos entre capítulos** (mover, com validação e auditoria).
- [x] **Análise de coerência com IA** (PRD §33): página `/coerencia`, só alerta.
- [ ] **Supabase Auth/RLS/Realtime** (evolução do backend já migrado para Postgres).
- [ ] **Votação formal da comissão** (votação consultiva de sugestões já implementada).
- [ ] **Importação de novos documentos** (PRD §36): requer definição do formato de entrada (PDF/texto) antes de implementar.

## 3. Melhorias conhecidas / dívidas técnicas

- [x] **Testes automatizados** — Vitest, 42 testes (renumeração, sanitização rich text, reordenação, **versão/conflito §41 e perfis**). Perfis centralizados em `lib/permissions.ts` (usado pelos actions).
- [x] **Deploy Vercel** — backend migrado para Supabase Postgres (`pg`); falta só publicar (env vars + deploy).
- [x] **Numeração/ordem final dos dispositivos novos** — mecanismo completo: mover artigo para a posição desejada e "Aplicar numeração" (item §17 acima).
- [ ] **`docs/` ou wiki do projeto** — manter `AGENTS.md` atualizado a cada mudança relevante.
- [x] **Índices/paginação de auditoria** — paginação implementada (100/página).
- [ ] **Append de eventos em `meeting_events`** — log factual e não editável (PRD §24) — comportamento já correto; não adicionar edição.

## 4. Documentação/observações de código

- `components/status-badge.tsx` centraliza as cores semânticas de status — usar sempre lá, não hardcode.
- `ConfirmDialog` (`components/confirm-dialog.tsx`) substituiu todos os `window.confirm` — usar para novas exclusões.
- Ao alterar `lib/schema.sql`, avaliar se o banco existente precisa de migração (`scripts/migrate-*.mjs`) além do seed.
- Editor rico: `components/rich-text-editor.tsx` (contenteditable + execCommand), sanitização em `lib/rich-text.ts` — colar/formatar passa pelo sanitizer.
- Módulos puros (sem banco) para cliente: `lib/provision-label.ts`, `lib/renumeracao-core.ts`, `lib/rich-text.ts` — não importar `lib/db.ts`/`lib/data.ts` em componentes client.

## 5. Como rodar e verificar

```bash
npm run lint && npm run build   # sempre antes de concluir uma tarefa
npm run seed                    # recria o banco (pare o dev antes, no Windows)
npm run dev                     # http://localhost:3000
```

Fluxo de aceite (PRD §47): entrar → selecionar artigo → ler vigente → ler proposta → sugerir → discutir → fundamentar → alterar redação → aprovar → registrar decisão em reunião → gerar ata → histórico → estatuto consolidado.