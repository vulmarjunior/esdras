const REPLACEMENTS = [
  [/únicoe/g, "único e"], [/eprática/g, "e prática"], [/aDeclaração/g, "a Declaração"],
  [/ConvençãoBatista/g, "Convenção Batista"], [/fielinterpretação/g, "fiel interpretação"],
  [/\bdaIgreja\b/g, "da Igreja"], [/\bdosMembros\b/g, "dos Membros"], [/\bdoprincípio\b/g, "do princípio"],
  [/\bdefesa,dirigindo-se\b/g, "defesa, dirigindo-se"], [/\besclarecimento eo retorno\b/g, "esclarecimento e o retorno"],
  [/\bdevidamentefundamentado\b/g, "devidamente fundamentado"], [/\bpartesenvolvidas\b/g, "partes envolvidas"],
  [/\bdapalavra\b/g, "da palavra"], [/\bsercredenciado\b/g, "ser credenciado"], [/\beconvenções\b/g, "e convenções"],
  [/\beextraordinárias\b/g, "e extraordinárias"], [/\bquenão\b/g, "que não"], [/\bconvocadapara\b/g, "convocada para"],
  [/\bfixadona\b/g, "fixado na"], [/\bdecomunicação\b/g, "de comunicação"], [/\bemque\b/g, "em que"],
  [/\btrêsquintos\b/g, "três quintos"], [/\bemprimeira\b/g, "em primeira"], [/\bsegundaconvocação\b/g, "segunda convocação"],
  [/\bdiasapós\b/g, "dias após"], [/\bo§/g, "o §"], [/\bnº(?=\d)/g, "nº "],
];
export function cleanExtractedText(text) {
  if (!text) return text ?? "";
  return text.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, segment) => tag ?? REPLACEMENTS.reduce((v, [p, r]) => v.replace(p, r), segment ?? ""));
}
