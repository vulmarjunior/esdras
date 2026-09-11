# Análise técnica da estrutura do Estatuto da IBO

**Data:** 10 de setembro de 2026

**Base analisada:** registros atuais do Supabase, guia de redação legislativa do sistema e o arquivo `PROPOSTA DE REFORMA DO ESTATUTO SOCIAL DA IBO ATAULIZADO EM 9-9-26.pdf`.

## Escopo

Esta análise verifica a organização formal do Estatuto e da proposta: capítulos, artigos, parágrafos, incisos, alíneas, itens, numeração, pontuação, remissões e compatibilidade estrutural com a técnica legislativa.

A Lei Complementar nº 95/1998 e o Decreto nº 12.002/2024 foram usados como referências técnicas. Eles disciplinam diretamente atos normativos públicos, mas oferecem o padrão mais seguro para a redação do estatuto. Para a validade do estatuto da associação, também foram considerados os arts. 53 a 61 do Código Civil.

## Retrato da base

A estrutura atual possui:

- 7 capítulos;
- 33 artigos;
- 32 parágrafos;
- 56 incisos;
- nenhuma alínea ou item cadastrado como dispositivo independente.

Não foram encontrados erros de `parent_id`: a hierarquia cadastrada não possui filhos ligados a tipos incompatíveis. O problema está principalmente na representação da proposta dentro dos mesmos registros históricos.

## Pontos prioritários

### 1. A proposta tem numeração própria, mas o banco conserva a numeração vigente

A proposta incorporada no campo `proposta_inicial` renumera vários capítulos e artigos, enquanto os metadados continuam representando o Estatuto registrado.

Exemplo: o registro `art-6` continua identificado no banco como Art. 6º, mas o texto da proposta começa com `Art. 5º`. O mesmo padrão aparece em diversos artigos posteriores.

Nos capítulos, a proposta usa a sequência I, II, IV, V, IX, XI e XIII, enquanto os registros permanecem como capítulos I a VII.

Isso não é necessariamente erro jurídico: pode representar a identidade histórica do dispositivo. Porém, é uma inconsistência documental se o sistema exibir simultaneamente o rótulo do metadado e o marcador embutido no texto.

**Recomendação:** criar numeração e título próprios para a proposta, sem sobrescrever a identidade vigente. O modelo ideal é:

```text
identidade histórica
numeração vigente
numeração proposta
texto proposto
redação de trabalho
```

### 2. Duplicidade de parágrafos no registro `art-8`

O registro `art-8` possui os parágrafos antigos cadastrados como `§ 1º` e `§ 2º`. A proposta, entretanto, acrescenta três novos parágrafos também numerados `§ 1º`, `§ 2º` e `§ 3º`.

Além disso, o texto da proposta dos parágrafos antigos já aparece como `§ 4º` e `§ 5º`, mas seus metadados continuam como `§ 1º` e `§ 2º`.

**Recomendação:** decidir se os parágrafos antigos serão renumerados na nova redação ou se a proposta deverá usar uma numeração de transição. A decisão precisa ser refletida nos metadados e no texto, evitando dois dispositivos com o mesmo rótulo.

### 3. Alíneas usadas no texto, mas não estruturadas no banco

O novo § 1º do artigo disciplinar contém a lista:

```text
a) Advertência verbal;
b) Advertência por escrito em Ata;
c) Exoneração ...;
d) Desligamento ... .
```

O banco não possui nenhum dispositivo do tipo `alinea`. Pela técnica legislativa, essa enumeração deve ser transformada em incisos do parágrafo ou receber registros próprios de alínea vinculados a um inciso.

**Recomendação:** preferencialmente transformar a lista em `I -`, `II -`, `III -` e `IV -`, pois o Decreto nº 12.002/2024 prevê que o parágrafo se desdobre em incisos e que o inciso se desdobre em alíneas.

### 4. Lacunas de numeração de incisos

Foram encontradas estas sequências incompletas:

- artigo dos direitos dos membros: incisos I a VI e VIII, sem VII;
- artigo das competências do Pastor/Presidente: incisos I a VI e VIII, sem VII.

É preciso verificar se o inciso VII foi retirado deliberadamente. Se a proposta for um novo texto consolidado, a sequência deve ser renumerada. Se a comissão quiser preservar a numeração histórica, deve haver indicação expressa de dispositivo revogado.

### 5. Inconsistência na sequência do artigo dos deveres

No registro `art-10-inc-4`, o texto da proposta começa com `V - Cooperar...`, embora o metadado identifique o dispositivo como inciso IV. Os dispositivos seguintes não trazem marcador textual, o que impede saber se houve erro de numeração ou perda de marcador na extração.

**Decisão necessária:** confirmar a sequência desejada dos deveres, especialmente a posição de “Cooperar pessoalmente...” e dos itens seguintes.

## Problemas formais de redação

Foram observados os seguintes padrões:

- `Art. 2º-`, com hífen colado ao número;
- `III.` em lugar de `III -`;
- `X-` sem espaço;
- uso alternado de hífen e travessão nos incisos;
- parágrafos grafados em alguns textos como `Parágrafo 1º -`, quando o padrão é `§ 1º`;
- mistura de textos que contêm o marcador (`Art.`, `§`, `I -`) com textos que armazenam somente o corpo do dispositivo;
- incisos intermediários terminando em ponto, quando a sequência pede ponto e vírgula;
- incisos iniciados por letra maiúscula, embora o padrão técnico recomende letra minúscula, salvo nome próprio;
- referências como `este Artigo`, que devem ser uniformizadas para `este artigo` ou para uma remissão precisa;
- palavras e espaços ainda sujeitos a revisão editorial pontual, especialmente nos textos que não foram alterados pela limpeza anterior.

O padrão recomendado é:

```text
Art. 1º  Texto do artigo:
§ 1º  Texto do parágrafo:
I - texto do inciso;
II - texto do inciso.
```

## Remissões internas

As remissões precisam acompanhar a numeração final da proposta. A proposta contém referências como `Art. 6º`, `Art. 12`, `Art. 16, VI` e `Art. 27`, mas a numeração proposta não coincide sempre com o número histórico do registro.

Antes da consolidação, todas as remissões devem ser conferidas depois de definida a numeração final. Para remissão ao próprio artigo, o padrão mais claro é `nos termos do § 1º deste artigo`; para outro artigo, usar `art. 3º, caput, inciso V`.

## Conferência com o Código Civil

O art. 54 do Código Civil exige que o estatuto trate de denominação, finalidade, sede, admissão, demissão e exclusão de associados, direitos e deveres, fontes de recursos, órgãos deliberativos, alteração estatutária, dissolução, gestão administrativa e aprovação das contas.

A proposta contempla a maior parte desses assuntos, mas a comissão deve confirmar:

1. se a aprovação das contas está expressamente atribuída à Assembleia, e não apenas mencionada como “prestação de contas”;
2. se a exclusão disciplinar contém procedimento claro, justa causa, direito de defesa e recurso;
3. se o quórum de alteração estatutária está definido sem ambiguidade;
4. se a destinação do patrimônio na dissolução está compatível com o art. 61 do Código Civil;
5. se a regra de convocação por 20% dos membros está preservada, pois ela atende ao mínimo de um quinto previsto no art. 60.

## Conclusão

A estrutura histórica cadastrada é utilizável para comparação, mas a proposta ainda não deve ser tratada como texto consolidado. Os pontos mais urgentes são:

1. separar numeração histórica e numeração proposta;
2. resolver a duplicidade dos parágrafos do `art-8`;
3. estruturar as alíneas do novo § 1º;
4. decidir os incisos VII ausentes;
5. confirmar a numeração do artigo dos deveres;
6. uniformizar marcadores, pontuação e remissões;
7. revisar os requisitos estatutários do Código Civil antes da aprovação.

## Fontes

- [Lei Complementar nº 95/1998 — texto compilado](https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp95compilado.htm)
- [Decreto nº 12.002/2024 — técnica legislativa](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d12002.htm)
- [Código Civil — Lei nº 10.406/2002, arts. 53 a 61](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm)
- Arquivo analisado: `PROPOSTA DE REFORMA DO ESTATUTO SOCIAL DA IBO ATAULIZADO EM 9-9-26.pdf`.
