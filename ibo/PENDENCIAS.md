# PENDÊNCIAS DE PAUTA — ESDRAS

Pauta de trabalho para o próximo agente/dev. Estado do projeto: **MVP completo e rodando em produção** (Next.js 16 + Supabase Postgres). Especificação: `../PRD_ESDRAS.md`.

## 1. Decisões do usuário (já tomadas — não implementar)

- [x] **Supabase Auth/RLS/Realtime** — **DECIDIDO**: autenticação fica como está (JWT local). Sistema temporário, sem necessidade de complexificar. Realtime já implementado (Broadcast + Presence, sem Auth/RLS). Não migrar para Supabase Auth/RLS.
- [x] **Deploy Vercel** — concluído (em produção: `esdrasibo.vercel.app`).
- [x] **Nomes reais dos 9 membros** — já cadastrados pelo usuário.

## 2. Funcionalidades previstas no PRD — status final

- [x] **Renumeração** (PRD §17): simulador + "Aplicar numeração" + **reordenação física de artigos entre capítulos** (mover, com validação e auditoria).
- [x] **Análise de coerência com IA** (PRD §33): página `/coerencia`, só alerta.
- [x] **Realtime** (PRD §40): Broadcast (refresh automático) + Presence (Modo Reunião).
- [x] **Votação** — **DECIDIDO**: votação consultiva é suficiente (não implementar votação formal).
- [x] **Importação de novos documentos** (PRD §36) — **DECIDIDO**: desnecessária (importação inicial via seed já cobre).

## 3. Melhorias conhecidas / dívidas técnicas

- [x] **Testes automatizados** — Vitest, 50 testes (renumeração, sanitização rich text, reordenação, versão/conflito §41, perfis, telefone).
- [x] **Deploy Vercel** — em produção.
- [x] **Numeração/ordem final dos dispositivos novos** — mecanismo completo (mover + aplicar numeração).
- [x] **Índices/paginação de auditoria** — paginação implementada (100/página).
- [x] **`meeting_events`** — log factual e não editável (PRD §24) — comportamento já correto.
- [ ] **`docs/` ou wiki do projeto** — manter `AGENTS.md`/`PENDENCIAS.md` atualizados (contínuo).
- [ ] **Refatorar `app/actions/provision.ts` (525 ln) e `components/provision/provision-forms.tsx` (944 ln)** — quebrar em módulos por domínio (sugestões, pendências, referências, votos, ações de dispositivo). Precedente criado: `app/actions/notes.ts` + `components/provision/personal-note-form.tsx`. Fazer como tarefa separada, com testes de aceite, sem risco para o MVP em produção.

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