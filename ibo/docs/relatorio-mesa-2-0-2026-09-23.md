# Relatório — Mesa de Trabalho 2.0 (Fase 0 e gate por fase)

**Data:** 23/09/2026 (migração de produção aplicada em 24/09/2026)
**PRD:** `PRD_ESDRAS_MESA_TRABALHO_2_0.md`
**Estado:** Fases 1–7 implementadas, validadas e homologadas pelo usuário; migração aplicada em produção antes do deploy, sem perda de dados.

## 1. Diagnóstico do banco (Fase 0)

Inspeção **somente leitura** do banco apontado por `.env.local` (Supabase, Postgres 17.6), sem escrita:

- Schema implantado idêntico a `scripts/schema-postgres.sql`; nenhum drift além das colunas de migrações incrementais (`users.deleted_at`, `provisions.origem_ref_id/sem_origem`).
- Volumes: 129 dispositivos, 120 placements vigentes, 129 da proposta, **0 consolidados**, 91 versões, 423 registros de auditoria, 2 pendências, 5 votos, 10 usuários, 6 livros/405 seções.
- FKs relevantes confirmadas com `ON DELETE CASCADE` para `provisions` (placements, versions, sugestões, comentários, pendências, notas, referências, relações) — motivo pelo qual a exclusão editorial não pode ser física.
- Consumidores mapeados: Mesa (`app/(app)/mesa-trabalho`, `components/workbench/*`), Acompanhamento (`app/(app)/comparativo`), Proposta em construção (`app/(app)/consolidado`), tela clássica (`app/(app)/dispositivo/[id]`), exportação (`app/api/export`), renumeração, coerência, pendências.
- Ambiente seguro: clone Docker `esdras-pg` (porta 5433) via `scripts/dev-db.mjs` + `scripts/copiar-banco.mjs --reset`; `.env.development.local` tem precedência sobre `.env.local` no `npm run dev`. Produção e previews compartilham o mesmo `DATABASE_URL` — nenhum teste de escrita foi feito no remoto.

## 2. Esquema alvo e migração

`scripts/migrate-mesa-2-0.mjs` (aditiva e idempotente; `--local` usa `.env.development.local`):

1. `provisions.deleted_at` / `deleted_by` — tombstone (RF-07).
2. `provisions.type` CHECK + `'item'` (RF-03, LC 95/1998).
3. `provision_correspondences` — vínculos múltiplos tipados + declarações de acréscimo/não aplicável (RF-01/RF-05), com índices únicos parciais.
4. `document_snapshots` (JSONB) — marcos integrais (RF-09).
5. `provisions.acordo_version` / `acordo_em` / `acordo_por` — concordância não bloqueante (RF-06).

Nenhuma coluna, tabela ou registro é apagado. `lib/schema.sql`, `scripts/schema-postgres.sql`, `scripts/migrate-to-pg.mjs` e a lista do `scripts/copiar-banco.mjs` foram sincronizados.

**Ordem de publicação executada:** homologação do usuário no clone → `node scripts/migrate-mesa-2-0.mjs` em produção (verificado: 5 colunas novas, CHECK com `item`, 2 tabelas novas; contagens inalteradas — 129 dispositivos, 249 placements, 91 versões, 423 auditorias, 10 usuários) → commit e push (deploy). A migração é aditiva e pode ser revertida por `DROP` dos objetos novos sem afetar os dados existentes.

## 3. Registro por fase (gate §7)

| Fase | Arquivos principais | Decisões / desvios |
|---|---|---|
| 1 | `app/actions/redacao.ts`, `components/workbench/approval-control.tsx`, `chapter-workbench.tsx`, `app/actions/state.ts`, `lib/data.ts`, `lib/comparativo-core.ts`, `app/api/export/route.ts`, `components/provision/device-tabs.tsx` | `aprovado` deixou de bloquear; texto atual = `redacao_trabalho`; concordância registrada em colunas novas. **Desvio:** terminologia visível mantém "Redação concluída/acordada" sem renomear códigos legados. |
| 2 | `app/actions/dispositivos.ts`, `lib/data.ts`, `components/workbench/chapter-workbench.tsx`, `components/provision/admin-forms.tsx` | Exclusão vira tombstone; restauração na posição original ou novo destino em conflito; poda de subárvores em `getProposalTree`. **Desvio:** a tela clássica também passou a permitir retirar dispositivos originais (soft delete), antes bloqueado. |
| 3 | `lib/correspondencias.ts`, `app/actions/correspondencias.ts`, `components/workbench/correspondence-panel.tsx`, `lib/types.ts`, `lib/reorder-core.ts`, `lib/tree-order.ts`, `lib/numeracao.ts`, `lib/provision-label.ts`, `lib/labels.ts`, `components/consolidado/estatuto-view.tsx`, `components/provision/admin-forms.tsx` | `item` em toda a hierarquia; vínculos múltiplos tipados; acréscimo/não aplicável sem vínculo. **Desvio:** `origem_ref_id`/`sem_origem` foram mantidos como anotação do chip "era N" (o PRD previa substituir "quando insuficiente"). |
| 4 | `app/actions/dispositivos.ts` (`createProvision` com `afterId`), `components/provision/admin-forms.tsx`, `components/workbench/chapter-workbench.tsx` | Inserção início/posição/fim com renumeração de irmãos; botões Inserir antes/depois. |
| 5 | `components/provision/working-text-editor.tsx`, `components/rich-text-editor.tsx`, `components/workbench/document-row.tsx`, `lib/workbench-node.ts`, `components/workbench/chapter-workbench.tsx` | Autosave com debounce de 1,5 s, fila serializada, indicador de estado, buffer em localStorage, conflito com revisão manual; editor inline no documento + modo artigo. **Desvio:** `ChapterWorkbench` foi reduzido (helpers puros em `lib/workbench-node.ts`, linha do documento e painéis em componentes próprios), mas os diálogos grandes permanecem no arquivo. |
| 6 | `app/actions/marcos.ts`, `lib/marcos-core.ts`, `components/marcos/marcos-panel.tsx`, `app/(app)/marcos/page.tsx` | Marcos com restauração não destrutiva (marco de segurança automático) e **comparação com o estado atual** (RF-09). |
| 7 | `lib/conferencia-core.ts`, `app/(app)/conferencia/page.tsx`, `components/conferencia/remissao-links.tsx`, `app/api/export/route.ts`, `app/(app)/comparativo/page.tsx`, `components/comparativo/acompanhamento.tsx`, `lib/manual.ts` | Conferência com alertas separados de conteúdo; remissões livres vinculáveis a IDs estáveis; exportação de correspondências/acréscimos/supressões; Acompanhamento exibe vínculos e justificativas de escopo. **Desvio:** justificativas continuam por nó, com escopo exibido a partir dos ancestrais (não há entidade própria de justificativa coletiva). |
| 8 | este relatório, `AGENTS.md`, `PENDENCIAS.md` | Corte controlado documentado; tela clássica preservada como contingência. |

**Itens do PRD deliberadamente não implementados nesta rodada** (com justificativa no próprio PRD):
- UI dedicada de desmembramento/reunião — RF-03 admite "fase posterior"; a proveniência é registrada pelos tipos `desmembrado`/`incorporado` nas correspondências.
- Simulação real de queda de rede e duas sessões simultâneas — coberto por testes unitários (`version-guard`, fila) e validação manual; não há automação de browser no projeto.

## 4. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Migração no banco compartilhado com previews | Script aditivo/idempotente, testado 3× no clone; nenhum DROP/UPDATE destrutivo |
| Código antigo em produção com schema novo | Colunas/tabelas novas são ignoradas pelo código anterior; deploy e migração podem ser revertidos independentemente |
| Autosave sobrescrever trabalho de outra sessão | Controle otimista por `version` + painel de conflito com texto do servidor e escolha explícita |
| Restauração de marco apagar trabalho recente | Marco de segurança automático antes de aplicar; dispositivos criados depois são retirados de forma reversível |
| Exclusão física acidental | Nenhum caminho editorial usa `DELETE FROM provisions`; restauração disponível |

**Rollback:** reverter o deploy (código anterior funciona com o schema novo); as estruturas novas podem permanecer. Se necessário, `DROP` dos objetos novos é possível sem afetar dados existentes.

## 5. Evidências de validação

- `npm test -- --run`: **182 testes** (29 arquivos), incluindo numeração de itens, correspondências, conferência, marcos, nós do workbench e concorrência.
- `npm run build` e `npm run lint`: verdes; `git diff --check`: limpo.
- Migração no clone: caminho `ALTER` (schema antigo simulado), idempotência (2ª execução) e schema novo (`copiar-banco --reset` com 1.340 registros reais).
- Teste funcional SQL no clone (transação com ROLLBACK): vínculo, declaração, snapshot JSONB, tombstone e insert de `item`.
- Smoke test autenticado (`npm run dev` contra o clone): `/mesa-trabalho`, `/conferencia`, `/marcos`, `/consolidado`, `/comparativo`, `/renumeracao` e `?type=correspondencias` → HTTP 200.

## 6. Pendências residuais

1. ~~Validação funcional do usuário no clone~~ — concluída (homologada).
2. ~~Aplicação da migração em produção~~ — concluída e verificada em 24/09/2026 (Fase 8); o deploy acompanha o push.
3. Evoluções possíveis: UI de desmembramento/reunião, automação E2E de conflito/rede, entidade de justificativa coletiva com escopo próprio.
