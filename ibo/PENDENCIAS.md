# PENDÊNCIAS DE PAUTA — ESDRAS

Pauta de trabalho para o próximo agente/dev. Estado do projeto: **MVP funcional e rodando** (Next.js 16 + SQLite local). Especificação: `../PRD_ESDRAS.md`.

## 1. Decisões pendentes do usuário (perguntar antes de implementar)

- [ ] **Migração para Supabase** (PRD §37–43): PostgreSQL, Auth, RLS, Realtime, Storage. O usuário ainda não decidiu quando. Quando for feito: cadastro de usuários continua no painel de Admin, mas criando no Supabase Auth + perfil em `profiles`; trocar `lib/auth.ts`/`lib/db.ts` por camada Supabase; portar `lib/schema.sql` (manter `ordem_pai`!).
- [ ] **Nomes reais dos 9 membros da comissão** — os usuários seed são fictícios (`Membro 1`…`Coordenadora`). Coletar com o usuário e atualizar `scripts/seed.mjs`.
- [ ] **Chave Groq** — usuário tem a chave, mas o serviço estava indisponível; `GROQ_API_KEY` continua vazia em `.env.local`. Modelo padrão atual: `openai/gpt-oss-120b` (o `llama-3.3-70b-versatile` foi descontinuado em 16/08/2026 — fallback em `app/api/ai/route.ts`).

## 2. Funcionalidades previstas no PRD, ainda não implementadas

- [ ] **Renumeração automática** (PRD §17): ordenar dispositivos, atribuir numeração final, **alertar** sobre referências internas afetadas ("Existem 3 referências ao antigo Art. 13…"). Nunca aplicar automaticamente sem confirmação humana.
- [ ] **Análise de coerência com IA** (PRD §33): duplicidades, contradições, nomenclaturas, competências conflitantes, referências internas incorretas — sempre como alerta.
- [ ] **Realtime** (PRD §40): comentários/sugestões/status/eventos de reunião em tempo real (depende da migração Supabase; no SQLite local não há).
- [ ] **Votação de sugestões** (`votes` já suporta `suggestion_id`; a UI de votos cobre só dispositivos) e **votação formal da comissão** (PRD §13 é consultivo — ok como está).
- [ ] **Importação de novos documentos** (PRD §36): hoje a importação é feita manualmente via `lib/seed-data/*.json` + `npm run seed`.

## 3. Melhorias conhecidas / dívidas técnicas

- [ ] **Testes automatizados** — não existe nenhum (nem unitário nem E2E). Candidatos: lógica de versão/conflito, regras de perfil, geração de minuta.
- [ ] **Deploy Vercel** (PRD §37): `.env.local` com `SESSION_SECRET` forte em produção; `better-sqlite3` funciona no servidor local, mas o deploy na Vercel exige definir `DATABASE_PATH`/estratégia (ou a migração Supabase antes).
- [ ] **Aprovar dispositivo dentro da reunião**: hoje a aprovação ocorre na tela do dispositivo e o evento é registrado na reunião ativa (via `logMeetingEvent`); um atalho na tela da reunião seria UX melhor (PRD §23).
- [ ] **Renumeração dos dispositivos novos** — hoje ficam "NOVO" até a consolidação; a numeração definitiva + ordem final é manual (ligada ao item de renumeração acima).
- [ ] **`docs/` ou wiki do projeto** — o `AGENTS.md` resume a arquitetura; manter atualizado a cada mudança relevante.
- [ ] **Índices/consultas de auditoria** — página de auditoria lista até 200 registros; paginação/filtro quando crescer.
- [ ] **Append de eventos em `meeting_events`** — log é factual e não editável (PRD §24) — comportamento já correto; não adicionar edição.

## 4. Documentação/observações de código

- `components/status-badge.tsx` centraliza as cores semânticas de status (badges e dots) — usar sempre lá, não hardcode.
- `ConfirmDialog` (`components/confirm-dialog.tsx`) substituiu todos os `window.confirm` — usar para novas exclusões.
- Ao alterar `lib/schema.sql`, avaliar se o banco existente precisa de migração (`scripts/migrate-*.mjs`) além do seed.
- O `dev.log` na raiz do `ibo/` é lixo de debug — ignorado no git.

## 5. Como rodar e verificar

```bash
npm run lint && npm run build   # sempre antes de concluir uma tarefa
npm run seed                    # recria o banco (pare o dev antes, no Windows)
npm run dev                     # http://localhost:3000
```

Fluxo de aceite (PRD §47): entrar → selecionar artigo → ler vigente → ler proposta → sugerir → discutir → fundamentar → alterar redação → aprovar → registrar decisão em reunião → gerar ata → histórico → estatuto consolidado.