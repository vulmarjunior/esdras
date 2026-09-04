# PLANO — Biblioteca doutrinária (`/documentos`)

> **Status: IMPLEMENTADO** (ver `PENDENCIAS.md` e `lib/confissoes/`). Ajustes do usuário aplicados:
> **Confissão da Filadélfia (1742) removida**; incluídos os demais documentos batistas de
> `documentos-de-fe.md` (Declaração Doutrinária da CBB, Princípios Batistas e **Pacto das Igrejas Batistas**);
> **Declaração de Fé da Igreja Local ignorada** (será trabalhada em outro projeto).

Feature a implementar na próxima sessão. Contexto: PRD §15.3 "Fundamento doutrinário"
menciona "Declaração Doutrinária; princípios batistas; documentos confessionais utilizados
pela comissão". Complementa a `references_tb` (tipo `doutrinaria`) com os textos integrais
para consulta. Reutiliza o padrão do guia de redação (`lib/legal-refs.ts`, `/guia-redacao`).

## Passo 0 — Insumo (usuário fornece)
Textos em português em uma pasta (sugerido: `Documentos fonte/Confissões/` — .txt/.md/.docx)
ou colados no chat. Documentos previstos:

1. Declaração Doutrinária da Convenção Batista Brasileira
2. Declaração de Princípios Batistas
3. Confissão Batista de Londres (1689)
4. Confissão de New Hampshire (1833)
5. Confissão da Filadélfia (1742)
6. Fé e Mensagem Batista (2000) — somente a versão 2000 (decisão do usuário)

Se algum documento não tiver divisões claras, usar a estrutura natural do texto.

## Passo 1 — Dados: `lib/confissoes/` (módulos puros, sem banco)
- `index.ts` exporta `CONFISSOES` + um arquivo por documento (`londres-1689.ts`,
  `new-hampshire-1833.ts`, `filadelfia-1742.ts`, `fe-mensagem-2000.ts`,
  `cbb-declaracao.ts`, `principios-batistas.ts`).
- `recuperacao.ts`: função pura `buscarTrechos(pergunta)` — tokeniza a pergunta, pontua
  seções por correspondência de termos e retorna as top-N seções + resumos dos documentos
  (controla tokens; Londres 1689 é grande demais para injetar inteira).
- Estrutura do documento: `{ id, nome, ano, origem, resumo, itens: [{ titulo, conteudo }] }`.

## Passo 2 — Página `/documentos` (todos os membros)
- `app/(app)/documentos/page.tsx` (server, `force-dynamic`, `getSessionUser` + redirect).
- `components/documentos/biblioteca.tsx` (client): lista de documentos → leitura por seções
  (acordeão) → busca no texto.
- `components/documentos/consulta-form.tsx` (client): campo de pergunta → `/api/ai`
  (`action: consulta_doutrinaria`) → resposta com citação de confissão e seção.

## Passo 3 — IA de consulta doutrinária
- `/api/ai/route.ts`: novo `action: consulta_doutrinaria`. Injetar contexto recuperado por
  `buscarTrechos` + resumos. System prompt: responder APENAS com os documentos fornecidos,
  citando confissão e seção; declarar quando não houver cobertura (não inventar).
- Regra PRD §32: IA assistiva, resposta rotulada, sem alteração automática.

## Passo 4 — Navegação e proteção
- `components/app-nav.tsx`: item "Documentos doutrinários" (ícone `BookMarked`).
- `proxy.ts`: adicionar `/documentos` a `PROTECTED_PREFIXES` e ao `matcher`.
- (Opcional) Link "Ver documentos confessionais" no card de Fundamentação doutrinária
  da aba do dispositivo (`components/provision/device-tabs.tsx`).

## Passo 5 — Testes
- `tests/confissoes.test.ts`: estrutura dos 6 documentos + `buscarTrechos` (ex.: "batismo"
  → encontra seção de batismo em Londres 1689 e NH 1833).

## Passo 6 — Docs e verificação
- Atualizar `AGENTS.md` e `PENDENCIAS.md`.
- `npm run lint && npm run build && npm test`.