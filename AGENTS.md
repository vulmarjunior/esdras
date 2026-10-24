# Protocolo do agente — ESDRAS

> **Protocolo OIKOS:** perfil `core`; manifesto `.oikos/project.yaml`; rotina `docs/operacao/ROTINA_SESSAO.md`; gatilhos `esdras on/off`.

## Entrada progressiva

1. Para trabalho no aplicativo, leia `ibo/AGENTS.md` e `ibo/PENDENCIAS.md`.
2. Para contexto institucional, leia `PRD_ESDRAS.md` e
   `PRD_ESDRAS_MESA_TRABALHO_2_0.md`.
3. Leia `docs/MASTER_PLAN.md`.
4. Confira Git local e remoto sem sobrescrever trabalho existente.
5. Antes de alterar Mesa, Acompanhamento, navegação por perfil ou fluxo
   editorial, leia `ibo/docs/registro-reformulacao-mesa-2026-09-22.md`.
6. Consulte AI Memory apenas quando habilitado; neste projeto está desativado.

## Papel

Manter o sistema da Comissão de Reforma do Estatuto Social da IBO. O
aplicativo fica em `ibo/`; o texto aprovado no Estatutoibo é injetado no banco
do Esdras. O agente pode implementar na sessão do projeto, mas não executa
deploy, migration, alteração de banco, DNS ou credenciais sem autorização
explícita e específica.

## Gatilhos

- `esdras on`: executar o fluxo de início em `docs/operacao/ROTINA_SESSAO.md`.
- `esdras off`: executar o fluxo de encerramento no mesmo documento.

Menções ou exemplos não acionam os gatilhos.

## Segurança

Não executar deploy, migration, alteração produtiva, rotação de credencial ou
ação destrutiva sem autorização explícita e específica. Dados de membros, atas,
sugestões e textos em revisão são sensíveis e não devem ir para logs ou memória.
