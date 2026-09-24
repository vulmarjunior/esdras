import {describe,expect,it} from "vitest";
import {markRange,normalizeRuns,plainText,toRuns} from "./rich-text";
import {formatSelection,setAlignment,findNode,Draft} from "./model";
describe("marcas textuais sem HTML arbitrário",()=>{
  it("marca somente a seleção, sem alterar conteúdo",()=>{
    const runs=markRange(toRuns("Igreja Batista"),7,14,"bold");
    expect(runs).toEqual([{text:"Igreja ",marks:[]},{text:"Batista",marks:["bold"]}]);
    expect(plainText(runs)).toBe("Igreja Batista");
  });
  it("permite sobreposição de marcas e alterna seleção já marcada",()=>{
    const bold=markRange(toRuns("exemplo"),0,7,"bold");
    const italic=markRange(bold,2,5,"italic");
    expect(italic).toEqual([{text:"ex",marks:["bold"]},{text:"emp",marks:["bold","italic"]},{text:"lo",marks:["bold"]}]);
    expect(markRange(bold,0,7,"bold")).toEqual([{text:"exemplo",marks:[]}]);
  });
  it("recusa intervalo que ultrapassa o dispositivo",()=>{
    expect(()=>markRange(toRuns("texto"),0,8,"underline")).toThrow("inválida");
  });
  it("não modifica parágrafos ao formatar caput",()=>{
    const draft:Draft={id:"minuta",nodes:[{id:"art",type:"article",text:"Caput",children:[{id:"p",type:"paragraph",text:"Parágrafo",children:[]}]}]};
    const formatted=setAlignment(formatSelection(draft,"art",0,5,"bold"),"justify");
    expect(findNode(formatted.nodes,"art")?.runs).toEqual([{text:"Caput",marks:["bold"]}]);
    expect(findNode(formatted.nodes,"art")?.alignment).toBe("justify");
    expect(findNode(formatted.nodes,"p")?.text).toBe("Parágrafo");
  });
  it("normaliza marcas repetidas em ordem estável",()=>{
    expect(normalizeRuns([{text:"a",marks:["italic","bold","bold"]},{text:"b",marks:["bold","italic"]}]))
      .toEqual([{text:"ab",marks:["bold","italic"]}]);
  });
});
