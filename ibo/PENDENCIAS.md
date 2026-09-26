# PENDÊNCIAS DE PAUTA — ESDRAS

Pauta de trabalho para o próximo agente/dev. Estado do projeto: **MVP completo e rodando em produção** (Next.js 16 + Supabase Postgres). Especificação: `../PRD_ESDRAS.md`.

> Registro obrigatório para continuidade da reformulação: `docs/registro-reformulacao-mesa-2026-09-22.md`. Ele consolida decisões, arquitetura de rotas, terminologia, compatibilidades, publicação e cuidados com o banco compartilhado entre preview e produção.

## 1. Decisões do usuário (já tomadas — não implementar)

- [x] **Supabase Auth/RLS/Realtime** — **DECIDIDO**: autenticação fica como está (JWT local). Sistema temporário, sem necessidade de complexificar. Realtime já implementado (Broadcast + Presence, sem Auth/RLS). Não migrar para Supabase Auth/RLS. **Atualização (26/09/2026):** a decisão permanece (sem Supabase Auth e sem policies por perfil); porém o acesso público via PostgREST foi fechado nas seis tabelas que nasceram sem RLS — RLS deny-all + revogação de `anon`/`authenticated` (`scripts/migrate-rls-hardening.mjs`, aplicado em produção e verificado com probe HTTP 401).
- [x] **Deploy Vercel** — concluído (em produção: `esdrasibo.vercel.app`).
- [x] **Nomes reais dos 9 membros** — já cadastrados pelo usuário.

## 2. Funcionalidades previstas no PRD — status final

- [x] **Renumeração** (PRD §17): simulador + "Aplicar numeração" + **reordenação física de artigos entre capítulos** (mover, com validação e auditoria).
- [x] **Análise de coerência com IA** (PRD §33): página `/coerencia`, só alerta.
- [x] **Realtime** (PRD §40): Broadcast (refresh automático) + Presence (Modo Reunião).
- [x] **Votação** — **DECIDIDO**: não haverá votação controlada no sistema; a aprovação formal será a assinatura da comissão na proposta final.
- [x] **Importação de novos documentos** (PRD §36) — **DECIDIDO**: desnecessária (importação inicial via seed já cobre).

## 3. Melhorias conhecidas / dívidas técnicas

- [x] **Visualizador comparativo (`/revisao`)** — versões anterior e atual emparelhadas, todas as etapas, filtros/busca/capítulos, diferenças textuais e mudanças estruturais. Metadados originais por identidade a partir dos JSONs de importação, sem migração; testes de seleção de texto, novos/revogados, ordem, numeração e diff.

- [x] **Testes automatizados** — Vitest, 77 testes (renumeração, sanitização rich text, reordenação, versão/conflito §41, perfis, telefone, guia de redação, biblioteca doutrinária, filtro do painel por anotação, manual).
- [x] **Deploy Vercel** — em produção.
- [x] **Numeração/ordem final dos dispositivos novos** — mecanismo completo (mover + aplicar numeração).
- [x] **Índices/paginação de auditoria** — paginação implementada (100/página).
- [x] **`meeting_events`** — log factual e não editável (PRD §24) — comportamento já correto.
- [x] **Guia de redação legislativa** — LC 95/1998 + Manual de Redação da Presidência curados em `lib/legal-refs.ts`; IA de redação enriquecida; `action: duvida` e `action: valida_tecnica` (checklist no editor); página `/guia-redacao`. Sem mudança de banco.
- [ ] **`docs/` ou wiki do projeto** — manter `AGENTS.md`/`PENDENCIAS.md` atualizados (contínuo).
- [x] **Rascunho, Em construção e Comparativo** — implementado. Aba Análise com **Rascunho comparativo** em 3 colunas (vigente/referência/proposta) + destaque de diferenças; `/consolidado` como **Estatuto em construção** (modos construção/aprovados, selos novo/revogado, `era X`, filtros); nova página **`/comparativo`** (quadro final com diff, tipo de alteração, justificativa, filtros e export); painel com filtro "Somente com pendências" e "Continuar de onde parou". Menu Reforma renomeado. Testes Vitest 141.
- [x] **Acompanhamento móvel dos membros** — `/comparativo` agora abre uma leitura dispositivo por dispositivo, com redação atual, vigente, proposta inicial, justificativa e pendências; contribuições por sugestão, comentário, pendência ou anotação pessoal. O quadro comparativo anterior permanece no segundo modo da mesma tela. Menu renomeado para **Acompanhamento** e aba **Subsídios** da Mesa renomeada para **Apoio à redação**.
- [x] **Consolidação da navegação por perfil** — membros recebem o fluxo enxuto **Acompanhamento → Proposta em construção**; coordenador e administrador também recebem Mesa e ferramentas técnicas agrupadas. `/revisao` foi removida do menu, mas preservada como compatibilidade. O menu móvel ganhou separação temática.
- [x] **Trabalho na proposta (UX de numeração/ordem/referências)** — implementado. Painel/revisão/navegação com **modo Proposta** (cookie `esdras_versao`, padrão proposta): número do **documento original** + chip `era X` (vigente) + aviso `ordem: Y` quando a ordem divergir. `/renumeracao`: **Ordenar pela numeração do documento** (por capítulo), relatório de capítulos, **Aplicar numeração** (artigos+capítulos) com **pendências automáticas** para aprovados renumerados/movidos. Referências internas assistidas (painel no dispositivo + lista global; atualização confirmada, com versão/auditoria; `texto_vigente` histórico e textos copiados do documento ficam fora). **Consolidado e exportações** passam a usar a ordem/numeração da proposta (aprovados; exclui revogados; avisa quando a numeração diverge da ordem). Ambiente de teste local em Docker (`scripts/dev-db.mjs`, `scripts/copiar-banco.mjs`, `.env.development.local`). Testes Vitest 136.
- [x] **Literatura de consulta (`/literatura`)** — implementada. Biblioteca **no Postgres** (`library_books`/`library_sections`), sem depender de editar código para acrescentar livros: o admin importa **.md/.txt/.epub** (ou texto colado) em `/admin/literatura`; o parse roda no navegador e a prévia é revisável (renomear/fundir/excluir). Leitura com sumário + busca (coluna `busca` normalizada) e consulta IA com toggle de fonte (`livros`/`documentos`/`tudo`; `action: consulta_doutrinaria` com `fonte`). Permissão `gerenciar_biblioteca` (admin). PDFs são convertidos localmente por `scripts/pdf-epub-para-md.py` (pdfplumber + pdftotext) em `../Literatura de consulta/md-limpos`; carga inicial via `scripts/import-literatura.mjs` (6 livros). Testes Vitest 120.
- [x] **Biblioteca doutrinária (`/documentos`)** — implementada. Decisões do usuário: **Filadélfia 1742 removida**; incluídos os demais documentos batistas de `documentos-de-fe.md` (Declaração Doutrinária da CBB, Princípios Batistas e Pacto das Igrejas Batistas); **Declaração de Fé da Igreja Local ignorada** (projeto posterior). Total: 6 documentos. Dados gerados por `scripts/build-confissoes.mjs` (lê `../Documentos fonte`) em `lib/confissoes/data/*.json` (só `itens`); metadados nos módulos de `lib/confissoes/`; `recuperacao.ts` com `buscarTrechos`/`montarContextoConsulta` (controla tokens); `action: consulta_doutrinaria` no `/api/ai`; página `/documentos` com leitura por seções + busca (`components/documentos/biblioteca.tsx`) e consulta IA (`components/documentos/consulta-form.tsx`); nav + proxy protegido. Sem mudança de banco.
- [x] **Manual, onboarding e ajuda** — implementado. Manual de utilização (`lib/manual.ts`, 17 seções; página `/manual` com busca; item "Manual" no tema Consulta; proxy protegido). Assistente de ajuda IA (`action: ajuda` no `/api/ai`, responde com base no manual). Botão flutuante "Ajuda" (`components/help/*`). Onboarding: modal de boas-vindas no 1º acesso + card "Primeiros passos" no painel (`components/onboarding/*`), estado persistido em **localStorage por usuário** (sem migração de banco).
- [x] **PWA** — implementado. Instalável: `app/manifest.ts` (manifest; ícones PNG 192/512/maskable/Apple gerados por `scripts/generate-icons.mjs` a partir de `public/icon.svg` e `icon-maskable.svg`), service worker `public/sw.js` (rede-primeiro em navegações, cache-primeiro em estáticos, nunca cacheia `/api/*`, fallback `offline.html`), registro em produção via `components/pwa-register.tsx`, `viewport`/`appleWebApp`/tema no `app/layout.tsx`.
- [x] **Mesa de Trabalho por capítulo** — ambiente funcional em `/mesa-trabalho`, integrado à árvore documental real. Reúne navegação de capítulos, leitura contínua, seleção contextual, comparação com o vigente, consulta aos subsídios, status e inclusão explícita de capítulos, seções e subordinados. Redação e colaboração funcionam em diálogos dentro da Mesa; o editor possui conclusão editorial explícita, confirmação, consolidação da versão de trabalho e reabertura controlada. A reorganização inclui seleção de destino/posição e prévia completa da renumeração. A tela clássica do dispositivo fica como consulta e contingência, com retorno ao mesmo contexto. Sem migração de banco.
- [x] **Edição de títulos na Mesa** — ao selecionar capítulo ou seção, o painel contextual oferece **Editar título**. A ação altera somente o título estrutural da proposta, preserva número e posição, registra auditoria e atualiza as demais visualizações.

- [x] **Simplificação de aprovação e reuniões** — removidas as interfaces e ações acessíveis de votação e deliberação formal. O status técnico legado `aprovado` aparece como **Redação concluída** e apenas congela a cópia editorial da proposta. Reuniões recebem presença, registros manuais e atas; dados antigos de deliberação permanecem somente como histórico legado. A aprovação formal ocorrerá pela assinatura da comissão no documento final enviado à assembleia.
- [x] **Responsividade (PRD §42)** — auditado e ajustado: grids do simulador de renumeração e da reordenação ganharam `overflow-x-auto` (móvel/tablet); demais telas já usavam `flex-wrap`/`sm:`/`lg:`/Sheet no mobile; `input/textarea/select` ≥16px no mobile (globals.css) evita zoom do iOS. Aprovado em desktop/notebook/tablet/smartphone.
- [x] **Mesa: estrutura por título e exclusão/revogação** — capítulos e seções passam a ser editados apenas pelo **título** (o texto de corpo pertence aos artigos); a criação de nó estrutural exige título e dispensa texto; seção é renderizada como cabeçalho no Consolidado e na exportação. A Mesa ganhou **Excluir** (itens novos, com confirmação e aviso de exclusão em cascata dos filhos) e **Revogar/Desfazer revogação** (originais), com seleção automática do item anterior; `deleteProvision` e `setAlteracaoTipo` passaram a revalidar Mesa, Acompanhamento, revisão e renumeração. Testes Vitest 153.

## 3.1 Conformidade com o PRD (auditoria de 04/09/2026)

Todos os requisitos do PRD estão cobertos (MVP §46 = 21/21; módulo Reuniões §21–29; IA §30–33; Consolidação/Exportações §34–35; Realtime §40; Concorrência §41; Responsividade §42; Segurança §43). Decisões registradas: autenticação local JWT (§38), votação consultiva (§13), importação via seed (§36), Supabase RLS fora de escopo (§43, decidido). Sem pendências de PRD em aberto.
- [x] **Refatorar `app/actions/provision.ts` (525 ln) e `components/provision/provision-forms.tsx` (944 ln)** — **CONCLUÍDO**: extração em módulos de domínio. Actions: `redacao.ts` (154), `dispositivos.ts` (254), `colaboracao.ts` (175), `state.ts` (tipo `ActionState`), com `provision.ts` como barrel (29). Componentes: `submit-btn.tsx`, `status-control.tsx`, `admin-forms.tsx`, `suggestion-forms.tsx`, `comment-forms.tsx`, `pending-forms.tsx`, `reference-form.tsx`, `vote-buttons.tsx`, `historical-text-editor.tsx`, `justificativa-editor.tsx`, `relation-form.tsx`, com `provision-forms.tsx` como barrel (10). Comportamento idêntico (importadores inalterados); lint/build/test 56 verdes.

## 3.2 Mesa de Trabalho 2.0 (23/09/2026) — entregue, homologada e publicada

Fases 1–7 do PRD `../PRD_ESDRAS_MESA_TRABALHO_2_0.md` implementadas, validadas no clone local e homologadas pelo usuário (resumo técnico no `AGENTS.md`).

- [x] **Validação do usuário** no ambiente local (autosave, exclusão reversível, correspondências, marcos, conferência).
- [x] **Migração aplicada no Supabase** em 24/09/2026: `node scripts/migrate-mesa-2-0.mjs` (aditiva e idempotente; contagens de dados inalteradas).
- [x] **Fase 8 do PRD** — corte controlado com a tela clássica como contingência; rollback = reverter o deploy (as colunas/tabelas novas podem ficar, são inertes para o código anterior). Diagnóstico, registro por fase, riscos e rollback em `docs/relatorio-mesa-2-0-2026-09-23.md`.
- Evoluções possíveis (não autorizadas): UI de desmembramento/reunião, automação E2E de conflito/rede e entidade própria de justificativa coletiva com escopo.

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
