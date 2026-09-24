import {describe,expect,it} from "vitest";
import {validateDraft} from "./validate";
import type {Draft} from "./model";
const draft=():Draft=>({id:"estatuto-ibo-2026",nodes:[{id:"cap-1",type:"chapter",text:"Dos fins",children:[{
  id:"art-1",type:"article",text:"Uma associação",runs:[{text:"Uma ",marks:[]},{text:"associação",marks:["bold"]}],children:[]
}]}]});
describe("validação da minuta independente",()=>{
  it("aceita texto formatado consistente dentro da hierarquia",()=>expect(validateDraft(draft())).toEqual(draft()));
  it("recusa identidade indevida e pai incompatível",()=>{
    expect(()=>validateDraft({...draft(),id:"historico"})).toThrow("Identificação");
    const invalid=draft();invalid.nodes[0].children[0].type="subsection";
    expect(()=>validateDraft(invalid)).toThrow("Hierarquia");
  });
  it("recusa IDs duplicados e texto distinto da formatação",()=>{
    const duplicated=draft();duplicated.nodes[0].children[0].id="cap-1";
    expect(()=>validateDraft(duplicated)).toThrow("duplicado");
    const mismatched=draft();mismatched.nodes[0].children[0].text="outro";
    expect(()=>validateDraft(mismatched)).toThrow("divergentes");
  });
  it("recusa marcas não permitidas e dados volumosos",()=>{
    const invalid=draft();invalid.nodes[0].children[0].runs![0].marks=["bold","color" as "bold"];
    expect(()=>validateDraft(invalid)).toThrow("Marca");
    const oversized=draft();oversized.nodes[0].children[0].text="x".repeat(1_000_001);
    expect(()=>validateDraft(oversized)).toThrow("tamanho");
  });
});
