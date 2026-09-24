/** Formato experimental de texto rico: somente marcas semânticas e quebras de linha.
 * Não armazenar HTML arbitrário vindo de colagem ou do navegador.
 */
export type Mark = "bold" | "italic" | "underline";
export type TextRun = { text: string; marks: Mark[] };
export type Alignment = "left" | "center" | "right" | "justify";
export const plainText = (runs: readonly TextRun[]): string => runs.map(run => run.text).join("");

const ordered: readonly Mark[] = ["bold", "italic", "underline"];
export function normalizeRuns(runs: readonly TextRun[]): TextRun[] {
  const result: TextRun[] = [];
  for (const run of runs) {
    if (!run.text) continue;
    const marks = ordered.filter(mark => run.marks.includes(mark));
    const previous = result[result.length - 1];
    if (previous && previous.marks.join(",") === marks.join(",")) previous.text += run.text;
    else result.push({text:run.text,marks:[...marks]});
  }
  return result;
}
export function markRange(runs: readonly TextRun[], start: number, end: number, mark: Mark): TextRun[] {
  const length = plainText(runs).length;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > length)
    throw new Error("Seleção textual inválida");
  const selected = runs.flatMap((run,index) => {
    const offset = runs.slice(0,index).reduce((sum,part)=>sum+part.text.length,0);
    return offset < end && offset + run.text.length > start ? [run] : [];
  });
  const remove = selected.length>0 && selected.every(run=>run.marks.includes(mark));
  let position = 0;
  const updated:TextRun[] = [];
  for (const run of runs) {
    const from = position, to = from + run.text.length; position=to;
    const insideStart = Math.max(from,start),insideEnd=Math.min(to,end);
    if (insideStart >= insideEnd) {updated.push(run);continue;}
    if(from<insideStart)updated.push({text:run.text.slice(0,insideStart-from),marks:run.marks});
    const marks=remove?run.marks.filter(item=>item!==mark):[...run.marks,mark];
    updated.push({text:run.text.slice(insideStart-from,insideEnd-from),marks});
    if(insideEnd<to)updated.push({text:run.text.slice(insideEnd-from),marks:run.marks});
  }
  return normalizeRuns(updated);
}
export function toRuns(text: string):TextRun[] {return text ? [{text,marks:[]}] : [];}
