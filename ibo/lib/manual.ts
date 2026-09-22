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

O sistema não é um editor de texto colaborativo. Ele preserva o **processo decisório**: autoria, histórico, versões e decisões ficam sempre registrados.

### Princípios que orientam o uso

- **Integridade dos dados** vem antes de tudo: nenhuma contribuição apaga a de outra pessoa.
- **Histórico completo**: toda alteração da redação de trabalho cria uma nova versão.
- **Simplicidade**: as telas são sóbrias e institucionais.
- **IA assistiva**: a inteligência artificial sugere, mas **não decide** — toda sugestão deve ser revisada e aplicada por uma pessoa.

> Regra central: nenhuma contribuição individual sobrescreve outra; nenhuma redação oficial é alterada sem histórico; nenhuma decisão perde o vínculo com a reunião e o dispositivo que a originou.
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
| **Coordenador / Relator** | Redige a redação de trabalho, altera status, aprova dispositivos, gerencia reuniões, inclui/edita/exclui dispositivos novos, move e renumerar. |
| **Membro da Comissão** | Contribui: sugere, comenta, registra pendências, adiciona fundamentos, manifesta opinião consultiva e revisa atas. |

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
5. **Discutir** — comentários, opinião consultiva (concordo/discordo/tenho ressalva) e sugestões de redação em discussão.
6. **Registrar fundamentos** — aba **Análise**, bloco **Fundamentação**: referências bíblicas, doutrinárias, jurídicas e pastorais.
7. **Alterar a redação de trabalho** — coluna "Proposta (redação de trabalho)" (só coordenador/relator). Cada salvamento cria uma versão.
8. **Aprovar** — altere o status para **Aprovado** (congela a redação consolidada).
9. **Registrar a decisão em reunião** — o módulo **Reuniões** guarda presença, eventos e deliberações.
10. **Gerar a ata** — na reunião, use "Gerar minuta da ata" e siga o fluxo rascunho → revisão → aprovada.
11. **Consultar o histórico** — aba **Histórico** do dispositivo.
12. **Acompanhar o novo Estatuto** — menu **Reforma → Em construção** (numeração, textos, novos e revogados).
13. **Comparar ao final** — menu **Reforma → Comparativo** (vigente × nova redação, com justificativas).
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

- **Navegação por capítulos**, à esquerda, com o progresso das aprovações.
- **Documento em construção**, no centro, com todos os dispositivos do capítulo em leitura contínua.
- **Painel contextual**, à direita, atualizado quando você seleciona um dispositivo.

No painel contextual é possível comparar o texto vigente com a redação atual da comissão, consultar a proposta preliminar e a justificativa, acompanhar sugestões, comentários e situação deliberativa, acrescentar dispositivos subordinados e abrir as funções completas de redação, reorganização, discussão e deliberação.

Selecionar ou editar um dispositivo na Mesa não o aprova automaticamente. A redação de trabalho, o status e a deliberação continuam sendo registros independentes.
`,
  },
  {
    id: "dispositivo",
    titulo: "A tela do dispositivo (abas)",
    markdown: `
Ao abrir um dispositivo, o trabalho fica organizado em quatro abas:

### Análise — Rascunho comparativo
1. **Texto vigente** — texto do Estatuto registrado (referência; editável apenas pelo administrador para corrigir extração).
2. **Referência (proposta inicial)** — ponto de partida da reforma.
3. **Proposta (redação de trabalho)** — a versão atual da comissão; só coordenador/relator edita. Cada salvamento cria uma nova versão (há controle de conflito de versão).
4. **Destacar diferenças** — comparação por palavras entre o vigente e a redação atual (retirado/acrescentado).
5. **Justificativa** — explicação do porquê da alteração; alimenta o Relatório da reforma.
6. **Opinião consultiva** — concordo / discordo / tenho ressalva. Tem caráter consultivo, não é votação formal.
7. **Dispositivos relacionados** — dispositivos vinculados a este (referências cruzadas), úteis para evitar contradições e detectar renumeração.
8. **Fundamentação** — referências bíblicas, doutrinárias, jurídicas e administrativas/pastorais que sustentam a proposta.
9. **Redação consolidada (aprovada)** — aparece quando o dispositivo foi aprovado; fica bloqueada.
10. **Referências internas a atualizar** — quando a renumeração afeta menções "Art. N" no texto, o painel permite atualizar (uma a uma ou todas), com registro.

O **status** fica no topo: Não iniciado → Em análise → Em discussão → Redação definida → Aprovado (e Aprovado → Reaberto).

### Colaboração
- **Anotações pessoais** — privadas, só você lê.
- **Sugestões de redação** — cada membro propõe uma nova redação; o coordenador decide o destino (aceita, aceita parcialmente, rejeitada, etc.).
- **Comentários** — discussão livre sobre o dispositivo.

### Pendências
- **Pendências** — questões em aberto que precisam ser verificadas antes da aprovação (jurídica, bíblica, doutrinária, eclesiológica, administrativa, redação, referência cruzada, outra).

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
| **Aprovado** | Decisão da comissão; congela a redação consolidada. |
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
    titulo: "Reuniões, deliberações e atas",
    markdown: `
O módulo **Reuniões** é central para a decisão da comissão.

### Criar uma reunião
Informe número, data, horário, local, pauta, coordenador, secretário e membros esperados.

### Modo Reunião
Ao **iniciar** a reunião, o sistema entra em modo de trabalho: o secretário registra a **presença** e cada deliberação gera um **evento** (log factual da sessão, não editável).

### Deliberações
Cada decisão fica vinculada à reunião e ao dispositivo, permitindo rastrear: dispositivo → deliberação → reunião → ata.

### Ata
- **Gerar minuta da ata** — a IA monta o texto usando **apenas** os fatos registrados (presença, pauta, eventos, deliberações); não inventa nada.
- Fluxo da ata: **Rascunho → Em revisão → Aprovada**.
- Membros podem **concordar, solicitar correção ou registrar ressalva**.
- Ata aprovada fica **bloqueada**; correções posteriores são registradas como **retificação**, preservando o texto aprovado.
`,
  },
  {
    id: "pendencias",
    titulo: "Pendências",
    markdown: `
Qualquer membro pode registrar uma **questão pendente** sobre um dispositivo — por exemplo: "verificar se esta redação conflita com o artigo sobre competência da Assembleia".

Categorias: jurídica, bíblica, doutrinária, eclesiológica, administrativa, redação, referência cruzada e outra.

- As pendências abertas ficam listadas no menu **Reforma → Pendências** e também na aba **Pendências** de cada dispositivo.
- Uma pendência em aberto sinaliza que o dispositivo ainda não deve ser aprovado sem verificação.
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
3. **Aplicar numeração** — grava a numeração de trabalho (artigos e capítulos) na proposta, com auditoria. Artigos já **aprovados** que mudarem de número geram **pendência automática** para revisar as referências.

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
O menu **Reforma → Coerência** analisa os dispositivos aprovados procurando:

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
- A IA **não aprova dispositivos** nem decide pela comissão.
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
    titulo: "Estatuto em construção e Comparativo",
    markdown: `
### Em construção (Reforma → Em construção)
Mostra o **novo Estatuto sendo montado**, na ordem e numeração da proposta:

- **Em construção** (padrão) — todos os dispositivos: aprovados, em andamento e não iniciados; textos na prioridade consolidada → trabalho → proposta inicial → vigente; selos de status, **NOVO** e **revogado** (riscado).
- **Somente aprovados** — apenas o que já foi aprovado (texto final em formação).
- Numeração com chip **era X** quando o número mudou em relação ao vigente; contadores de artigos, aprovados, em andamento, novos e revogados.
- Filtros por capítulo, status, busca, "ocultar revogados" e "somente com texto".
- Se a numeração ainda divergir da ordem, aparece um aviso com link para a Renumeração.

### Comparativo (Reforma → Comparativo)
**Quadro comparativo final**, artigo por artigo, na ordem da proposta:

- **Art. vigente → Art. proposta**, textos lado a lado com **diff por palavras** (retirado/acrescentado);
- tipo de alteração, status e **justificativa**;
- filtros: capítulo, busca, somente alterados, somente aprovados, com justificativa, ocultar revogados;
- **Baixar .txt** gera o mesmo quadro em arquivo.
`,
  },
  {
    id: "relatorios",
    titulo: "Relatórios e exportações",
    markdown: `
O menu **Reuniões → Relatórios** exporta documentos em **.txt** gerados a partir dos dados registrados:

- **Estatuto consolidado** — somente o texto final aprovado, na ordem.
- **Quadro comparativo** — redação vigente × redação proposta/aprovada.
- **Relatório da reforma** — dispositivo, tipo de alteração e justificativa.
- **Relatório de fundamentação** — referências bíblicas, doutrinárias e jurídicas por dispositivo.
- **Histórico da comissão** — reuniões, deliberações, artigos aprovados e pendências.
- **Atas aprovadas** — exportação individual das atas.
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
| **Redação consolidada** | Texto aprovado, que entra no Estatuto consolidado. |
| **Sugestão de redação** | Proposta individual de mudança de texto (com autor e justificativa). |
| **Comentário** | Observação, questionamento ou argumento (não é sugestão de redação). |
| **Opinião consultiva** | Manifestação concordo/discordo/tenho ressalva — caráter consultivo. |
| **Pendência** | Questão em aberto que precisa ser verificada. |
| **Referência** | Fundamento bíblico, doutrinário, jurídico ou pastoral. |
| **Deliberação** | Decisão registrada, vinculada à reunião e ao dispositivo. |
| **Ata** | Registro formal da reunião (rascunho → revisão → aprovada). |
| **Retificação** | Correção posterior de uma ata aprovada (o texto aprovado é preservado). |
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

### O que significa "opinião consultiva"?
É a sua manifestação (concordo / discordo / tenho ressalva). Ela ajuda a comissão, mas **não é a votação formal**.

### Como marco que um dispositivo foi analisado?
Atualize o **status** para "Em análise" e siga o fluxo. O coordenador controla os status finais (Em discussão, Redação definida, Aprovado).

### Perdi o acesso. Como redefino a senha?
Peça ao **administrador** para redefinir. Ao redefinir, a troca de senha volta a ser obrigatória no seu próximo acesso.

### A IA pode decidir por mim?
Não. A IA é **assistiva**: sugere e responde, sempre rotulada. Toda alteração depende de ação humana explícita.

### Onde vejo o resultado final?
- **Em construção** (Reforma → Em construção): o novo Estatuto sendo montado, com tudo em andamento.
- **Comparativo** (Reforma → Comparativo): vigente × nova redação, com justificativas.
- **Relatórios** (Reuniões → Relatórios): exportações em .txt. Se a numeração ainda divergir da ordem, a tela avisa para reordenar/aplicar em Renumeração antes de usar o documento.

### Como vejo o Estatuto inteiro enquanto a reforma está em andamento?
Abra **Reforma → Estatuto em revisão**. As versões anterior e atual ficam emparelhadas, na ordem atual, incluindo dispositivos não aprovados. No celular, cada par aparece um abaixo do outro.
O texto atual usa a redação de trabalho; se estiver vazia, a proposta inicial; por último, o texto vigente. Sugestões individuais não entram automaticamente.
As marcas **Não alterado**, **Alterado**, **Novo** e **Revogado** são separadas da etapa de análise. A comparação ignora formatação e espaços. Trechos retirados e acrescentados podem ser destacados. Revogado indica a classificação de retirada, não uma aprovação automática.
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
