# Registro da reformulação da Mesa de Trabalho — 22/09/2026

Este documento registra as decisões, alterações, compatibilidades e orientações de continuidade da sessão que reformulou o fluxo editorial do ESDRAS. Deve ser lido antes de modificar a Mesa de Trabalho, o Acompanhamento, a Proposta em construção, a navegação por perfil ou o fluxo de conclusão editorial.

## 1. Estado da entrega

- Alterações publicadas em produção em `https://esdrasibo.vercel.app`.
- PR principal: `https://github.com/vulmarjunior/esdras/pull/1`.
- Commit consolidado da reformulação: `937dc73e35af9fa8ab6b71e228d82ade0a2a2020`.
- Correção posterior para edição de títulos na Mesa: `e4f4a4debf13c5baad3f8cb5ba8518c0d7559ff4`.
- Validação realizada: 24 arquivos de teste, 149 testes aprovados e build de produção do Next.js concluído.
- Não houve migração de schema nesta entrega.

## 2. Decisões funcionais aprovadas

### 2.1 Aprovação da proposta

O sistema não controla votação nem aprovação formal da comissão. A aprovação formal ocorrerá com a assinatura da comissão no documento final encaminhado à assembleia.

O código legado `status = aprovado` foi preservado por compatibilidade, mas a interface o apresenta como **Redação concluída**. Esse estado significa apenas que o texto editorial está pronto para integrar a proposta final. Ao concluir, a redação de trabalho é copiada para `redacao_consolidada`; para voltar a editar, é necessário reabrir.

Não reintroduzir votação, quórum ou deliberação formal sem nova decisão expressa do usuário.

### 2.2 Reuniões e atas

O módulo de reuniões serve para presença, pauta, registros factuais e eventual ata. Novas atas são formadas com esses dados. Registros antigos de deliberação permanecem apenas como histórico legado.

### 2.3 Tela inicial e tela clássica

O usuário decidiu manter o Painel inicial como está por enquanto. A tela clássica do dispositivo também deve permanecer como paradigma, consulta e contingência durante a consolidação da Mesa. Não remover nem redesenhar essas superfícies sem nova autorização.

## 3. Arquitetura de uso aprovada

### Mesa de Trabalho — `/mesa-trabalho`

Ambiente principal do coordenador/relator para trabalhar por capítulo durante as reuniões:

- capítulos à esquerda;
- leitura contínua do capítulo no centro;
- painel contextual à direita;
- seleção de capítulo, seção ou dispositivo sem mudar de página;
- inclusão de capítulos, seções e dispositivos subordinados;
- redação em diálogo ampliado, com justificativa, versionamento e conclusão editorial;
- colaboração em diálogo próprio;
- reorganização estrutural com destino, posição e prévia dos efeitos de renumeração;
- links para a tela clássica quando histórico ou recursos de contingência forem necessários.

Ao selecionar capítulo ou seção, o painel oferece **Editar título**. A action `updateProvisionTitle` altera apenas o título da placement da proposta, preserva número e posição, registra auditoria, revalida as visualizações e publica evento realtime.

Arquivos centrais:

- `app/(app)/mesa-trabalho/page.tsx`
- `components/workbench/chapter-workbench.tsx`
- `components/workbench/approval-control.tsx`
- `lib/workbench-move.ts`
- `app/actions/dispositivos.ts`
- `app/actions/redacao.ts`

### Acompanhamento — `/comparativo`

Tela principal dos membros da comissão, com abordagem mobile-first e dois modos:

1. **Acompanhar a reforma** — um dispositivo por vez, com redação atual/parcial, vigente, proposta inicial, justificativa, pendências, status, tipo de alteração e correspondência de numeração.
2. **Quadro comparativo** — preserva a visão geral, filtros, diferenças textuais e exportação.

O botão **Contribuir** permite sugestão de redação, comentário, pendência e anotação pessoal. Essas contribuições não alteram automaticamente a redação da comissão.

Arquivos centrais:

- `app/(app)/comparativo/page.tsx`
- `components/comparativo/acompanhamento.tsx`
- `components/comparativo/quadro-comparativo.tsx`
- `lib/comparativo-core.ts`

### Proposta em construção — `/consolidado`

Leitura contínua do documento que está sendo formado. O modo padrão mostra a proposta completa; o modo `?modo=aprovados` mostra apenas redações concluídas. Essa rota não substitui a Mesa nem o Acompanhamento.

### Rota legada de revisão — `/revisao`

Permanece funcional por compatibilidade, mas foi removida do menu por sobreposição com o Acompanhamento. Não excluir nem redirecionar sem validação posterior do usuário.

## 4. Navegação por perfil

O menu é filtrado visualmente em `components/app-nav.tsx`:

- **membro:** Acompanhamento e Proposta em construção;
- **coordenador e administrador:** também veem Mesa de Trabalho, Pendências, Renumeração e Coerência;
- **administrador:** mantém Auditoria e Administração.

O menu mobile é separado por temas. A ocultação no menu não equivale a bloqueio de rota; as permissões de mutação continuam obrigatoriamente validadas nas Server Actions. Caso se deseje proibir a abertura direta de rotas, isso deverá ser tratado como decisão separada.

## 5. Numeração e movimentação

A identidade do dispositivo é estável. Número, posição e parentesco da proposta são tratados pelas placements e pela ordem estrutural; não criar um novo dispositivo apenas porque um artigo mudou de número.

Exemplo aprovado: o antigo art. 5º pode ser movido para a posição do art. 26. Os artigos intermediários passam a ocupar os números seguintes quando a numeração for aplicada. A movimentação deve usar `moveProposalProvision` e a renumeração deve continuar no fluxo próprio de `/renumeracao`.

A edição de título na Mesa não deve modificar número, ordem ou posição sugerida.

## 6. Terminologia visível

- `aprovado` → **Redação concluída**;
- `aceita` → **Incorporada**;
- `aceita_parcialmente` → **Incorporada parcialmente**;
- `rejeitada` → **Não incorporada**;
- aba **Subsídios** → **Apoio à redação**;
- menu **Comparativo** → **Acompanhamento**;
- **Estatuto em construção/Em construção** → **Proposta em construção**.

Os códigos internos legados foram mantidos. Evitar renomeá-los no banco sem plano de migração e compatibilidade.

## 7. Banco e ambientes

Produção e previews do Vercel utilizam o único `DATABASE_URL` disponível no projeto. Portanto, qualquer gravação feita em um preview altera o mesmo banco utilizado pela produção. Navegação e leitura são seguras; testes fictícios de escrita em preview não são isolados.

Para testes completos sem afetar dados reais, usar o ambiente local documentado:

- `node scripts/dev-db.mjs`
- `node scripts/copiar-banco.mjs --reset`
- `.env.development.local` apontando para o Postgres local.

Antes de criar outro preview destinado a testes de escrita, providenciar banco separado ou branch de banco e configurar `DATABASE_URL` específica para Preview.

## 8. Diretrizes para alterações futuras

1. Preservar a separação: **Mesa redige**, **Acompanhamento consulta e contribui**, **Proposta em construção apresenta o documento completo**.
2. Não transferir todas as funções da tela clássica para a Mesa automaticamente; integrar apenas o que fizer sentido no fluxo da reunião.
3. Toda mutação deve validar permissão no servidor, registrar auditoria, revalidar as rotas afetadas e publicar realtime quando aplicável.
4. Alterações estruturais devem preservar IDs e histórico.
5. Não misturar conclusão editorial com aprovação formal.
6. Manter responsividade mobile, especialmente no Acompanhamento e nos diálogos de contribuição.
7. Após alterações em TSX, revisar práticas React; antes de publicar, executar `git diff --check`, `npm test -- --run` e `npm run build`.
8. Como o preview compartilha o banco de produção, não executar teste destrutivo ou gravação fictícia no ambiente remoto.

## 9. Melhorias futuras não aprovadas como obrigatórias

- sincronizar em tempo real o dispositivo selecionado pelo redator com os celulares dos membros;
- bloquear por rota, e não apenas pelo menu, o acesso de membros à Mesa e às ferramentas;
- redirecionar ou remover definitivamente `/revisao`;
- reformular o Painel inicial por perfil.

Esses itens são possibilidades, não pendências autorizadas. Solicitar decisão do usuário antes de implementá-los.
