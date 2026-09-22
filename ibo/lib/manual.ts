/**
 * Manual de utilização do ESDRAS.
 *
 * Módulo puro (sem banco): usado na página `/manual` e no assistente de ajuda
 * (action `ajuda` no `/api/ai`). Conteúdo em português, baseado no PRD e nas
 * telas reais do sistema.
 */

import { pontuarSecoes, tokenizar } from "./busca";

export interface SecaoManual {
  id: string;
  titulo: string;
  markdown: string;
}

export const MANUAL: SecaoManual[] = [
  {
    id: "visao-geral",
    titulo: "Visão geral e princípios",
    markdown: `
O **ESDRAS** é o ambiente de trabalho da Comissão de Reforma do Estatuto Social da Igreja Batista Olaria (IBO). Ele organiza a análise do Estatuto **dispositivo por dispositivo** — capítulo, artigo, parágrafo, inciso e alínea —, registra sugestões, comentários, pendências, fundamentos e reuniões, e produz progressivamente a **versão consolidada** do novo Estatuto.

O sistema não é um editor de texto colaborativo. Ele preserva o **processo editorial**: autoria, histórico, versões e registros ficam sempre identificados.

### Princípios que orientam o uso

- **Integridade dos dados** vem antes de tudo: nenhuma contribuição apaga a de outra pessoa.
- **Histórico completo**: toda alteração da redação de trabalho cria uma nova versão.
- **Simplicidade**: as telas são sóbrias e institucionais.
- **IA assistiva**: a inteligência artificial sugere, mas **não decide** — toda sugestão deve ser revisada e aplicada por uma pessoa.

> Regra central: nenhuma contribuição individual sobrescreve outra; nenhuma redação de trabalho é alterada sem histórico; a aprovação formal ocorrerá pela assinatura da comissão no documento final encaminhado à assembleia.
`,
  },
  {
    id: "perfis",
    titulo: "Perfis e permissões",
    markdown: `
Os usuários são cadastrados pelo **administrador**; não há cadastro público.

| Perfil | O que pode fazer |
|--------|------------------|
| **Administrador** | Tudo. Cadastra usuários, corrige a extração dos textos, acessa Auditoria e Administração. |
| **Coordenador / Relator** | Redige a redação de trabalho, altera status, conclui redações, gerencia reuniões, inclui/edita/exclui dispositivos novos, move e renumera. |
| **Membro da Comissão** | Contribui: sugere, comenta, registra pendências, adiciona fundamentos e revisa atas. |

**O que todo perfil vê:** todas as telas de trabalho (Painel, Dispositivos, Reuniões, Pendências, Renumeração, Coerência, Guia de redação, Documentos doutrinários e Relatórios).

**Somente o Administrador** enxerga os itens **Auditoria** e **Administração** no menu.

> A **anotação pessoal** é privada: cada membro anota para si e ninguém mais lê.
`,
  },
  {
    id: "fluxo",
    titulo: "Fluxo de trabalho (passo a passo)",
    markdown: `
O trabalho segue o fluxo aprovado no projeto. Cada passo aponta para a tela correspondente.

1. **Entrar no sistema** — use o e-mail e a senha fornecidos pelo administrador. No primeiro acesso, a troca de senha é obrigatória.
2. **Abrir a Mesa de Trabalho** — em **Reforma → Mesa de Trabalho**, escolha um capítulo e selecione o dispositivo dentro da leitura contínua.
3. **Trabalhar no rascunho** — na aba **Análise**, o **Rascunho comparativo** mostra lado a lado o **texto vigente**, a **referência (proposta inicial)** e a **proposta (redação de trabalho)**, com o botão "Destacar diferenças".
4. **Apresentar sugestões de redação** — aba **Colaboração** → "Sugestões de redação".
5. **Discutir** — comentários e sugestões de redação em discussão.
6. **Registrar fundamentos** — aba **Análise**, bloco **Fundamentação**: referências bíblicas, doutrinárias, jurídicas e pastorais.
7. **Alterar a redação de trabalho** — coluna "Proposta (redação de trabalho)" (só coordenador/relator). Cada salvamento cria uma versão.
8. **Concluir a redação** — use **Concluir redação** quando o texto estiver pronto para integrar a proposta final. Isso congela uma cópia editorial, mas não representa a aprovação formal da comissão.
9. **Registrar uma reunião, se necessário** — o módulo **Reuniões** guarda presença, assuntos e anotações factuais para uma eventual ata.
10. **Gerar a ata** — na reunião, use "Gerar minuta da ata" e siga o fluxo rascunho → revisão → finalizada.
11. **Consultar o histórico** — aba **Histórico** do dispositivo.
12. **Ler o documento completo** — menu **Reforma → Proposta em construção** (numeração, textos, novos e revogados).
13. **Acompanhar e contribuir** — menu **Reforma → Acompanhamento**. Veja cada dispositivo no celular, consulte redação atual, texto vigente, proposta inicial, justificativa e pendências; use **Contribuir** para sugerir, comentar, registrar pendência ou fazer anotação pessoal. O quadro comparativo completo está na mesma tela.
14. **Exportar relatórios** — menu **Reuniões → Relatórios**.
`,
  },
  {
    id: "painel",
    titulo: "O Painel da Reforma",
    markdown: `
A página inicial mostra o andamento da reforma:

- **Versão exibida (Proposta | Vigente)** — alterna entre a ordem/numeração de trabalho da reforma (padrão) e o Estatuto registrado. A escolha fica salva no seu navegador e vale também para a Revisão e a navegação do dispositivo.
- **Na Proposta** — o número exibido é o **do documento original da proposta** (ex.: art. 5º aparece como **Art. 26º**, com o selo **era 5º**). Quando a ordem no sistema sugerir outro número, aparece um aviso vermelho **ordem: X** — resolva em Renumeração (Ordenar pela numeração do documento e Aplicar numeração).
- **Progresso geral** — artigos analisados, porcentagem concluída e contadores por status e pendências. No modo Proposta, a contagem exclui dispositivos **revogados** e inclui os **novos**.
- **Estrutura do Estatuto** — capítulos com seus dispositivos. Clique em qualquer dispositivo para abrir a tela de análise. Revogados aparecem riscados.
- **Badges** — cada dispositivo exibe o status (ponto + etiqueta). Dispositivos novos mostram o selo **NOVO**; dispositivos em que **você** tem anotação pessoal mostram o selo **nota**.
- **Filtros** — "Somente com minhas anotações" e "Somente com pendências".
- **Continuar de onde parou** — atalho para o primeiro artigo ainda não iniciado na versão exibida.
- **Incluir capítulo** (coordenador/relator) — adiciona novos capítulos à proposta.
`,
  },
  {
    id: "mesa-trabalho",
    titulo: "A Mesa de Trabalho",
    markdown: `
A **Mesa de Trabalho** é o ambiente principal de elaboração da proposta por capítulo. Ela reúne três áreas na mesma tela:

- **Navegação por capítulos**, à esquerda, com o progresso das redações concluídas.
- **Documento em construção**, no centro, com todos os dispositivos do capítulo em leitura contínua.
- **Painel contextual**, à direita, atualizado quando você seleciona um dispositivo.

Acima do documento, coordenadores e administradores encontram dois comandos estruturais explícitos:

- **Novo capítulo** — acrescenta um capítulo à proposta.
- **Nova seção neste capítulo** — acrescenta uma seção dentro do capítulo atualmente aberto.

Depois da criação, a Mesa permanece aberta e seleciona o novo capítulo ou a nova seção. Para incluir artigo, parágrafo, inciso ou alínea, selecione o dispositivo que será o pai e use **Adicionar dispositivo subordinado** no painel contextual.

Capítulos e seções são identificados pelo **título** (o texto de corpo pertence aos artigos): selecione o nó e use **Editar título** no painel contextual — a mudança aparece imediatamente na Mesa, no Consolidado e na exportação.

No painel contextual é possível comparar o texto vigente com a redação atual da comissão, consultar a proposta preliminar e a justificativa, acompanhar sugestões, comentários e pendências e acrescentar dispositivos subordinados.

Os comandos **Redigir**, **Editar título** e **Colaboração** abrem dentro da própria Mesa:

- **Redigir** (artigos, parágrafos, incisos e alíneas) — editor da redação de trabalho, histórico por versão, ferramentas de apoio por IA, justificativa e o comando explícito **Concluir redação**. A conclusão copia a redação de trabalho para a redação consolidada e bloqueia novas edições até que o dispositivo seja reaberto.
- **Editar título** (capítulos e seções) — altera apenas o título estrutural da proposta, sem mudar número ou posição.
- **Colaboração** — sugestões de redação, comentários, pendências e anotação pessoal privada.

A tela clássica do dispositivo permanece disponível como consulta e contingência para histórico, referências e recursos ainda não integrados à Mesa. Quando ela for aberta, o botão **Voltar à Mesa de Trabalho** recupera o capítulo e o dispositivo selecionados.

O botão **Reorganizar** move o dispositivo diretamente na estrutura da proposta. Primeiro escolha o destino e a posição; a Mesa mostra uma prévia de todos os artigos cuja numeração será alterada. Por exemplo, ao colocar o antigo art. 5 depois do art. 26, a prévia mostra o art. 5 passando a 26 e os antigos arts. 6 a 26 recuando uma posição. Os filhos acompanham o dispositivo, a identidade e o histórico são preservados e as referências internas ficam sinalizadas para revisão humana.

Coordenadores e administradores podem **Excluir** dispositivos acrescentados por engano (origem nova; a confirmação avisa quando há filhos em cascata) e **Revogar** dispositivos originais do Estatuto (reversível por **Desfazer revogação**). Dispositivos originais não podem ser excluídos: a revogação os retira do texto final preservando o histórico. Depois de excluir, a Mesa seleciona automaticamente o item anterior.

Selecionar ou editar um dispositivo na Mesa não conclui sua redação automaticamente. A aprovação formal da proposta acontece fora do sistema, pela assinatura da comissão no documento final.
`,
  },
  {
    id: "dispositivo",
    titulo: "A tela do dispositivo (abas)",
    markdown: `
A tela clássica do dispositivo funciona como consulta e contingência. Ao abri-la, o trabalho fica organizado em quatro abas:

### Análise — Rascunho comparativo
1. **Texto vigente** — texto do Estatuto registrado (referência; editável apenas pelo administrador para corrigir extração).
2. **Referência (proposta inicial)** — ponto de partida da reforma.
3. **Proposta (redação de trabalho)** — a versão atual da comissão; só coordenador/relator edita. Cada salvamento cria uma nova versão (há controle de conflito de versão).
4. **Destacar diferenças** — comparação por palavras entre o vigente e a redação atual (retirado/acrescentado).
5. **Justificativa** — explicação do porquê da alteração; alimenta o Relatório da reforma.
6. **Dispositivos relacionados** — dispositivos vinculados a este (referências cruzadas), úteis para evitar contradições e detectar renumeração.
7. **Fundamentação** — referências bíblicas, doutrinárias, jurídicas e administrativas/pastorais que sustentam a proposta.
8. **Redação concluída** — cópia editorial que integrará a proposta final; fica bloqueada até ser reaberta.
9. **Referências internas a atualizar** — quando a renumeração afeta menções "Art. N" no texto, o painel permite atualizar (uma a uma ou todas), com registro.

O **status** fica no topo: Não iniciado → Em análise → Em discussão → Redação definida → Redação concluída (e Redação concluída → Reaberto).

### Colaboração
- **Anotações pessoais** — privadas, só você lê.
- **Sugestões de redação** — cada membro propõe uma nova redação; o coordenador decide o destino (aceita, aceita parcialmente, rejeitada, etc.).
- **Comentários** — discussão livre sobre o dispositivo.

### Pendências
- **Pendências** — questões em aberto que precisam ser verificadas antes da conclusão editorial (jurídica, bíblica, doutrinária, eclesiológica, administrativa, redação, referência cruzada, outra).

### Histórico
- **Histórico de versões** — todas as versões da redação de trabalho, com autor, data e motivo.
`,
  },
  {
    id: "status",
    titulo: "Status e tipos de alteração",
    markdown: `
### Status de um dispositivo

| Status | Significado |
|--------|-------------|
| **Não iniciado** | Ninguém analisou ainda. |
| **Em análise** | Algum membro começou a estudar o dispositivo. |
| **Em discussão** | Há sugestões/comentários em aberto. |
| **Redação definida** | A comissão chegou a um texto. |
| **Redação concluída** | Texto pronto para integrar a proposta final; congela uma cópia editorial. Não equivale à aprovação formal. |
| **Reaberto** | Volta para revisão após alterações posteriores. |

### Tipo de alteração (classificação do dispositivo)

- **Mantido sem alteração** — segue como está.
- **Alteração redacional** — ajuste de texto sem mudar o sentido.
- **Alteração material** — muda o conteúdo/norma.
- **Novo dispositivo** — criado pela comissão.
- **Revogado / Desmembrado / Incorporado a outro / Reorganizado** — classificações estruturais.

Essas classificações alimentam os relatórios e o quadro comparativo.
`,
  },
  {
    id: "reunioes",
    titulo: "Reuniões, registros e atas",
    markdown: `
O módulo **Reuniões** é um ambiente opcional de registro dos encontros da comissão. Ele não controla votação nem formaliza a aprovação da proposta.

### Criar uma reunião
Informe número, data, horário, local, pauta, coordenador, secretário e membros esperados.

### Modo Reunião
Ao **iniciar** a reunião, o secretário pode registrar a **presença** e acrescentar registros factuais sobre os assuntos tratados.

### Registros da reunião
Use registros livres para anotar encaminhamentos, observações e fatos que devam constar de uma eventual ata. Registros antigos de deliberação permanecem disponíveis somente como histórico legado.

### Ata
- **Gerar minuta da ata** — a IA monta o texto usando **apenas** presença, pauta e registros manuais; não inventa nada.
- Fluxo da ata: **Rascunho → Em revisão → Finalizada**.
- Membros podem **concordar, solicitar correção ou registrar ressalva**.
- Ata finalizada fica **bloqueada**; correções posteriores são registradas como **retificação**, preservando o texto anterior.
`,
  },
  {
    id: "pendencias",
    titulo: "Pendências",
    markdown: `
Qualquer membro pode registrar uma **questão pendente** sobre um dispositivo — por exemplo: "verificar se esta redação conflita com o artigo sobre competência da Assembleia".

Categorias: jurídica, bíblica, doutrinária, eclesiológica, administrativa, redação, referência cruzada e outra.

- As pendências abertas ficam listadas no menu **Reforma → Pendências** e também na aba **Pendências** de cada dispositivo.
- Uma pendência em aberto sinaliza que a redação ainda não deve ser concluída sem verificação.
`,
  },
  {
    id: "renumeracao",
    titulo: "Renumeração e referências cruzadas",
    markdown: `
### Renumeração (Reforma → Renumeração)
A numeração de trabalho da proposta é **derivada da ordem atual** (artigos em sequência; capítulos em romanos; revogados não ocupam número). A tela mostra duas colunas: **documento original** (numeração importada da proposta) e **proposta (ordem atual)**.

1. **Ordenar pela numeração do documento** — reordena os artigos de cada capítulo conforme a numeração da proposta importada (empates mantêm a ordem atual). Não cruza capítulos nem altera textos.
2. **Mover** — reordenação manual (entre capítulos/seções ou entre irmãos), na estrutura da proposta.
3. **Aplicar numeração** — grava a numeração de trabalho (artigos e capítulos) na proposta, com auditoria. Artigos com redação já **concluída** que mudarem de número geram **pendência automática** para revisar as referências.

### Referências internas a atualizar
Abaixo do simulador, a lista global mostra as menções a artigos nos textos que ficaram desatualizadas (ex.: *Art. 5º → Art. 26º*), com link para o dispositivo. No dispositivo, a aba **Análise** mostra o painel **Referências internas a atualizar** com botão **Atualizar** (uma a uma ou todas) — sempre com confirmação humana e registro (nova versão na redação de trabalho; auditoria nos demais campos).

### Referências cruzadas
Na aba **Análise**, bloco **Dispositivos relacionados**, vincule dispositivos relacionados. Isso ajuda a evitar contradições, encontrar dependências e detectar impactos de renumeração.
`,
  },
  {
    id: "coerencia",
    titulo: "Análise de coerência",
    markdown: `
O menu **Reforma → Coerência** analisa os dispositivos com redação concluída procurando:

- duplicidades e contradições;
- nomenclaturas divergentes;
- competências conflitantes;
- conceitos indefinidos;
- referências internas incorretas;
- lacunas.

A análise é **apenas um alerta** — nenhuma correção é feita automaticamente. Revise e decida o que ajustar.
`,
  },
  {
    id: "ia",
    titulo: "Inteligência artificial (limites)",
    markdown: `
A IA do sistema é **exclusivamente assistiva**. Ela:

- corrige gramática, melhora clareza, sugere linguagem estatutária, simplifica e compara redações;
- valida o texto com o checklist de técnica legislativa (LC 95/1998);
- gera minutas de ata com base nos registros da reunião;
- analisa a coerência dos dispositivos;
- responde dúvidas de redação, consultas doutrinárias e perguntas sobre como usar o sistema.

**Regras importantes:**

- Toda resposta aparece rotulada como **"gerada por IA — revisar antes de usar"**.
- A IA **não altera nada** automaticamente: você clica em **"Aplicar sugestão"** para incorporar um texto.
- A IA **não conclui redações** nem decide pela comissão.
`,
  },
  {
    id: "guia-documentos",
    titulo: "Guia de redação, Documentos e Literatura",
    markdown: `
### Guia de redação (Consulta → Guia de redação)
Referências de **técnica legislativa** (Lei Complementar nº 95/1998) e de **redação oficial** (Manual de Redação da Presidência da República):

- consulte as regras e use a busca;
- **tire dúvidas de redação** com a IA (ela responde com base nas regras e cita a fonte);
- aplique o **checklist técnico (LC 95)** direto no editor do dispositivo.

### Documentos doutrinários (Consulta → Documentos)
Textos integrais dos documentos confessionais e de princípios utilizados pela comissão:

- **Confissão Batista de Londres (1689)** — 32 capítulos;
- **Confissão de Fé de New Hampshire (1833)** — 18 artigos;
- **A Fé e a Mensagem Batista (2000)** — 18 artigos;
- **Declaração Doutrinária da Convenção Batista Brasileira** — 19 artigos;
- **Declaração de Princípios Batistas**;
- **Pacto das Igrejas Batistas**.

Leia por seções (acordeão), busque no texto e faça **consultas à IA** (ela responde citando confissão e seção).

### Literatura de consulta (Consulta → Literatura de consulta)
Livros doutrinários que orientam as decisões da comissão (ex.: disciplina na igreja, membresia, igreja saudável, teologia pactual). Cada livro é dividido em seções:

- abra um livro para ver o **sumário**, leia a seção e **busque** no texto;
- no formulário de consulta, escolha a fonte: **Livros**, **Documentos de fé** ou **Tudo** — a IA responde citando obra e seção.

**Administrador — adicionar livros:** Administração → **Biblioteca de literatura**. Aceita arquivos **.md**, **.txt** e **.epub** (ou texto colado). A análise roda no navegador e você revisa as seções (renomear, fundir, excluir) antes de salvar. Também é possível editar metadados, reimportar seções e excluir livros.
`,
  },
  {
    id: "estatuto-construcao",
    titulo: "Proposta em construção e Acompanhamento",
    markdown: `
### Proposta em construção (Reforma → Proposta em construção)
Mostra o **novo Estatuto sendo montado**, na ordem e numeração da proposta:

- **Proposta completa** (padrão) — todos os dispositivos: redações concluídas, em andamento e não iniciadas; textos na prioridade consolidada → trabalho → proposta inicial → vigente; selos de status, **NOVO** e **revogado** (riscado).
- **Redações concluídas** — apenas o texto pronto para integrar a proposta final.
- Numeração com chip **era X** quando o número mudou em relação ao vigente; contadores de artigos, redações concluídas, em andamento, novos e revogados.
- Filtros por capítulo, status, busca, "ocultar revogados" e "somente com texto".
- Se a numeração ainda divergir da ordem, aparece um aviso com link para a Renumeração.

### Acompanhamento (Reforma → Acompanhamento)
O modo **Acompanhar a reforma** foi preparado para os membros da comissão, inclusive no celular. Ele apresenta um dispositivo por vez e permite consultar:

- redação atual ou ainda parcial, texto vigente, proposta inicial, justificativa e pendências;
- mudança de numeração (por exemplo, **Art. 5º vigente → Art. 26 proposto**), status e tipo de alteração;
- contribuições vinculadas ao dispositivo: **sugestão de redação, comentário, pendência ou anotação pessoal**. A contribuição não altera automaticamente a redação da comissão.

O modo **Quadro comparativo**, disponível no topo da mesma tela, preserva a visão geral artigo por artigo, na ordem da proposta:

- **Art. vigente → Art. proposta**, textos lado a lado com **diff por palavras** (retirado/acrescentado);
- tipo de alteração, status e **justificativa**;
- filtros: capítulo, busca, somente alterados, somente redações concluídas, com justificativa, ocultar revogados;
- **Baixar .txt** gera o mesmo quadro em arquivo.
`,
  },
  {
    id: "relatorios",
    titulo: "Relatórios e exportações",
    markdown: `
O menu **Reuniões → Relatórios** exporta documentos em **.txt** gerados a partir dos dados registrados:

- **Proposta consolidada (Estatuto consolidado)** — somente as redações concluídas, na ordem.
- **Quadro comparativo** — redação vigente × redação proposta.
- **Relatório da reforma** — dispositivo, tipo de alteração e justificativa.
- **Relatório de fundamentação** — referências bíblicas, doutrinárias e jurídicas por dispositivo.
- **Histórico da comissão** — reuniões, registros, redações concluídas e pendências.
- **Atas finalizadas** — exportação individual das atas.
`,
  },
  {
    id: "admin",
    titulo: "Auditoria e Administração",
    markdown: `
Estas telas são visíveis **somente para o Administrador** (menu **Administração**).

- **Auditoria** — trilha permanente de tudo o que aconteceu no sistema (quem, o quê, quando), com paginação.
- **Administração** — cadastro de usuários, redefinição de senha (reativa a troca obrigatória no próximo acesso) e demais configurações.

> Toda ação relevante é registrada na auditoria — inclusive a troca de senha obrigatória no primeiro acesso.
`,
  },
  {
    id: "glossario",
    titulo: "Glossário",
    markdown: `
| Termo | Significado |
|-------|-------------|
| **Dispositivo** | Unidade do Estatuto: capítulo, seção, artigo, parágrafo, inciso ou alínea. |
| **Texto vigente** | Texto atual do Estatuto registrado (documento histórico). |
| **Proposta inicial** | Texto proveniente da proposta preliminar de reforma. |
| **Redação de trabalho** | Versão em construção pela comissão. |
| **Redação consolidada** | Cópia editorial da redação concluída que entra na proposta final. |
| **Sugestão de redação** | Proposta individual de mudança de texto (com autor e justificativa). |
| **Comentário** | Observação, questionamento ou argumento (não é sugestão de redação). |
| **Pendência** | Questão em aberto que precisa ser verificada. |
| **Referência** | Fundamento bíblico, doutrinário, jurídico ou pastoral. |
| **Registro de reunião** | Anotação factual ou encaminhamento que pode compor uma ata. |
| **Ata** | Registro da reunião (rascunho → revisão → finalizada). |
| **Retificação** | Correção posterior de uma ata finalizada (o texto anterior é preservado). |
| **Anotação pessoal** | Nota privada do membro sobre um dispositivo — ninguém mais lê. |
| **NOVO** | Dispositivo criado pela comissão durante os trabalhos. |
`,
  },
  {
    id: "faq",
    titulo: "Perguntas frequentes",
    markdown: `
### Por que não consigo editar a redação de trabalho?
A redação de trabalho é editada apenas por **coordenador/relator**. Como **membro**, sua contribuição acontece por **sugestões**, **comentários** e **fundamentos**.

### Minha sugestão de redação foi aceita. O texto muda automaticamente?
Não. O **coordenador** decide o destino da sugestão de redação (aceitar, aceitar parcialmente ou rejeitar) e incorpora o texto na redação de trabalho quando apropriado.

### O que significa "redação concluída"?
Significa que o texto está pronto para integrar a proposta final. Não é uma votação nem a aprovação formal da comissão. A formalidade ocorrerá com a assinatura da comissão no documento encaminhado à assembleia.

### Como marco que um dispositivo foi analisado?
Atualize o **status** para "Em análise" e siga o fluxo. O coordenador controla os status finais (Em discussão, Redação definida, Redação concluída).

### Perdi o acesso. Como redefino a senha?
Peça ao **administrador** para redefinir. Ao redefinir, a troca de senha volta a ser obrigatória no seu próximo acesso.

### A IA pode decidir por mim?
Não. A IA é **assistiva**: sugere e responde, sempre rotulada. Toda alteração depende de ação humana explícita.

### Onde vejo o resultado final?
- **Proposta em construção** (Reforma → Proposta em construção): o novo Estatuto sendo montado, com tudo em andamento.
- **Acompanhamento** (Reforma → Acompanhamento): evolução dispositivo por dispositivo, contribuições dos membros e quadro comparativo completo.
- **Relatórios** (Reuniões → Relatórios): exportações em .txt. Se a numeração ainda divergir da ordem, a tela avisa para reordenar/aplicar em Renumeração antes de usar o documento.

### Como vejo o Estatuto inteiro enquanto a reforma está em andamento?
Abra **Reforma → Estatuto em revisão**. As versões anterior e atual ficam emparelhadas, na ordem atual, incluindo redações ainda não concluídas. No celular, cada par aparece um abaixo do outro.
O texto atual usa a redação de trabalho; se estiver vazia, a proposta inicial; por último, o texto vigente. Sugestões individuais não entram automaticamente.
As marcas **Não alterado**, **Alterado**, **Novo** e **Revogado** são separadas da etapa de análise. A comparação ignora formatação e espaços. Trechos retirados e acrescentados podem ser destacados. Revogado indica a classificação de retirada, não uma conclusão automática.
Use busca, seleção de capítulo e filtros para localizar mudanças. Alterações de posição e numeração são indicadas usando os identificadores da importação original. **Abrir dispositivo** leva à análise; **Atualizar leitura** recarrega os dados.
`,
  },
];

/** Filtra as seções por termo (título ou conteúdo); sem termo, retorna todas. */
export function buscarSecoes(termo?: string): SecaoManual[] {
  const t = (termo || "").trim().toLowerCase();
  if (!t) return MANUAL;
  return MANUAL.filter((s) => `${s.titulo} ${s.markdown}`.toLowerCase().includes(t));
}

/** Monta o bloco de contexto do manual para o assistente de ajuda (action `ajuda`). */
export function formarContextoManual(): string {
  return MANUAL.map((s) => `## ${s.titulo}\n${s.markdown.trim()}`).join("\n\n");
}

/**
 * Contexto de ajuda reduzido às seções mais relevantes para a pergunta
 * (economiza tokens no plano gratuito da Groq). Sem correspondência, devolve o
 * manual completo — o orçamento da IA corta o excesso preservando início e fim.
 */
export function formarContextoAjuda(pergunta: string, limite = 6): string {
  const termos = tokenizar(pergunta);
  if (termos.length === 0) return formarContextoManual();
  const itens = MANUAL.map((s) => ({ titulo: s.titulo, conteudo: s.markdown }));
  const top = pontuarSecoes(itens, termos).slice(0, limite);
  if (top.length === 0) return formarContextoManual();
  return top.map(({ item }) => `## ${item.titulo}\n${item.conteudo.trim()}`).join("\n\n");
}
