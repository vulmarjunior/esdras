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
O **ESDRAS** é o ambiente de trabalho da Comissão de Reforma do Estatuto Social da Igreja Batista Olaria (IBO). Ele organiza a análise do Estatuto **dispositivo por dispositivo** — capítulo, seção, artigo, parágrafo, inciso e alínea —, registra sugestões, comentários, pendências, fundamentos e reuniões, e produz progressivamente o **novo Estatuto**.

Hoje o trabalho tem duas camadas:

- a **nova minuta** (ambiente principal, independente): o documento é redigido de forma contínua na **Mesa de Trabalho**, com apreciação por dispositivo, histórico de versões e exportação;
- o **ambiente anterior (legado)**: a proposta histórica, com sugestões, comentários, pendências, vínculos e ferramentas de análise, preservada para consulta e contribuições em **Arquivo e legado**.

O sistema não é um editor de texto colaborativo. Ele preserva o **processo editorial**: autoria, histórico, versões e registros ficam sempre identificados.

### Princípios que orientam o uso

- **Integridade dos dados** vem antes de tudo: nenhuma contribuição apaga a de outra pessoa.
- **Histórico completo**: toda alteração da redação cria uma nova versão; na nova minuta, a persistência corrente é gravada continuamente e os marcos ficam recuperáveis no histórico.
- **Simplicidade**: as telas são sóbrias e institucionais.
- **IA assistiva**: a inteligência artificial sugere, mas **não decide** — toda sugestão deve ser revisada e aplicada por uma pessoa.

> Regra central: nenhuma contribuição individual sobrescreve outra; nenhuma redação é alterada sem histórico; a aprovação formal ocorrerá pela assinatura da comissão no documento final encaminhado à assembleia.
`,
  },
  {
    id: "perfis",
    titulo: "Perfis e permissões",
    markdown: `
Os usuários são cadastrados pelo **administrador**; não há cadastro público.

| Perfil | O que pode fazer |
|--------|------------------|
| **Administrador** | Tudo. Cadastra usuários, corrige a extração dos textos do Estatuto registrado, acessa Auditoria e Administração. |
| **Coordenador / Relator** | Redige a nova minuta (incluir, mover, retirar e apreciar dispositivos), grava versões, exporta o documento e mantém o fluxo do ambiente anterior quando necessário. |
| **Membro da Comissão** | Acompanha e contribui: visualiza a nova minuta e, no ambiente anterior, sugere, comenta, registra pendências e fundamentos e revisa atas. |

**Atalhos por perfil:** todos veem **Início**, **Visualizar nova minuta**, **Reuniões** e **Consulta**; **Redigir nova minuta** e **Mesa anterior** aparecem para coordenador/administrador. **Somente o Administrador** enxerga **Auditoria** e **Administração**.

> A **anotação pessoal** é privada: cada membro anota para si e ninguém mais lê.
`,
  },
  {
    id: "fluxo",
    titulo: "Fluxo de trabalho (passo a passo)",
    markdown: `
O trabalho segue o fluxo aprovado no projeto. Cada passo aponta para a tela correspondente.

1. **Entrar no sistema** — use o e-mail e a senha fornecidos pelo administrador. No primeiro acesso, a troca de senha é obrigatória.
2. **Ver o andamento** — a página **Início** mostra capítulos, artigos e a **apreciação** dos dispositivos da nova minuta (apreciados, em análise e pendentes).
3. **Abrir a nova minuta** — **Mesa de Trabalho → Redigir nova minuta** (coordenador/administrador) abre o documento contínuo.
4. **Redigir o dispositivo** — selecione o dispositivo no documento e escreva nele; use a barra para formatar e para inserir, mover, transferir ou retirar dispositivos. Editar o texto de um dispositivo apreciado devolve o item para **Em análise**.
5. **Apreciar** — na barra **Apreciação**, marque o dispositivo ativo como **Em análise** ou **Apreciado pela comissão**.
6. **Salvar** — o **autosave** grava a persistência corrente; **Salvar versão** cria um marco recuperável no **Histórico de versões**, de onde é possível pré-visualizar e restaurar.
7. **Exportar** — **Exportar documento…** gera o documento para **imprimir/salvar em PDF**, **HTML** ou **Markdown**, com opções de marcas de apreciação, legenda, sumário e somente-apreciados.
8. **Visualizar e acompanhar** — membros abrem **Mesa de Trabalho → Visualizar nova minuta** (somente leitura, com o estado de cada dispositivo) e contribuem pelas telas do ambiente anterior (**Arquivo e legado → Abrir arquivo do projeto**).
9. **Registrar uma reunião, se necessário** — o módulo **Reuniões** guarda presença, assuntos e anotações factuais para uma eventual ata.
10. **Gerar a ata** — na reunião, use "Gerar minuta da ata" e siga o fluxo rascunho → revisão → finalizada.
11. **Consultar materiais** — **Consulta** reúne o manual, o guia de redação, os documentos de fé e a literatura; dentro da Mesa há consulta a arquivo local (TXT/MD/PDF) e consulta com IA.
12. **Exportar relatórios do ambiente anterior** — **Reuniões → Relatórios**.
`,
  },
  {
    id: "painel",
    titulo: "Início e Painel clássico",
    markdown: `
A página inicial (**Início**) foi refeita para a nova minuta:

- **Minuta do novo Estatuto** — cartão principal com o botão **Continuar na Mesa de Trabalho** (editores) ou **Visualizar a minuta** (demais perfis).
- **Andamento da nova minuta** — número de capítulos, de artigos e a **apreciação dos dispositivos**: apreciados, em análise, pendentes e pontos para revisão, além do total de dispositivos.
- **Última gravação** — data e hora do último salvamento da minuta no servidor.
- **Atalhos** — Documentos de consulta, Reuniões, Literatura de consulta e **Arquivo e legado**.

Os indicadores da página inicial referem-se **somente à nova minuta** — não incluem o ambiente anterior.

No ambiente anterior está o **Painel clássico** (**Arquivo e legado → Painel clássico**), com os indicadores da proposta histórica: progresso por status, árvore do Estatuto registrado, filtros, "Continuar de onde parou" e inclusão de capítulos.
`,
  },
  {
    id: "mesa-trabalho",
    titulo: "A Mesa de Trabalho",
    markdown: `
A **Mesa de Trabalho** é o ambiente principal da reforma. Nela o coordenador/relator redige a **nova minuta** — um documento contínuo, independente do Estatuto registrado e da proposta histórica.

### Estrutura da tela

- **Sumário (Estrutura)**, à esquerda: os **capítulos** da minuta com seus títulos, o resumo de apreciação (*X apreciados · Y em análise · Z pendentes · N pontos para revisão*) e um ponto de estado nos capítulos em andamento ou apreciados. Clique para navegar até o capítulo.
- **Documento contínuo**, no centro: a minuta inteira, com numeração derivada da posição (Art. 1º, Art. 2º…; capítulos e seções em romanos).
- **Painel de apoio**, à direita (**aberto por padrão**): dispositivo em foco (com o ponto para revisão), documentos de consulta do Esdras e abertura de arquivo local.
- Na **barra fixa**: os botões **Sumário** e **Apoio** alternam os painéis (quando ocultos, viram **Mostrar sumário** / **Mostrar apoio**, destacados), ao lado dos botões de **documento** (consultar TXT/MD/PDF) e **IA · Groq**. Cada painel também tem **Ocultar** no próprio cabeçalho.

### Edição

- Selecione um dispositivo clicando nele; a barra superior (fixa ao rolar) tem duas linhas: **documento** (status, Salvar agora, Salvar versão, + Inserir, Recarregar e Histórico) e **dispositivo ativo** (formatação, alinhamento, apreciação, mover e Mais ações).
- Edite o texto direto no documento. Capítulos, seções e subseções são identificados pelo **título** e exibidos centralizados.
- **Formatar** — negrito, itálico, sublinhado e alinhamento por ícones (esquerda, centro, direita, justificar).
- **Inserir** (+ Inserir dispositivo) — capítulo, seção, subseção, artigo, parágrafo, inciso, alínea ou texto livre; a sugestão de tipo aparece conforme o dispositivo ativo. Atalhos: **Ctrl+Alt+A** (artigo), **Ctrl+Alt+P** (parágrafo), **Ctrl+Alt+I** (inciso) e **Ctrl+Alt+L** (alínea).
- **Mover** ↑/↓ move o dispositivo entre os irmãos. Em **Mais ações ▾** ficam **Mover para capítulo…** (transfere um artigo com todos os parágrafos, incisos e alíneas), **Retirar dispositivo** e **Desfazer estrutura** (volta a última alteração estrutural).

### Apreciação

Cada dispositivo tem um estado editorial, exibido como **rubrica marginal** (marca discreta na margem esquerda) e na linha:

| Estado | Marca | Significado |
|--------|-------|-------------|
| **Pendente de análise** | ○ cinza | Ainda não apreciado pela comissão. |
| **Em análise** | ● azul | Em estudo ou redação. |
| **Apreciado pela comissão** | ✓ verde | O texto atual foi apreciado; a linha ganha um tom verde discreto. |

Use a barra **Apreciação** para marcar o dispositivo ativo. **Editar o texto de um dispositivo apreciado devolve o item para "Em análise"** — formatação que não altera o texto preserva a apreciação. Marcações antigas de "aprovado" aparecem automaticamente como **Apreciado**.

> "Apreciado pela comissão" é um indicador editorial de progresso; a aprovação formal ocorre fora do sistema, pela assinatura da comissão no documento final.

### Ponto para revisão

O **Ponto para revisão** é um alerta editorial: uma marcação com observação que pode ser criada em **qualquer dispositivo** (apreciado ou não) e removida quando a comissão debate e resolve a questão.

- Aparece como **● âmbar** ao lado do rótulo, no texto e no sumário; no ambiente de leitura e nas exportações vira um bloco **"Ponto para revisão"** com o texto.
- Para criar ou editar: selecione o dispositivo (ou clique no ●) e use a seção **Ponto para revisão** no **painel de apoio** — escreva a observação e clique **Salvar alerta**; **Resolver (remover)** apaga a marcação.
- O alerta **não altera a apreciação nem a redação** e é gravado junto com a minuta (autosave/histórico). Vários dispositivos podem ter alertas ao mesmo tempo.

### Vínculos com o Estatuto e consulta pareada

Cada dispositivo da nova minuta pode ser **vinculado** ao dispositivo correspondente do **Estatuto registrado** — de onde saem os textos **Vigente** (texto_vigente) e **Proposta inicial** (proposta_inicial). No painel de apoio, a seção **Vínculos com o Estatuto** permite:

- **Aceitar sugestões** — o sistema compara o texto e propõe os dispositivos mais parecidos (com percentual); clique **Vincular** para confirmar;
- **Buscar manualmente** por rótulo, número ou trecho e vincular;
- **Remover** um vínculo; um dispositivo pode ter mais de um (fusão de artigos) e um mesmo dispositivo do Estatuto pode servir a vários;
- **Sugerir vínculos em toda a minuta…** (coordenador) — calcula as correspondências, mostra a prévia e aplica em lote apenas as de **alta confiança**; as demais ficam listadas para revisão individual.

O botão **Comparar…** abre, sem sair da Mesa, o dispositivo ativo em **Vigente × Redação atual** e **Proposta inicial × Redação atual**, com destaque das diferenças. Dispositivos sem vínculo aparecem como "sem correspondente no Estatuto registrado".

### Salvamento e histórico

- O **autosave** grava a persistência corrente depois que você para de digitar; o indicador no topo mostra *alterações pendentes / salvando / salvo / falha*.
- **Salvar agora** grava imediatamente; **Salvar versão** cria um marco recuperável no histórico sem interromper a edição.
- **Histórico de versões** lista os marcos com autor e data, permite **pré-visualizar** e **Restaurar como nova versão** — nada é apagado.
- **Recarregar** traz o texto do servidor; **Exportar cópia (JSON)** baixa uma cópia de segurança completa.
- **Importar JSON…** substitui a minuta atual por um arquivo (cópia exportada ou documento consolidado) depois de uma **prévia com contagens e diferenças**; a versão anterior vira um **marco de segurança** no histórico e a operação fica registrada na auditoria.
- Se outra sessão salvar antes de você, a Mesa avisa do **conflito** e não sobrescreve nada em silêncio: exporte a cópia JSON antes de recarregar. Ao sair com alterações pendentes, o navegador avisa.

### Exportar documento

O botão **Exportar documento…** (também disponível em **Visualizar nova minuta**) gera:

- **Imprimir / PDF** — abre uma folha limpa (A4) com cabeçalho institucional (versão, data e aviso de minuta em elaboração), legenda, rubricas marginais e rodapé; use "Imprimir → Salvar como PDF";
- **HTML** — arquivo único já estilizado, para arquivar ou enviar;
- **Markdown** — texto portátil com a legenda de apreciação (✓/●/○), para colar em Word/Docs.

Opções: **marcas de apreciação e legenda** (ligadas por padrão), **sumário** e **somente dispositivos apreciados**. Os **pontos para revisão** aparecem sempre no documento exportado, em qualquer modo. A exportação usa a **versão salva** no servidor — o diálogo avisa quando há alterações pendentes.

### Consulta dentro da Mesa

Na **barra fixa**, o ícone de **documento** abre um arquivo local (.txt, .md ou .pdf) para leitura ao lado do texto; o ícone **IA · Groq** responde com base nos documentos do Esdras (documentos de fé e literatura), sem alterar a minuta.

- No painel de apoio, os botões **Estatuto vigente** e **Proposta inicial** abrem o **texto integral** no leitor amplo (com busca); **Documentos do Esdras** lista o catálogo completo e **Abrir arquivo para leitura** carrega um TXT, MD ou PDF local.

### Visualizar nova minuta (plataforma de acompanhamento)

**Mesa de Trabalho → Visualizar nova minuta** é a plataforma de acompanhamento, somente leitura e aberta a todos os perfis: mostra a minuta na versão salva pelo redator, com o selo de apreciação, os **pontos para revisão** (● e bloco expansível) e o botão **Exportar documento…**. Inclui:

- **Mostrar/Ocultar capítulos** abre o **Sumário** (com a marca de apreciação e de ponto para revisão); o resumo geral fica ao lado do botão;
- os botões **Estatuto vigente** e **Proposta inicial** abrem o **texto integral** de cada documento em janela, com busca por trecho;
- o botão **Documentos** lista o **compromisso de membresia na linguagem adaptada para crianças e adolescentes** e os documentos doutrinários, abrindo cada um em janela com busca;
- clique em qualquer dispositivo (no texto ou no sumário): a **Consulta comparativa** (à direita, em telas largas) mostra a **Redação atual** e a **Correspondência no Estatuto**; o botão **Comparar com o Estatuto…** abre a comparação em janela ampla (Vigente × Redação atual e Proposta inicial × Redação atual, com **Destacar diferenças**). Em telas menores, um botão fixo embaixo abre a comparação;
- a página é atualizada automaticamente quando o redator salva (atualização em tempo real).

> A consulta pareada depende dos **vínculos** com o Estatuto registrado, feitos pela coordenação na Mesa; dispositivos sem vínculo mostram o aviso de "sem correspondente".

### Mesa anterior (legado)

Os recursos do ambiente anterior continuam preservados em **Arquivo e legado → Mesa anterior** (coordenador/administrador): edição por capítulo, status de análise, concordância editorial, vínculos com o Estatuto registrado (origem e correspondências), revogação/reversão, marcos e conferência. Essas ferramentas operam sobre a **proposta histórica**, não sobre a nova minuta.
`,
},
{
  id: "compromisso",
  titulo: "O Compromisso de Membresia",
  markdown: `
O **Compromisso de Membresia** tem um ambiente próprio, com o mesmo motor da Mesa: **Compromisso → Redigir compromisso** (coordenador/administrador) e **Compromisso → Acompanhar compromisso** (todos os perfis, somente leitura).

- O documento é **independente do Estatuto** e saiu da biblioteca de consulta (**Consulta → Documentos**), pois é debatido e editado pela comissão como a própria minuta.
- Estrutura: **capítulos** (CAPÍTULO I…) e **seções numeradas** (1., 2., …); o preâmbulo, a declaração do candidato e o registro aparecem como texto livre.
- A edição usa os mesmos recursos da minuta: edição contínua no documento, formatação, inserção, movimentação, **apreciação em três estados**, **ponto para revisão**, autosave, **histórico de versões** e **exportação** (Imprimir/PDF, HTML e Markdown).
- Como o texto é próprio da membresia, não há vínculos nem comparação com o Estatuto; a consulta aos documentos do Esdras continua no painel de apoio.
- A carga inicial veio de **Documentos fonte/Compromisso_de_Membresia_IBO_versao_definitiva.txt**; a partir do primeiro salvamento, o texto oficial passa a ser o registrado no sistema, com histórico e auditoria.

> O **compromisso adaptado para crianças e adolescentes** permanece na biblioteca de consulta (**Consulta → Documentos**), em apreciação pela comissão.
`,
},
{
  id: "dispositivo",
    titulo: "A tela do dispositivo (abas)",
    markdown: `
A tela clássica do dispositivo pertence ao **ambiente anterior** e funciona como consulta e contingência (aberta pelos links da Proposta anterior, do Acompanhamento anterior ou pelo histórico dos dispositivos já existentes). O trabalho fica organizado em quatro abas:

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
### Apreciação na nova minuta

Na **nova minuta**, cada dispositivo tem um estado editorial simples, independente do status do ambiente anterior:

| Estado | Significado |
|--------|-------------|
| **Pendente de análise** | Ainda não apreciado pela comissão. |
| **Em análise** | Em estudo ou redação. |
| **Apreciado pela comissão** | O texto atual foi apreciado; editar o texto devolve o item para "Em análise". |

### Status de um dispositivo (ambiente anterior)

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

- As pendências abertas ficam listadas em **Arquivo e legado → Pendências anteriores** e também na aba **Pendências** de cada dispositivo do ambiente anterior.
- Uma pendência em aberto sinaliza que a redação ainda não deve ser concluída sem verificação.

As pendências pertencem ao **ambiente anterior** (**Arquivo e legado → Pendências anteriores**) e ainda não estão integradas à nova minuta.
`,
  },
  {
    id: "renumeracao",
    titulo: "Renumeração e referências cruzadas",
    markdown: `
### Renumeração (ambiente anterior — Arquivo e legado → Renumeração anterior)
Ferramenta da **proposta histórica**; na nova minuta a numeração é derivada automaticamente da posição de cada dispositivo. A numeração de trabalho da proposta é **derivada da ordem atual** (artigos em sequência; capítulos em romanos; revogados não ocupam número). A tela mostra duas colunas: **documento original** (numeração importada da proposta) e **proposta (ordem atual)**.

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
A **Coerência** (**Arquivo e legado → Coerência anterior**) é uma ferramenta do ambiente anterior: analisa os dispositivos com redação concluída da proposta histórica procurando:

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
    titulo: "Ambiente anterior: Proposta e Acompanhamento",
    markdown: `
### Proposta anterior (Proposta em construção)
Em **Arquivo e legado → Proposta anterior**, a proposta histórica aparece montada na ordem e numeração daquele ambiente:

- **Proposta completa** (padrão) — todos os dispositivos: redações concluídas, em andamento e não iniciadas; textos na prioridade consolidada → trabalho → proposta inicial → vigente; selos de status, **NOVO** e **revogado** (riscado).
- **Redações concluídas** — apenas o texto pronto para integrar a proposta final.
- Numeração com chip **era X** quando o número mudou em relação ao vigente; contadores de artigos, redações concluídas, em andamento, novos e revogados.
- Filtros por capítulo, status, busca, "ocultar revogados" e "somente com texto".
- Se a numeração divergir da ordem, aparece um aviso com link para a Renumeração anterior.

### Acompanhamento anterior
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
### Exportar a nova minuta

Na **Mesa de Trabalho** (Redigir ou Visualizar nova minuta), use **Exportar documento…**:

- **Imprimir / PDF** — folha limpa (A4) com cabeçalho institucional (versão, data e aviso de minuta em elaboração), legenda de apreciação, rubricas marginais e rodapé; salve pelo diálogo de impressão do navegador;
- **HTML** — arquivo único já estilizado, para arquivar ou enviar;
- **Markdown** — texto portátil com a legenda (✓/●/○).

Opções: marcas de apreciação e legenda (ligadas por padrão), sumário e somente dispositivos apreciados. A exportação usa a **versão salva** no servidor.

### Relatórios do ambiente anterior

O menu **Reuniões → Relatórios** exporta documentos em **.txt** gerados a partir dos dados históricos:

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
| **Nova minuta** | Documento do novo Estatuto em elaboração na Mesa de Trabalho, independente do Estatuto registrado e da proposta histórica. |
| **Apreciação** | Estado editorial de cada dispositivo da nova minuta: *Pendente de análise*, *Em análise* ou *Apreciado pela comissão*. |
| **Rubrica marginal** | Marca discreta na margem esquerda que indica a apreciação do dispositivo (○, ● ou ✓). |
| **Ponto para revisão** | Alerta editorial da nova minuta (● âmbar): marcação com observação, criada e removida no painel de apoio; não altera a apreciação nem a redação. |
| **Vínculo** | Correspondência entre um dispositivo da nova minuta e o do Estatuto registrado, que fornece os textos **Vigente** e **Proposta inicial** para consulta pareada. |
| **Importar JSON** | Substituição da minuta atual por um arquivo exportado ou consolidado, com prévia de diferenças, marco de segurança e auditoria. |
| **Versão (marco)** | Ponto recuperável do histórico da nova minuta, criado por "Salvar versão"; restaurar cria uma nova versão sem apagar as anteriores. |
| **Ambiente anterior (legado)** | Conjunto das telas da proposta histórica, preservado em **Arquivo e legado**. |
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

### O que significa "Apreciado pela comissão"?
É o estado editorial da **nova minuta** que indica que o texto atual daquele dispositivo foi apreciado pela comissão. Não é votação nem aprovação formal: a formalidade ocorre com a assinatura da comissão no documento final. Se o texto for editado depois, o dispositivo volta para **Em análise**.

### Como exporto o documento?
Na **Mesa de Trabalho**, use **Exportar documento…** (no editor ou na visualização): **Imprimir/PDF** abre a folha limpa para salvar em PDF, **HTML** baixa o arquivo estilizado e **Markdown** baixa a versão portátil. Você pode ligar/desligar as marcas de apreciação e a legenda, incluir sumário ou exportar somente os dispositivos apreciados.

### Como vejo o texto vigente e a proposta inicial de um dispositivo?
Na **Visualizar nova minuta**, clique no dispositivo: a **Consulta do dispositivo** mostra a redação atual, o **Vigente** e a **Proposta inicial** (com "Destacar diferenças"). Na **Mesa**, o coordenador usa **Vínculos com o Estatuto** no painel de apoio para registrar as correspondências (com sugestões automáticas) e **Comparar…** para ver os textos lado a lado.

### Como marco que um dispositivo foi analisado?
Na **nova minuta**, use a barra **Apreciação** e marque **Em análise** ou **Apreciado pela comissão** (editar o texto de um item apreciado devolve para "Em análise"). No ambiente anterior, atualize o **status** do dispositivo; o coordenador controla os status finais (Em discussão, Redação definida, Redação concluída).

### Como registro e resolvo um ponto para revisão?
Selecione o dispositivo (ou clique no **●**), abra a seção **Ponto para revisão** no painel de apoio, escreva a observação e clique **Salvar alerta**. Quando a comissão debater, clique **Resolver (remover)** para apagar a marcação. O alerta convive com a apreciação e aparece nas exportações.

### Como importo uma minuta de um arquivo JSON?
Na **Mesa de Trabalho**, clique **Importar JSON…**, escolha o arquivo e confira a **prévia** (dispositivos, apreciados, pontos para revisão e diferenças em relação à minuta atual). Ao confirmar, a minuta é substituída, a versão anterior vira um **marco de segurança** no histórico e a importação é registrada na auditoria. Disponível para coordenador/administrador.

### Perdi o acesso. Como redefino a senha?
Peça ao **administrador** para redefinir. Ao redefinir, a troca de senha volta a ser obrigatória no seu próximo acesso.

### A IA pode decidir por mim?
Não. A IA é **assistiva**: sugere e responde, sempre rotulada. Toda alteração depende de ação humana explícita.

### Onde vejo o resultado final?
- **Visualizar nova minuta** (Mesa de Trabalho): o documento atual, na versão salva, com o estado de apreciação de cada dispositivo.
- **Exportar documento…**: PDF (impressão), HTML ou Markdown da nova minuta.
- **Acompanhamento anterior** (Arquivo e legado): evolução da proposta histórica dispositivo por dispositivo, contribuições dos membros e quadro comparativo completo.
- **Relatórios** (Reuniões → Relatórios): exportações em .txt do ambiente anterior. Se a numeração divergir da ordem, a tela avisa para reordenar/aplicar em Renumeração antes de usar o documento.

### Como vejo o Estatuto inteiro enquanto a reforma está em andamento?
Para a **nova minuta**, abra **Mesa de Trabalho → Visualizar nova minuta** (somente leitura) ou use **Exportar documento…** para gerar a versão impressa.
Para a **proposta histórica**, o **Arquivo e legado** reúne a Proposta anterior (texto em construção) e o Acompanhamento anterior, com busca, filtros e comparação entre a redação vigente e a proposta.
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
