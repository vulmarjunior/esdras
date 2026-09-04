/**
 * Manual de utilização do ESDRAS.
 *
 * Módulo puro (sem banco): usado na página `/manual` e no assistente de ajuda
 * (action `ajuda` no `/api/ai`). Conteúdo em português, baseado no PRD e nas
 * telas reais do sistema.
 */

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
2. **Selecionar um artigo** — no **Painel da Reforma**, navegue pelos capítulos e clique no dispositivo desejado.
3. **Ler o texto vigente** — aba **Análise**, bloco 1. É o texto atual do Estatuto registrado (não editável).
4. **Ler a proposta inicial** — bloco 2 da aba **Análise**. É o ponto de partida da reforma.
5. **Apresentar sugestões** — aba **Colaboração** → "Sugestões dos membros".
6. **Discutir** — comentários, opinião consultiva (concordo/discordo/tenho ressalva) e sugestões em discussão.
7. **Registrar fundamentos** — aba **Pendências & Fundamentos**: referências bíblicas, doutrinárias, jurídicas e pastorais.
8. **Alterar a redação de trabalho** — aba **Análise**, bloco 3 (só coordenador/relator). Cada salvamento cria uma versão.
9. **Aprovar** — altere o status para **Aprovado** (congela a redação consolidada).
10. **Registrar a decisão em reunião** — o módulo **Reuniões** guarda presença, eventos e deliberações.
11. **Gerar a ata** — na reunião, use "Gerar minuta da ata" e siga o fluxo rascunho → revisão → aprovada.
12. **Consultar o histórico** — aba **Histórico & Referências** do dispositivo.
13. **Visualizar o Estatuto consolidado** — menu **Reforma → Consolidado**.
14. **Exportar relatórios** — menu **Reuniões → Relatórios**.
`,
  },
  {
    id: "painel",
    titulo: "O Painel da Reforma",
    markdown: `
A página inicial mostra o andamento da reforma:

- **Progresso geral** — artigos analisados, porcentagem concluída e contadores por status (não iniciado, em análise, em discussão, redação definida, aprovado, reaberto) e pendências.
- **Estrutura do Estatuto** — capítulos com seus dispositivos. Clique em qualquer dispositivo para abrir a tela de análise.
- **Badges** — cada dispositivo exibe o status (ponto + etiqueta). Dispositivos novos mostram o selo **NOVO**; dispositivos em que **você** tem anotação pessoal mostram o selo **nota**.
- **Filtro "Somente com minhas anotações"** — mostra apenas os dispositivos em que você fez ponderações pessoais.
- **Incluir capítulo** (coordenador/relator) — adiciona novos capítulos à proposta.
`,
  },
  {
    id: "dispositivo",
    titulo: "A tela do dispositivo (abas)",
    markdown: `
Ao abrir um dispositivo, o trabalho fica organizado em quatro abas:

### Análise
1. **Texto vigente** — texto do Estatuto registrado (referência, não editável).
2. **Proposta inicial** — ponto de partida da reforma; use **negrito** ou destaque para marcar o que muda.
3. **Redação de trabalho** — a versão atual da comissão; só coordenador/relator edita. Cada salvamento cria uma nova versão (há controle de conflito de versão).
4. **Justificativa** — explicação do porquê da alteração; alimenta o Relatório da reforma.
5. **Redação consolidada (aprovada)** — aparece quando o dispositivo foi aprovado; fica bloqueada.

O **status** fica no topo: Não iniciado → Em análise → Em discussão → Redação definida → Aprovado (e Aprovado → Reaberto).

### Colaboração
- **Anotações pessoais** — privadas, só você lê.
- **Sugestões dos membros** — cada membro propõe mudanças; o coordenador decide o destino (aceita, aceita parcialmente, rejeitada, etc.).
- **Opinião consultiva** — concordo / discordo / tenho ressalva. Tem caráter consultivo, não é votação formal.
- **Comentários** — discussão livre sobre o dispositivo.

### Pendências & Fundamentos
- **Pendências** — questões em aberto que precisam ser verificadas antes da aprovação (jurídica, bíblica, doutrinária, eclesiológica, administrativa, redação, referência cruzada, outra).
- **Fundamentação** — referências bíblicas, doutrinárias, jurídicas e administrativas/pastorais que sustentam a proposta.

### Histórico & Referências
- **Histórico de versões** — todas as versões da redação de trabalho, com autor, data e motivo.
- **Referências cruzadas** — dispositivos vinculados a este, úteis para evitar contradições e detectar renumeração.
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

- As pendências abertas ficam listadas no menu **Reforma → Pendências** e também na aba **Pendências & Fundamentos** de cada dispositivo.
- Uma pendência em aberto sinaliza que o dispositivo ainda não deve ser aprovado sem verificação.
`,
  },
  {
    id: "renumeracao",
    titulo: "Renumeração e referências cruzadas",
    markdown: `
### Renumeração
Quando a ordem muda (por inclusão, exclusão ou reorganização de artigos), use o simulador do menu **Reforma → Renumeração**:

1. O sistema mostra a **nova numeração** como simulação.
2. Aplique a renumeração com confirmação humana — nada muda automaticamente.
3. O sistema alerta sobre **referências internas** potencialmente afetadas.

A numeração final só é definida na **consolidação**; dispositivos novos nascem com rótulo **NOVO** e posição sugerida.

### Referências cruzadas
Na aba **Histórico & Referências**, vincule dispositivos relacionados. Isso ajuda a evitar contradições, encontrar dependências e detectar impactos de renumeração.
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
    titulo: "Guia de redação e Documentos doutrinários",
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
| **Sugestão** | Proposta individual de mudança de texto (com autor e justificativa). |
| **Comentário** | Observação, questionamento ou argumento (não é sugestão). |
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

### Minha sugestão foi aceita. O texto muda automaticamente?
Não. O **coordenador** decide o destino da sugestão (aceitar, aceitar parcialmente ou rejeitar) e incorpora o texto na redação de trabalho quando apropriado.

### O que significa "opinião consultiva"?
É a sua manifestação (concordo / discordo / tenho ressalva). Ela ajuda a comissão, mas **não é a votação formal**.

### Como marco que um dispositivo foi analisado?
Atualize o **status** para "Em análise" e siga o fluxo. O coordenador controla os status finais (Em discussão, Redação definida, Aprovado).

### Perdi o acesso. Como redefino a senha?
Peça ao **administrador** para redefinir. Ao redefinir, a troca de senha volta a ser obrigatória no seu próximo acesso.

### A IA pode decidir por mim?
Não. A IA é **assistiva**: sugere e responde, sempre rotulada. Toda alteração depende de ação humana explícita.

### Onde vejo o resultado final?
Em **Reforma → Consolidado** (apenas aprovados) e em **Reuniões → Relatórios** (exportações).
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