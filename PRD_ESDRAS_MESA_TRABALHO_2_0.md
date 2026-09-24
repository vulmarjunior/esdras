# PRD — Esdras: Mesa de Trabalho 2.0

**Versão:** 1.0 · 23/09/2026  
**Repositório:** `vulmarjunior/esdras` · aplicação `ibo/`  
**Estado:** especificação para agente de codificação; implementação não iniciada por este documento.

## 1. Objetivo

Reformular a Mesa de Trabalho para elaborar uma **nova minuta estatutária independente**, com edição contínua do documento e edição individual de artigos, livre criação e reorganização de dispositivos, rastreabilidade em relação ao estatuto vigente, justificativas, salvamento automático, versões recuperáveis e exclusão editorial reversível. Preservar o trabalho existente e aproveitar a arquitetura atual sempre que tecnicamente viável.

A comissão **não aprova definitivamente** o estatuto: elabora e acorda redações para uma proposta a ser submetida à Assembleia. Os marcadores editoriais servem para indicar progresso e **não bloqueiam** novas edições, movimentações, exclusões nem restaurações.

## 2. Decisões funcionais já definidas

1. **Modelo híbrido:** edição direta da minuta integral e modo de edição por artigo, sobre a mesma fonte de dados; modo de comparação contextual.
2. **Estrutura livre:** permitir criar capítulos, seções, artigos, parágrafos, incisos, alíneas e itens, inclusive provisórios, diretamente na posição pretendida.
3. **Justificativas e referências:** opcionais durante a elaboração; conferidas e exigidas, quando pertinentes, antes da consolidação para encaminhamento. Justificativas coletivas são permitidas quando seu alcance estiver identificado.
4. **Salvamento automático:** confirmar sucesso apenas após resposta do servidor; manter versões de redação e marcos integrais da minuta; recuperar sem apagar o histórico.
5. **Marcadores editoriais:** `Em elaboração`, `Em discussão`, `Redação acordada` (ou nomenclatura equivalente de progresso). Nunca implicam aprovação pela Assembleia nem impedem edição. Preservar o registro de concordância e sinalizar alteração posterior sem exigir “reabrir” ou “revogar”.
6. **Exclusão:** registrar e permitir restauração de dispositivo removido da minuta, incluindo descendentes e histórico. Separar *exclusão editorial de rascunho* de *supressão proposta de regra vigente*.
7. **Segurança:** conservar identidades, redações, referências, justificativas, auditoria e permissões; nenhuma migração ou teste destrutivo em produção.

## 3. Diagnóstico do repositório já verificado

- `ibo/app/(app)/mesa-trabalho/page.tsx` carrega árvore da proposta e árvore vigente e instancia `ChapterWorkbench`.
- `ibo/components/workbench/chapter-workbench.tsx` apresenta leitura contínua com `RichTextContent`, mas abre diálogo com `WorkingTextEditor` para editar. A conclusão editorial desabilita o editor e a restauração.
- `ibo/components/provision/working-text-editor.tsx` já usa `RichTextEditor`, ferramentas de IA e verificação de conflito por versão. Salvar é operação manual.
- `ibo/app/actions/redacao.ts`: `updateRedacao` e `restoreRedacaoVersion` rejeitam status interno `aprovado`; `setStatus` copia `redacao_trabalho` para `redacao_consolidada` ao concluir; `provision_versions` armazena revisões individuais.
- `ibo/app/actions/dispositivos.ts`: `moveProposalProvision` movimenta posicionamentos de proposta e registra auditoria; `deleteProvision` executa `DELETE FROM provisions` e pode acionar exclusões em cascata — **não atende à exclusão reversível**.
- `ibo/lib/workbench-move.ts` simula movimentos; `ibo/lib/renumeracao.ts` obtém numeração derivada por `numerarArvore`, distinta de números armazenados.
- `provisions` guarda conteúdo, status, justificativa e versão; `provision_placements` guarda posição, título e número por `version_key` (`vigente`, `proposta`, `consolidada`). Evoluir essas estruturas em vez de recriá-las sem necessidade.
- `ibo/docs/registro-reformulacao-mesa-2026-09-22.md` documenta decisões anteriores e alerta que produção e previews da Vercel compartilham `DATABASE_URL`; testes de escrita no preview podem alterar produção. Há scripts `ibo/scripts/dev-db.mjs` e `ibo/scripts/copiar-banco.mjs` para ambiente local isolado.

**Limite de verificação do banco:** o projeto Supabase identificado na configuração como `uifxkiodgszxzwkyqnpc` retornou erro de permissão na conexão disponível; **o banco real do Esdras não foi auditado diretamente**. Antes de propor migração executável, o agente deve obter acesso autorizado por ambiente seguro, inspecionar somente leitura, verificar schema implantado, constraints, dados, histórico e volumes, sem pedir segredos no chat. Não confundir projetos `ibopvh-producao`/`ibopvh-homologacao` acessíveis em outra conexão com o banco correto do Esdras.

## 4. Requisitos funcionais e critérios de aceitação

### RF-01 — Minuta como documento autônomo

A minuta possui estrutura e conteúdos próprios; o estatuto vigente e a proposta inicial são referências estáveis de consulta. Criar dispositivo não exige correspondente anterior. Suportar correspondências um-para-um, um-para-muitos, muitos-para-um e muitos-para-muitos. **Aceite:** desmembrar um artigo vigente em vários novos sem compartilhar indevidamente conteúdo, status, justificativa ou posição.

### RF-02 — Editor híbrido

Modo documento permite selecionar e editar diretamente conteúdo no fluxo do estatuto; modo artigo amplia a unidade escolhida. Painéis de estrutura e contexto recolhíveis; alternância preserva seleção, conteúdo ainda não confirmado e posição de leitura. Comandos explícitos de inserção normativa, sem criar dispositivo por simples Enter. Preservar IA existente, sem incorporar sugestões automaticamente. **Aceite:** editar dois artigos em sequência e alternar entre modos sem perda ou divergência.

### RF-03 — Hierarquia e operações estruturais

Identidade estável distinta de número e posição. Inserir antes/depois, movimentar entre capítulos/artigos, reorganizar parágrafos/incisos, criar dispositivos provisórios; validar hierarquia no servidor, ciclos, pai, tipo e destino. Movimentos atômicos e auditados. Desmembramento/reunião deverão preservar proveniência e histórico, ainda que a UI avançada seja fase posterior. **Aceite:** mover artigo para capítulo novo e parágrafo para outro artigo preservando identidade e vínculos.

### RF-04 — Numeração e remissões

Exibir numeração derivada da posição atual em todos os modos; tratar parágrafo único/§ 1º/§ 2º; não embutir números como parte editável do conteúdo; sinalizar remissões livres potencialmente desatualizadas; remissões estruturadas apontam a IDs estáveis. **Aceite:** inversão de §§ 2º e 3º atualiza imediatamente a apresentação; nenhuma duplicidade de número na mesma sequência.

### RF-05 — Referências, justificativas e supressões

Permitir vínculos múltiplos ao vigente; diferenciar `não examinado`, `relacionado`, `acréscimo` e casos não aplicáveis. Justificativas em capítulo, artigo ou subdivisão, com escopo explícito. Supressão normativa registrada contra texto vigente mesmo sem dispositivo correspondente novo. Durante redação não bloquear por ausência documental. **Aceite:** consolidar gera lista de pendências e tabela de correspondência sem tratar ausência de vínculo como acréscimo automático.

### RF-06 — Marcadores não bloqueantes

Alterar e restaurar dispositivo acordado sem reabertura formal; capturar qual revisão foi acordada, quando e por quem, conforme permissões atuais, sem inferir deliberação formal. Renderizar texto atual como fonte principal e revisão acordada como marco histórico. **Aceite:** mudança após concordância não deixa visualização presa em `redacao_consolidada` nem impede nova edição.

### RF-07 — Exclusão reversível

Retirar dispositivo da árvore ativa por tombstone/soft delete ou estrutura de arquivamento equivalente que preserve conteúdo e relações. Registrar quem, quando, posição/pai anterior e árvore de descendentes. Restaurar na posição original quando válida, ou escolher novo destino; conflitos exigem intervenção, jamais sobrescrita silenciosa. Bloquear operações que apaguem o texto vigente. **Aceite:** excluir e restaurar capítulo com artigos, parágrafos, referências, justificativas e revisões intactos.

### RF-08 — Autosave e concorrência

Autosave com debounce adequado, fila serializada por unidade editada, resposta com versão confirmada, sinalização de pendente/salvando/salvo/falha. Preservar buffer local em falha; não mudar de modo descartando edição pendente. Usar controle otimista para concorrência; em conflito, permitir revisar e mesclar manualmente, nunca aplicar last-write-wins silencioso. Evitar uma nova revisão histórica para cada tecla: distinguir persistência corrente de checkpoints recuperáveis, com política documentada. **Aceite:** simular interrupção de rede e duas sessões editando mesmo artigo sem perda silenciosa.

### RF-09 — Histórico e marcos integrais

Reutilizar histórico individual; registrar alterações estruturais e exclusões; snapshots íntegros com conteúdo, árvore, número derivável, referências, justificativas, marcadores e proveniência. Restaurar revisão individual como nova revisão e snapshot integral como novo estado recuperável, mantendo o estado anterior. **Aceite:** restaurar snapshot não apaga revisões posteriores e reproduz hierarquia e conteúdo daquele marco.

### RF-10 — Conferência e proposta final

Conferir dispositivos provisórios vazios, hierarquia, números, remissões, correspondências não examinadas, supressões e justificativas pendentes. Separar alertas automáticos de questões de conteúdo dependentes de apreciação humana. Gerar texto integral, correspondência e relação de acréscimos/supressões; proposta à Assembleia não significa aprovação pela Mesa. **Aceite:** conseguir registrar marco da minuta em progresso e gerar proposta final sem confundir concordância da comissão com aprovação definitiva.

### RF-11 — Permissões e integração

Manter checagens de papéis nas Server Actions; acesso visual não substitui autorização no servidor. Manter Acompanhamento, Proposta em construção, editor clássico, sugestões, auditoria, realtime e exportação funcionando durante migração. **Aceite:** membro sem permissão não edita por requisição direta; sugestões não alteram automaticamente minuta.

## 5. Arquitetura: decisões a fechar após auditoria do banco correto

1. Estabelecer unidade canônica de redação da minuta, sem herdar indevidamente estado do texto vigente; reutilizar tabelas existentes se suportarem isolamento efetivo.
2. Definir regra de pertencimento da unidade a cada documento, posição/pai e estado de exclusão. Preservar IDs históricos e mapear IDs novos sem ambiguidade.
3. Definir esquema de correspondências múltiplas, substituindo o vínculo único `origem_ref_id` quando insuficiente, com migração compatível.
4. Definir versionamento estrutural por log de operações, snapshots ou combinação; documentar restauração consistente.
5. Separar persistência frequente de checkpoints, com política de coalescência, idempotência e retenção apropriada; não reduzir proteção a gravação eventual.
6. Definir invariantes de árvore, transações e controle de concorrência; preservar auditoria, cache/revalidação e eventos realtime.
7. Fazer inventário de consumidores legados de `status`, `redacao_consolidada`, `redacao_trabalho`, `numero`, `ordem_pai`, `parent_id` e `alteracao_tipo` antes de alterar semântica ou colunas.

**Não alterar schema de produção nem executar scripts de cópia/reset até confirmar alvo, backup e ambiente isolado.**

## 6. Plano de execução em fases

**Fase 0 — Auditoria e ambiente seguro:** fixar commit-base; inspeção somente leitura do banco correto, inventário de constraints/dados; mapear consumidores e rotas; validar clone local/branch isolada, backup e reversão. Entrega: diagnóstico verificável, esquema alvo, plano de migração, relatório de riscos. Sem isso, não executar fases destrutivas.

**Fase 1 — Independência editorial:** remover bloqueio por `aprovado` no servidor e na UI, desacoplar texto atual da cópia `redacao_consolidada`, manter revisão previamente acordada, compatibilizar visualizações legadas. Testar mudanças pós-concordância.

**Fase 2 — Exclusão reversível:** implementar tombstone/arquivo com restauração de subárvore, integridade e auditoria; substituir caminhos de `DELETE` editorial. Testar cascatas, referências e restauração com colisão de destino.

**Fase 3 — Modelo de minuta e migração experimental:** evoluir schema aproveitando `provisions`/`provision_placements`; habilitar dispositivo independente, provisório e correspondências múltiplas; elaborar migração idempotente e executar primeiro no clone. Não interpretar automaticamente propostas alternativas como artigos distintos, nem ausência de correspondência como supressão.

**Fase 4 — Estrutura e numeração:** unificar renderização de números derivados, criar inserção contextual e movimentação completa, validar parágrafo único e remissões, preservar IDs; manter módulo legado de renumeração como ferramenta de conferência enquanto houver dependências.

**Fase 5 — Editor híbrido:** refatorar `ChapterWorkbench` em componentes menores e conectados ao mesmo estado; edição direta no documento, modo artigo e comparação; integrar recursos de IA existentes; implementar autosave e controle de conflitos antes de considerar a UI utilizável.

**Fase 6 — Histórico integral:** completar auditoria estrutural, checkpoints/snapshots integrais, comparação e restauração segura; evidenciar integridade pós-restauração.

**Fase 7 — Documentação e conferência:** referências múltiplas, justificativas hierárquicas, supressões, pendências, correspondência e exportação; compatibilizar Acompanhamento e Proposta em construção.

**Fase 8 — Migração final e corte controlado:** comparar clone antes/depois, testar com dados reais anonimizados quando apropriado, corrigir ambiguidades; manter tela anterior como contingência; preparar plano de rollback. Aplicar migração de produção somente em etapa de publicação autorizada, com backup verificado.

## 7. Gate obrigatório por fase

Para cada fase: registrar arquivos alterados, decisões e eventuais desvios do PRD; criar/atualizar testes unitários e de integração; executar `git diff --check`, testes do projeto e build; verificar regressões em Mesa, Acompanhamento, Consolidado e tela clássica; atualizar documentação. Não declarar a fase concluída com testes pendentes ou falhas ignoradas.

**Cenários mínimos de aceite ponta a ponta:** criar capítulo no meio; inserir artigo provisório; editar diretamente dois artigos; mover artigo e parágrafo; renumerar parágrafo único e múltiplos; editar redação acordada; salvar e restaurar revisão; excluir/restaurar subárvore; falha de rede e conflito de duas sessões; vincular um antigo a dois novos; propor supressão distinta de exclusão editorial; gerar relatório de pendências e versão integral; migrar dados existentes sem perder histórico.

## 8. Orientações expressas ao agente

- Trabalhar incrementalmente no repositório, com PRs/commits revisáveis e sem reescrever recursos existentes sem justificativa técnica.
- **Não inventar resultado de consulta ao banco:** projeto Supabase do Esdras identificado, mas acesso direto ainda não autorizado nesta conversa. Resolver acesso por conexão segura antes da auditoria de dados e da migração.
- Não executar testes de escrita no preview compartilhado com produção nem pedir segredos via chat.
- Não confundir marcador editorial com aprovação da Assembleia; não adicionar bloqueios de edição por status.
- Não usar exclusão física para a operação editorial; manter recuperação histórica verificável.
- Não considerar um editor visualmente contínuo suficiente se persistência, identidade e numeração continuarem divergentes.
- Ao final, produzir relatório de implementação e validação, migrações e instruções seguras de publicação/rollback.

**Resultado esperado:** a comissão elabora uma proposta independente, com liberdade editorial, estrutura normativa consistente, rastreabilidade histórica e recuperação de dados, sem repetir operações burocráticas a cada mudança de redação.
