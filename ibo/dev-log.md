# Dev Log — ESDRAS (ibo)

> Documentação viva de descobertas técnicas. Atualizada automaticamente durante o desenvolvimento.
> **Stack**: Next.js 16.3.4 (App Router, Turbopack, RSC) · React 19 · TypeScript · Tailwind 4 · Supabase Postgres (`pg`) · better-sqlite3 (só scripts) · Groq API · Vitest
> **Última atualização**: 2026-09-02

---

## ✅ O que Funciona

### DB / Migração

#### Supabase Postgres via shared pooler (IPv4)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: migração do backend de SQLite local para Supabase; o host direto falhava.
- **Solução**: usar a connection string do **shared pooler** (Session pooler, porta 5432): `postgresql://postgres.<project-ref>:<senha>@aws-0-<regiao>.pooler.supabase.com:5432/postgres`. Conexão testada (`SELECT version()` → PostgreSQL 17.6) e app rodando 100% nela.
- **Observações**: o pooler aceita IPv4 sem add-on pago. O "Dedicated IPv4 address" é add-on de US$ 4/mês (Pro Plan) — desnecessário.

#### Camada de dados `pg` async em `lib/db.ts` com conversão de dialeto SQLite→Postgres
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: reescrita do backend para `pg` mantendo as queries existentes com `?`.
- **Solução**: conversor em runtime em `lib/db.ts`: `?`→`$1..$n` (fora de strings), `datetime('now')`→`to_char(now(),'YYYY-MM-DD HH24:MI:SS')`, `INSERT OR IGNORE`→`INSERT ... ON CONFLICT DO NOTHING`, `lastInsertRowid` via `RETURNING id` no `run()`, `transaction()` com client dedicado (BEGIN/COMMIT/ROLLBACK) e `txClient` roteando as queries.
- **Observações**: validado por smoke test com transação + ROLLBACK (INSERT RETURNING, upsert parcial de votos, ON CONFLICT DO NOTHING, CTE recursivo, default de data). E2E com JWT real: painel, dispositivo, renumeração, admin, reuniões — todas 200.

#### Script de migração `scripts/migrate-to-pg.mjs`
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: portar schema + dados do SQLite para o Postgres.
- **Solução**: script idempotente (DROP TABLE IF EXISTS em ordem reversa + DDL + carga), `SET session_replication_role = replica` para carregar ignorando FKs (requer superuser — ok com usuário `postgres`), `setval` por tabela (pula `provisions`, que tem PK TEXT). 130 registros migrados (9 usuários, 120 dispositivos, 1 audit).
- **Observações**: datas permanecem TEXT no mesmo formato do SQLite (a UI faz `new Date(x + "Z")`); defaults de coluna usam `to_char(now(),...)`.

#### better-sqlite3 12.11.1 no Node 24 (Windows)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: `npm install` falhava ao compilar o módulo nativo (sem VS Build Tools).
- **Solução**: fixar `better-sqlite3@12.11.1` — tem binário pré-compilado para ABI 137 (Node 24, win32-x64). A v13.x não publica prebuilds e exige toolchain C++.
- **Observações**: movido para `devDependencies` (usado só por scripts) — o app roda em `pg`.

### Editor de Texto

#### Editor rico zero-dependência (contenteditable + execCommand)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: campos de texto com negrito/itálico/sublinhado/destaque sem adicionar biblioteca.
- **Solução**: `components/rich-text-editor.tsx` com: conteúdo NÃO controlado pelo React durante a digitação (sync via `useEffect` só quando sem foco — evita cursor invertido); seleção salva (`onSelect/onMouseUp/onKeyUp`) e restaurada antes do `execCommand` (evita formatar o texto todo); colagem interceptada para texto puro (`insertText`); destaque implementado manualmente com `<mark>` (wrap/unwrap por Range) — toggle confiável; "Limpar formatação" substitui a seleção por texto puro.
- **Observações**: sanitização server-safe em `lib/rich-text.ts` (allowlist de tags textuais + `background-color`; normaliza `&nbsp;`/espaços/`<br>` nas bordas). HTML armazenado é string TEXT comum.

### Funcionalidades PRD

#### Tela do dispositivo em abas
- **Status**: ✅ Implementado
- **Data**: 2026-09-02
- **Contexto**: a tela de análise do dispositivo empilhava ~14 seções numa rolagem única, pouco funcional.
- **Solução**: `components/provision/device-tabs.tsx` (client) agrupa as seções em 4 abas — **Análise** (status + texto vigente/proposta/redação/justificativa/consolidada), **Colaboração** (sugestões + opinião + comentários), **Pendências & Fundamentos**, **Histórico & Referências** — com barra sticky e contadores. Ações de admin (novo/editar/excluir/revogar) viraram um bloco `<details>` "Administração" no topo (só coordenador/admin). `app/(app)/dispositivo/[id]/page.tsx` agora só busca dados e delega a coluna direita ao `DeviceTabs`.
- **Observações**: os painéis ficam **sempre montados** (alternância via `hidden` CSS), então o texto não salvo no editor é preservado ao trocar de aba. Tab switching é estado local (`useState`), sem navegação/`searchParams` — evita remount.

#### Realtime (Broadcast + Presence) — PRD §40
- **Status**: ✅ Implementado (broadcast = refresh automático; presence = quem está online no Modo Reunião). Auth/RLS continuam não usados (não exigidos por Broadcast/Presence).
- **Data**: 2026-09-02
- **Contexto**: pedido do usuário — só o Realtime interessava (dos 3 serviços Supabase). Implementado sem Supabase Auth nem RLS.
- **Solução**: `@supabase/supabase-js` (v2). `lib/realtime.ts` (server-only): publica evento `refresh` no canal `esdras-realtime` via Broadcast (no-op se as env vars `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` faltarem). `components/realtime-bridge.tsx` (client): ouve o canal e chama `router.refresh()` — preserva estado client/digitação em andamento. Publicação ligada nas server actions de provision/meetings/renumeracao. `components/meetings/meeting-presence.tsx`: Presence por reunião (`esdras-presence-<id>`), mostra quem está com a tela da reunião aberta.
- **Observações**: server-side usa a chave publishable (pública, segura) + WebSocket outbound; falha de rede no publish é silenciosa (best-effort). `router.refresh()` (e não reload) é o que garante não perder texto não salvo. Para ativar em produção: setar as duas env `NEXT_PUBLIC_*` no Vercel (feito via CLI).

#### Troca de senha obrigatória no 1º acesso + telefone/WhatsApp
- **Status**: ✅ Implementado (migração aplicada no Supabase pelo usuário via SQL Editor)
- **Data**: 2026-09-02
- **Contexto**: pedido do usuário — forçar troca de senha no primeiro login e cadastro de telefone com link para WhatsApp.
- **Solução**: colunas `users.must_change_password` (default 0) e `users.phone` (schema.sql, migrate-to-pg.mjs e script de migração incremental). JWT ganhou claim `mc` (`createSession(userId, { mustChange })`); `proxy.ts` redireciona para `/trocar-senha` enquanto o claim estiver ativo; `(app)/layout.tsx` faz a checagem no banco (cobre sessões antigas sem claim); `requireUser` lança `Troca_senha_necessaria` (bloqueia mutations). Página `app/trocar-senha` (fora do grupo `(app)` para evitar loop de redirect) com form de troca (senha atual + nova + confirmação, mínimo 8, auditada pela sessão). Admin: `createUser` grava `must_change_password=1`; redefinir senha reativa a obrigação. Telefone: módulo puro `lib/phone.ts` (normaliza para `55+DDD+número`, formata e gera `https://wa.me/...`); campo no Admin (cadastro/edição), link WhatsApp na lista de usuários e na presença da reunião; `updateMyPhone` para autosserviço. Testes: `tests/phone.test.ts` (8) — total 50.
- **Observações**: sessões antigas (JWT sem claim `mc`) são tratadas pelo layout via consulta ao banco; após a troca a sessão é reemitida sem o claim. `setMyName` foi substituído por `updateMyPhone` (não era usado).

#### Perfis centralizados + controle de concorrência testados (42 testes)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-02
- **Contexto**: pauta PENDENCIAS.md — expandir testes para versão/conflito (§41) e perfis (§4).
- **Solução**: `lib/permissions.ts` (puro): mapa `PERMISSOES` por permissão → roles, `rolesCom()`/`temPermissao()`. Os 4 arquivos de server actions passaram a usar `requireRole(...rolesCom("..."))` (sem listas hardcoded; `removeProvisionRelation` alinhado a `vincular_dispositivos` — antes era `requireUser`). `lib/version-guard.ts` (puro) com `avaliarConflito(esperada, atual)` usado em `updateRedacao`. Novos testes: `permissions.test.ts` (7) e `version-guard.test.ts` (4).
- **Observações**: E2E com JWT admin/membro confirmou os gates: membro recebe redirect (307) em `/renumeracao`, `/admin`, `/auditoria`; admin 200 em tudo.

#### Renumeração §17 (simulador + aplicar)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: realocação de artigos muda a numeração de todos os subsequentes.
- **Solução**: página `/renumeracao` com simulador (reordena, calcula números, detecta referências "Art. N" nos textos — heurística `/arts?\.?|artigos?\s+(\d+)/`) e botão "Aplicar numeração" (grava `numero` na ordem atual + auditoria + evento de reunião, com confirmação).
- **Observações**: referências nunca reescritas automaticamente (regra §17).

#### Reordenação física §17 — 2ª etapa (mover artigos entre capítulos)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-02
- **Contexto**: faltava persistir `parent_id`/`ordem_pai` para realocar artigos entre capítulos.
- **Solução**: módulo puro `lib/reorder-core.ts` (`podeMover` com a hierarquia existente, `inserirApos`, `validarMovimento` com proteção de ciclo); server action `moveProvision` em `app/actions/provision.ts` (valida, renumera `ordem_pai` dos irmãos afetados, auditoria + evento de reunião, no-op detectado); UI `components/renumeracao/reorder.tsx` na página `/renumeracao` (mover artigos para capítulos/seções/raiz ou reordenar entre irmãos); 18 testes novos em `tests/reorder-core.test.ts` (total 31).
- **Observações**: capítulos permanecem na raiz (regra do `createProvision`); hierarquia `artigo→[paragrafo,inciso,alinea]` vale para o movimento; `ordem` global segue apenas como desempate (`ordem_pai` é a ordem real entre irmãos). O fluxo recomendado: mover → "Aplicar numeração".

#### Demais entregas: referências cruzadas (§18), votação de sugestões, aprovar na reunião (§23), retificação de ata (§29), IA comparar versões (§31), coerência IA (§33), auditoria paginada, testes Vitest (13)
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: fechamento das lacunas do PRD apontadas no PENDENCIAS.md.
- **Observações**: `votes` já suportava `suggestion_id`; tabela `minutes_retifications` criada via `schema.sql` (aplicada no `getDb()` — sem re-seed, preservando dados do usuário).

### Deploy / E2E

#### Sessão JWT para teste HTTP
- **Status**: ✅ Confirmado
- **Data**: 2026-09-01
- **Contexto**: validar páginas autenticadas sem UI.
- **Solução**: assinar JWT com `jose` (`SignJWT({sub:"1"})` com `SESSION_SECRET`) e enviar no cookie `esdras_session`; páginas retornam 200 com os dados do Postgres.
- **Observações**: marcador de texto em HTML pode vir separado por `<!-- -->` (React) — não usar regex ingênuo de substring em testes.

---

## ❌ O que Não Funciona

### DB / Migração

#### Conexão direta `db.<project-ref>.supabase.co`
- **Status**: ❌ Confirmado que falha
- **Data**: 2026-09-01
- **Contexto**: primeira `DATABASE_URL` apontava para o host direto.
- **Problema**: o host resolve **somente AAAA (IPv6)**; em rede IPv4 → `getaddrinfo ENOTFOUND` no Node.
- **Alternativa conhecida**: usar o shared pooler (`aws-0-<regiao>.pooler.supabase.com:5432`) ou o add-on pago IPv4.

#### better-sqlite3 13.0.3 (npm)
- **Status**: ❌ Confirmado que falha
- **Data**: 2026-09-01
- **Problema**: sem binários pré-compilados (releases sem assets); `node-gyp rebuild` exige Visual Studio C++ → falha em máquina sem toolchain.
- **Alternativa conhecida**: fixar 12.11.1 (prebuilds).

#### `desc` como alias de CTE no Postgres
- **Status**: ❌ Confirmado que falha
- **Data**: 2026-09-01
- **Contexto**: `WITH RECURSIVE desc AS (...)` no `deleteProvision` (funcionava no SQLite).
- **Problema**: `syntax error at or near "desc"` — `DESC` é palavra reservada no Postgres.
- **Alternativa conhecida**: renomear o alias (usado `sub`).

#### `now()` do Postgres em coluna TEXT
- **Status**: ❌ Confirmado que falha
- **Data**: 2026-09-01
- **Problema**: `now()` gera texto com fuso (`... .123456+00`), quebrando `new Date(x + "Z")` da UI.
- **Alternativa conhecida**: `to_char(now(), 'YYYY-MM-DD HH24:MI:SS')` (aplicado no conversor e nos defaults do DDL de migração).

---

## 🔄 Correções de Registro

#### Art. 27 (dissolução) e a raiz do Estatuto
- **Antes**: interpretou-se que a dissolução não existia no original e os artigos 28–33 estavam deslocados.
- **Depois**: o PDF registrado confirma **Art. 27 = dissolução no original**, como artigo **solto na raiz** (sem capítulo próprio, entre o Cap. VI e o Cap. VII); Disposições Gerais é arts. 28–33. O capítulo "Da Dissolução" era criação da *proposta*.
- **Data da correção**: 2026-09-01
- **Motivo**: investigação no PDF `Estatuto IBO (Registrado)_ocred (1).pdf` (pdftotext) + referências internas nos textos.

#### Seed da proposta inicial
- **Antes**: base importava a proposta de reforma via seed (origem `proposta_inicial`).
- **Depois**: **removido por decisão do usuário** (erro de projeto). Origem agora é só `original | novo`; a proposta é inserida manualmente no campo "Proposta inicial".
- **Data da correção**: 2026-09-01
- **Motivo**: decisão explícita do usuário ("usar esse seed foi um erro de projeto").

#### Contador "analisados" do painel
- **Antes**: negativo (`-121 de 33`) — misturava total de artigos (33) com contagem de todos os dispositivos (154).
- **Depois**: `getStatusCounts()` escopado a `type='artigo'`.
- **Data da correção**: 2026-09-01
- **Motivo**: bug reportado pelo usuário.

---

## 💡 Padrões Descobertos

#### Módulos puros separados para client components
- **Regra**: nunca importar `lib/db.ts`/`lib/data.ts` em componente `"use client"` — arrasta melhor-sqlite3/pg para o bundle do navegador e quebra o build. Manter funções puras em módulos próprios.
- **Aplica-se a**: componentes client do Next.
- **Exemplo**: `lib/provision-label.ts`, `lib/renumeracao-core.ts`, `lib/rich-text.ts` (sem imports de banco).
- **Fonte**: erro de build `module-not-found better-sqlite3 [Client Component Browser]`.

#### contenteditable: nunca controlar o DOM durante a digitação
- **Regra**: com contenteditable, atualizar `innerHTML` via React a cada keystroke move o caret para o início (digitação invertida). Sincronizar o valor externo só quando o editor está **sem foco** (via ref + effect).
- **Aplica-se a**: `components/rich-text-editor.tsx`.
- **Fonte**: bug "caixa digitando de trás pra frente".

#### Datas como string canônica `YYYY-MM-DD HH:MM:SS`
- **Regra**: manter colunas de data como TEXT com esse formato (a UI faz `new Date(x + "Z")`). Nunca usar `now()`/timestamp do Postgres diretamente em colunas lidas pela UI; usar `to_char(now(), 'YYYY-MM-DD HH24:00...')` — na prática `to_char(now(), 'YYYY-MM-DD HH24:MI:SS')` — ou `now()` de `lib/db.ts`.
- **Aplica-se a**: schema/migração/queries de datas.
- **Fonte**: validação de migração e smoke tests.

#### Conversão de dialeto SQLite→Postgres centralizada
- **Regra**: manter as queries com `?` e deixar `lib/db.ts` converter em runtime (incl. `INSERT OR IGNORE` e upserts `ON CONFLICT(...) WHERE ...` com índice parcial — suportado no Postgres com predicado idêntico). Evita reescrever dezenas de queries.
- **Aplica-se a**: `lib/db.ts`.
- **Fonte**: migração de backend.

#### Schema evolutivo sem re-seed
- **Regra**: novas tabelas/colunas devem entrar em `lib/schema.sql` (aplicado em cada conexão via `getDb()`) e, quando alteram estrutura existente, em script de migração — nunca depender de re-seed, que apaga dados do usuário.
- **Aplica-se a**: qualquer mudança de schema.
- **Fonte**: criação de `minutes_retifications` sem perder os textos digitados.

---

## 📋 Decisões de Arquitetura

#### Backend = Supabase Postgres via `pg` (não Supabase JS/Auth por enquanto)
- **Escolha**: `lib/db.ts` com `pg` + `DATABASE_URL` (shared pooler). Autenticação continua local (JWT `jose` + bcrypt). Deploy alvo: Vercel.
- **Alternativas rejeitadas**: Supabase Auth/RLS/Realtime agora (exige Service Role key e escopo maior); manter SQLite (não roda na Vercel).
- **Data**: 2026-09-01

#### Datas TEXT (não timestamptz)
- **Escolha**: portar datas como TEXT no formato existente para não quebrar a UI (`new Date(x + "Z")`).
- **Alternativas rejeitadas**: timestamptz nativo + refatorar toda a UI.
- **Data**: 2026-09-01

#### Editor rico zero-dependência
- **Escolha**: contenteditable + execCommand com sanitização própria, sem nova lib.
- **Alternativas rejeitadas**: TipTap/Lexical (bundle/complexidade), markdown (menos amigável).
- **Data**: 2026-09-01

#### Renumeração: aplicar números na ordem atual; mover entre capítulos é etapa separada
- **Escolha**: "Aplicar numeração" grava `numero` + auditoria conforme a ordem atual da árvore; reordenação física (`parent_id`) fica para feature dedicada.
- **Alternativas rejeitadas**: aplicar reordenação global de artigos entre capítulos automaticamente (ambíguo e arriscado).
- **Data**: 2026-09-01

#### better-sqlite3 em devDependencies
- **Escolha**: app 100% `pg`; SQLite fica só nos scripts (seed/migração) em devDependencies.
- **Alternativas rejeitadas**: manter em dependencies (build nativo falharia na Vercel).
- **Data**: 2026-09-01

---

## ⚠️ Armadilhas Conhecidas (Gotchas)

- **Supabase**: host direto `db.<ref>.supabase.co` é IPv6-only; use sempre o shared pooler (Session, 5432) em redes IPv4/Vercel.
- **pg**: tudo é assíncrono — a camada `lib/db.ts` inteira virou async e todos os actions/páginas precisaram de `await`; o typecheck do `next build` é o guia para achar os pontos faltantes.
- **Postgres**: `desc` é reservada (não usar como alias de CTE); `INSERT OR IGNORE` não existe (usar `ON CONFLICT DO NOTHING`); `ON CONFLICT` com índice parcial exige predicado idêntico ao índice.
- **Turbopack build**: após um build que falhou, limpar `.next` (erros internos tipo `TurbopackInternalError ... AssetContent::file was canceled`).
- **PowerShell 5.1**: `node -e` com aspas/`<>`/`*` quebra — preferir arquivos temporários `.cjs/.mjs` fora do projeto (com `require` de caminho absoluto p/ módulos do projeto).
- **Vercel**: manter `better-sqlite3` fora de `dependencies` (nativo); env vars: `DATABASE_URL`, `SESSION_SECRET`, `GROQ_API_KEY`.
- **React RSC em teste de string**: textos interpolados podem vir separados por `<!-- -->` no HTML — não usar substring simples como marcador.
- **`next dev` e `.env.local`**: mudanças de env só valem após reiniciar o dev.
