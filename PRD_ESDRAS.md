# PRD — ESDRAS
## Espaço de Sugestões, Deliberações, Revisões, Atas e Sistematização

## 1. Visão geral

Desenvolver uma aplicação web para apoiar os trabalhos da **Comissão de Reforma do Estatuto Social da Igreja Batista Olaria — IBO**, composta atualmente por 9 membros.

O sistema deverá permitir que a comissão analise o Estatuto **dispositivo por dispositivo**, compare a redação vigente com propostas de alteração, apresente sugestões, registre justificativas, fundamentos bíblicos, doutrinários e jurídicos, realize reuniões de trabalho e produza progressivamente uma versão consolidada do novo Estatuto.

A aplicação não será um editor colaborativo semelhante ao Google Docs. O objetivo é criar um **ambiente estruturado de deliberação e consolidação estatutária**, preservando autoria, histórico, versões e decisões.

O Estatuto atualmente registrado possui estrutura em capítulos, artigos, parágrafos e incisos, enquanto a proposta de reforma existente já trabalha comparativamente com “Redação atual”, “Sugestão” e “Justificativa”. Essa lógica servirá como ponto inicial do sistema.

---

# 2. Objetivo principal

Permitir que os membros da comissão possam:

- consultar o texto vigente;
- consultar a proposta inicial de reforma;
- analisar cada dispositivo;
- apresentar sugestões individuais;
- comentar propostas;
- registrar pendências;
- desenvolver uma redação oficial de trabalho;
- fundamentar alterações;
- aprovar dispositivos;
- inserir novos dispositivos;
- registrar reuniões e deliberações;
- gerar atas;
- manter histórico completo;
- produzir automaticamente a versão consolidada do Estatuto.

---

# 3. Princípio fundamental do sistema

O sistema deverá separar claramente:

**Texto vigente → Proposta inicial → Sugestões → Redação de trabalho → Redação consolidada**

Nenhum membro deverá sobrescrever diretamente a contribuição de outro.

As sugestões serão entidades independentes, preservando:

- autor;
- conteúdo;
- data;
- comentários;
- status;
- decisão da comissão.

A **redação oficial de trabalho** será separada das sugestões individuais.

---

# 4. Usuários

O sistema não terá cadastro público.

Os usuários serão previamente cadastrados pelo administrador.

Inicialmente:

**9 membros da Comissão de Reforma.**

## 4.1 Perfis

### Administrador

Pode:

- cadastrar e remover usuários;
- definir permissões;
- importar documentos;
- editar estrutura do projeto;
- criar reuniões;
- configurar aplicação;
- exportar documentos;
- corrigir dados estruturais.

### Coordenador / Relator

Pode:

- editar redações de trabalho;
- consolidar sugestões;
- alterar status de dispositivos;
- aprovar dispositivos;
- reabrir dispositivos;
- iniciar e encerrar reuniões;
- registrar deliberações.

### Membro da Comissão

Pode:

- visualizar todos os dispositivos;
- criar sugestões;
- comentar;
- registrar pendências;
- adicionar fundamentos;
- indicar concordância ou discordância;
- acompanhar reuniões;
- revisar atas.

---

# 5. Estrutura documental

A unidade básica do sistema será denominada:

## Dispositivo estatutário

Um dispositivo poderá ser:

- capítulo;
- seção;
- artigo;
- parágrafo;
- inciso;
- alínea.

Isso permitirá trabalhar adequadamente com alterações estruturais.

Cada dispositivo deverá possuir um identificador interno permanente independente da numeração jurídica.

Exemplo:

```text
UUID: 84fd...
tipo: artigo
numero_atual: 12
numero_final: 14
```

Isso evita problemas quando ocorrer renumeração.

## 5.1 Estrutura hierárquica

A estrutura documental será hierárquica.

Cada dispositivo possuirá um identificador próprio e poderá possuir um `parent_id`.

Exemplos:

```text
Capítulo → Artigo → Parágrafo → Inciso → Alínea
```

ou

```text
Capítulo → Artigo → Inciso
```

Um artigo poderá possuir simultaneamente parágrafos e incisos.

Cada dispositivo filho deverá possuir, de forma independente:

- texto vigente;
- proposta inicial;
- redação de trabalho;
- justificativas;
- sugestões;
- referências;
- histórico;
- status.

Na interface, os dispositivos filhos deverão ser exibidos agrupados sob seu artigo-pai, preservando a leitura natural do Estatuto.

O banco de dados deverá tratar os dispositivos separadamente, mas a interface deverá apresentá-los de forma hierárquica e agrupada.

---

# 6. Origem dos dispositivos

Cada dispositivo deverá possuir uma origem:

### Original

Já existe no Estatuto registrado.

### Proposta inicial

Foi introduzido na proposta preliminar de reforma.

### Novo

Foi criado pela Comissão durante os trabalhos.

---

# 7. Tipos de alteração

Cada dispositivo poderá ser classificado como:

- mantido sem alteração;
- alteração redacional;
- alteração material;
- novo dispositivo;
- revogado;
- desmembrado;
- incorporado a outro;
- reorganizado.

Essas informações deverão posteriormente alimentar relatórios.

---

# 8. Status dos dispositivos

Workflow:

```text
Não iniciado
↓
Em análise
↓
Em discussão
↓
Redação definida
↓
Aprovado
```

Também deverá existir:

```text
Aprovado → Reaberto
```

Um dispositivo poderá ser reaberto caso alterações posteriores provoquem necessidade de revisão.

---

# 9. Tela principal — Painel da Reforma

A página inicial deverá apresentar:

### Identificação

**Reforma do Estatuto Social da Igreja Batista Olaria**

### Progresso

Exemplo:

```text
32 de 68 artigos analisados
47% concluído
```

Indicadores:

- não iniciados;
- em análise;
- em discussão;
- aprovados;
- pendentes.

### Navegação estrutural

Exemplo:

```text
CAPÍTULO I
DA DENOMINAÇÃO, SEDE, NATUREZA E FINS

✓ Art. 1º — aprovado
✓ Art. 2º — aprovado
● Art. 3º — em discussão
○ Art. 4º — não iniciado
```

O usuário deverá clicar no dispositivo para abrir sua área de trabalho.

---

# 10. Tela de análise do dispositivo

A tela deverá apresentar preferencialmente:

## 10.1 Texto vigente

Conteúdo literal do Estatuto registrado.

Não editável.

## 10.2 Proposta inicial

Texto proveniente do documento preliminar de reforma.

Não deverá ser confundido com a redação posteriormente desenvolvida pela comissão.

## 10.3 Redação de trabalho

Versão atualmente considerada pela comissão.

Campo editável apenas por usuários autorizados.

Toda alteração deverá criar nova versão.

## 10.4 Justificativa

Campo destinado à explicação da alteração.

## 10.5 Redação consolidada

Texto aprovado pela comissão.

Após aprovação, fica bloqueado.

---

# 11. Sugestões dos membros

Cada membro poderá selecionar:

**Nova sugestão**

Campos:

- dispositivo relacionado;
- texto sugerido;
- justificativa;
- autor;
- data.

Opcionalmente:

```text
Onde está:
...

Sugiro:
...
```

Cada sugestão terá status:

- aberta;
- em discussão;
- aceita;
- aceita parcialmente;
- rejeitada;
- retirada.

---

# 12. Comentários

Comentários serão diferentes de sugestões.

Servirão para:

- questionamentos;
- observações;
- argumentos;
- alertas;
- referências.

Comentários poderão existir:

- no dispositivo;
- em uma sugestão;
- em uma pendência.

---

# 13. Concordância e discordância

Os membros poderão indicar:

- concordo;
- discordo;
- tenho ressalva.

Isso terá caráter consultivo.

Não será automaticamente considerado votação formal da comissão.

---

# 14. Pendências

Qualquer membro poderá registrar uma:

**Questão pendente**

Categorias:

- jurídica;
- bíblica;
- doutrinária;
- eclesiológica;
- administrativa;
- redação;
- referência cruzada;
- outra.

Exemplo:

> Verificar se esta redação conflita com o artigo sobre competência da Assembleia.

Tela específica deverá permitir consultar todas as pendências abertas.

---

# 15. Fundamentação dos dispositivos

Cada dispositivo poderá possuir fundamentos independentes da redação normativa.

## 15.1 Referências bíblicas

Exemplo:

```text
Mateus 18.15–17
1 Coríntios 5.1–13
Gálatas 6.1
```

Poderão ser associados ao artigo, parágrafo ou outro dispositivo.

## 15.2 Nota de fundamentação bíblica

Campo opcional:

> Textos relacionados ao exercício bíblico da disciplina e restauração.

## 15.3 Fundamento doutrinário

Poderá registrar:

- Declaração Doutrinária;
- princípios batistas;
- documentos confessionais utilizados pela comissão.

## 15.4 Fundamento jurídico

Campo para:

- legislação;
- Código Civil;
- Constituição;
- jurisprudência;
- legislação tributária;
- LGPD;
- outras normas.

## 15.5 Justificativa administrativa ou pastoral

Campo livre.

---

# 16. Inclusão de novos dispositivos

A comissão poderá criar:

- novo capítulo;
- nova seção;
- novo artigo;
- novo parágrafo;
- novo inciso;
- nova alínea.

Novos dispositivos não receberão necessariamente numeração definitiva no momento da criação.

Exemplo:

```text
NOVO-ART-03
```

O sistema registrará:

```text
Posição sugerida:
Após o atual Art. 12
```

Somente na consolidação o sistema deverá propor a numeração definitiva.

---

# 17. Renumeração

O sistema deverá conseguir:

- ordenar dispositivos;
- atribuir numeração final;
- identificar referências internas potencialmente afetadas.

A renumeração nunca deverá modificar o documento final automaticamente sem confirmação humana.

Exemplo:

```text
Atual Art. 13
→ novo Art. 14
```

O sistema deverá alertar:

> Existem 3 referências ao antigo Art. 13 que precisam ser verificadas.

---

# 18. Referências cruzadas

Os dispositivos poderão ser vinculados entre si.

Exemplo:

```text
Art. 18
Relaciona-se com:
Art. 7º
Art. 22
Art. 34
```

Objetivo:

- evitar contradições;
- facilitar revisão;
- detectar renumeração;
- encontrar dependências normativas.

---

# 19. Histórico de versões

Nenhuma alteração relevante deverá destruir uma versão anterior.

Cada versão registrará:

- dispositivo;
- conteúdo;
- autor;
- data/hora;
- versão anterior;
- origem da alteração;
- reunião relacionada, se houver.

Exemplo:

```text
Versão 1
Proposta inicial

Versão 2
Alterada em reunião 03

Versão 3
Aprovada pela comissão
```

---

# 20. Auditoria

Criar trilha permanente de auditoria.

Exemplos:

```text
01/09/2026 19:43
João criou sugestão #18
Art. 12
```

```text
01/09/2026 20:04
Maria comentou sugestão #18
```

```text
01/09/2026 20:18
Relator incorporou sugestão #18
```

```text
01/09/2026 20:21
Comissão aprovou Art. 12
```

---

# 21. Módulo Reuniões, Deliberações e Atas

Este será um módulo central.

## 21.1 Criar reunião

Campos:

- número;
- data;
- horário;
- local;
- pauta;
- coordenador;
- secretário;
- membros esperados.

---

# 22. Modo Reunião

Ao iniciar:

```text
REUNIÃO Nº 04
01/09/2026
19:30

Presentes: 8/9
```

O secretário poderá registrar presença.

---

# 23. Artigo em discussão

Durante a reunião:

```text
ARTIGO EM ANÁLISE

Art. 12

Texto vigente

Redação de trabalho

Sugestões abertas: 3
Pendências: 1
```

Ações:

- aprovar redação;
- manter redação atual;
- incorporar sugestão;
- rejeitar sugestão;
- alterar redação de trabalho;
- criar pendência;
- adiar análise.

---

# 24. Registro automático da reunião

O sistema deverá gerar automaticamente eventos como:

```text
19:42 — Art. 11 aprovado
20:03 — Art. 12 colocado em discussão
20:14 — Sugestão #32 aceita
20:17 — Redação atualizada
20:23 — Art. 12 aprovado
```

Esse registro não deverá ser livremente editável.

Funcionará como log factual da sessão.

---

# 25. Deliberações

Cada decisão poderá gerar um identificador.

Exemplo:

```text
DEC-2026-09-01-004
```

Com:

- reunião;
- dispositivo;
- tipo de decisão;
- texto aprovado;
- responsável pelo registro;
- horário.

Permitirá rastrear:

```text
dispositivo
→ deliberação
→ reunião
→ ata
```

---

# 26. Encerramento da reunião

Ao encerrar:

```text
Reunião encerrada às 21:38

Artigos analisados: 9
Aprovados: 7
Pendentes: 2
Sugestões incorporadas: 11
```

---

# 27. Geração de ata

Botão:

**Gerar minuta da ata**

O sistema utilizará:

- identificação da reunião;
- presentes;
- pauta;
- dispositivos analisados;
- deliberações;
- pendências;
- horário inicial e final.

---

# 28. IA para redação da ata

A IA poderá transformar os registros estruturados em texto formal.

Regra obrigatória:

> A IA deverá utilizar exclusivamente fatos registrados no sistema e não poderá inventar decisões, participantes, horários ou acontecimentos.

A minuta será sempre revisada por pessoa responsável.

---

# 29. Workflow da ata

```text
Rascunho
↓
Em revisão
↓
Aprovada
```

Membros poderão:

- concordar;
- solicitar correção;
- registrar ressalva.

Uma ata aprovada ficará bloqueada.

Correções posteriores deverão gerar retificação.

---

# 30. Inteligência artificial

Fornecedor inicial:

**Groq API**

A IA será exclusivamente assistiva.

Ela não deverá:

- decidir conteúdo;
- aprovar dispositivos;
- alterar textos automaticamente;
- substituir deliberação humana.

---

# 31. Ferramentas de IA

Botões possíveis:

### Revisar gramática

Corrigir:

- ortografia;
- concordância;
- pontuação;
- sintaxe.

### Melhorar clareza

Melhorar o texto sem alterar seu significado.

### Linguagem estatutária

Sugerir formulação mais normativa/formal.

### Simplificar redação

Eliminar redundâncias.

### Comparar versões

Apontar diferenças entre redações.

### Revisar justificativa

Melhorar clareza argumentativa.

### Gerar minuta de ata

Baseada exclusivamente nos registros da reunião.

---

# 32. Regra para IA

Toda resposta gerada deverá aparecer como:

> **Sugestão gerada por IA — revisar antes de incorporar.**

O usuário deverá clicar explicitamente:

**Aplicar sugestão**

antes de qualquer alteração.

---

# 33. Análise de coerência

Em etapa futura ou no MVP se simples de implementar, a IA poderá analisar os dispositivos consolidados procurando:

- duplicidades;
- contradições;
- nomenclaturas divergentes;
- competências conflitantes;
- conceitos indefinidos;
- referências internas incorretas;
- possíveis lacunas.

Sempre como alerta, nunca como correção automática.

---

# 34. Documento consolidado

O sistema deverá possuir uma tela:

## Estatuto consolidado

Mostrando exclusivamente os dispositivos aprovados na ordem final.

Deverá ser possível navegar capítulo por capítulo.

---

# 35. Exportações

Implementar:

### Estatuto consolidado

Somente texto final.

### Quadro comparativo

| Texto vigente | Nova redação |
|---|---|

### Relatório da reforma

| Dispositivo | Alteração | Justificativa |
|---|---|---|

### Relatório de fundamentação

| Dispositivo | Bíblica | Doutrinária | Jurídica |
|---|---|---|---|

### Histórico da comissão

- reuniões;
- deliberações;
- artigos aprovados;
- pendências.

### Atas

Exportação individual das atas aprovadas.

---

# 36. Importação inicial

O sistema deverá ser preparado inicialmente com:

### Documento 1

**Estatuto registrado da IBO**

Será utilizado como:

`texto_vigente`

### Documento 2

**Proposta de Reforma do Estatuto Social**

Será utilizada como:

`proposta_inicial`

O documento já existente estrutura a análise comparativamente entre redação atual, sugestão e justificativa, devendo essa informação ser preservada durante a importação.

---

# 37. Arquitetura técnica

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

## Backend

Supabase:

- PostgreSQL;
- Auth;
- Row Level Security;
- Realtime;
- Storage.

## Hospedagem

- Vercel

## IA

- Groq API

Todas as chamadas de IA deverão ocorrer no servidor.

A chave Groq nunca deverá ser exposta no frontend.

---

# 38. Autenticação

Utilizar Supabase Auth.

Preferencialmente:

- e-mail + senha;

ou

- Magic Link.

Somente usuários cadastrados poderão acessar.

Nenhum cadastro público.

---

# 39. Modelo conceitual de dados

Sugestão inicial:

```text
profiles

projects
commissions
commission_members

documents

chapters
provisions

provision_versions

suggestions
suggestion_comments

pending_issues

biblical_references
doctrinal_references
legal_references

provision_relations

meetings
meeting_members
meeting_events
meeting_decisions

minutes
minutes_reviews

audit_logs
```

O agente poderá simplificar a estrutura se houver solução tecnicamente melhor, preservando os requisitos funcionais.

---

# 40. Realtime

Supabase Realtime poderá ser utilizado para:

- novos comentários;
- novas sugestões;
- mudanças de status;
- eventos de reunião;
- presença no Modo Reunião.

Não é necessário implementar edição simultânea caractere por caractere.

---

# 41. Controle de concorrência

Ao editar a redação de trabalho, implementar controle de versão.

Exemplo:

Usuário A abre versão 7.

Usuário B altera para versão 8.

Quando A tentar salvar:

> “Este dispositivo foi alterado desde que você iniciou a edição. Revise a versão mais recente antes de salvar.”

Evitar sobrescrita silenciosa.

---

# 42. Responsividade

O sistema deverá funcionar adequadamente em:

- desktop;
- notebook;
- tablet;
- smartphone.

No celular, priorizar:

- leitura;
- comentários;
- sugestões;
- acompanhamento da reunião.

Edição extensa pode ser otimizada para desktop.

---

# 43. Segurança

Implementar:

- Supabase RLS;
- autenticação obrigatória;
- autorização por perfil;
- logs de alteração;
- variáveis de ambiente;
- proteção das API keys.

Nenhum endpoint administrativo deverá confiar apenas em validação frontend.

---

# 44. Interface

Diretriz:

- simples;
- sóbria;
- institucional;
- legível;
- pouco carregada.

Evitar aparência de sistema jurídico excessivamente complexo.

Priorizar:

- leitura;
- comparação;
- clareza de status;
- navegação entre dispositivos.

---

# 45. Funcionalidades fora do escopo inicial

Não implementar inicialmente:

- Google Docs-like editing;
- videoconferência;
- chat geral;
- aplicativo mobile nativo;
- WhatsApp;
- assinatura ICP-Brasil;
- workflow jurídico complexo;
- votação secreta;
- IA autônoma;
- OCR dentro da aplicação;
- integração cartorial.

---

# 46. MVP

O MVP deverá conter:

1. autenticação;
2. usuários e permissões;
3. estrutura de capítulos/dispositivos;
4. texto vigente;
5. proposta inicial;
6. redação de trabalho;
7. sugestões;
8. comentários;
9. justificativas;
10. referências bíblicas;
11. fundamentos doutrinários e jurídicos;
12. novos dispositivos;
13. histórico de versões;
14. status;
15. reuniões;
16. registro de deliberações;
17. geração de minuta de ata;
18. IA editorial;
19. versão consolidada;
20. exportação básica;
21. trilha de auditoria.

---

# 47. Critérios de sucesso

O sistema será considerado funcional quando a comissão conseguir realizar todo o seguinte fluxo sem depender de outro editor:

```text
Entrar no sistema
↓
Selecionar artigo
↓
Ler texto vigente
↓
Ler proposta inicial
↓
Apresentar sugestões
↓
Discutir
↓
Registrar fundamentos
↓
Alterar redação de trabalho
↓
Aprovar
↓
Registrar decisão em reunião
↓
Gerar ata
↓
Consultar histórico
↓
Visualizar Estatuto consolidado
```

---

# 48. Princípio de integridade documental

O sistema deverá preservar permanentemente a distinção entre:

```text
Documento histórico
Texto proposto
Contribuição individual
Redação de trabalho
Decisão da comissão
Texto consolidado
```

Nenhum desses registros deverá substituir silenciosamente outro.

---

# 49. Resultado final esperado

Ao término do trabalho, o sistema deverá permitir gerar:

### 1. Estatuto consolidado

Texto completo para submissão à Assembleia.

### 2. Quadro comparativo

```text
Redação vigente | Redação proposta
```

### 3. Relatório de alterações

Incluindo justificativas.

### 4. Relatório de fundamentação

Incluindo referências:

- bíblicas;
- doutrinárias;
- jurídicas.

### 5. Registro documental da Comissão

Incluindo:

- reuniões;
- atas;
- decisões;
- sugestões;
- histórico de versões.

---

# 50. Diretriz para o agente de codificação

A prioridade do projeto não é construir um editor sofisticado, mas preservar um **processo decisório colaborativo, organizado e auditável**.

Sempre que houver dúvida de arquitetura, priorizar nesta ordem:

**integridade dos dados → histórico → simplicidade → colaboração → estética.**

A regra central de negócio é:

> **nenhuma contribuição individual deve sobrescrever outra; nenhuma redação oficial deve ser alterada sem histórico; nenhuma decisão deve perder sua vinculação com a reunião e com o dispositivo que a originou.**

