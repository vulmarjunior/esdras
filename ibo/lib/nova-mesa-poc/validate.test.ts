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
  it("aceita os três estados de apreciação e recusa valor desconhecido",()=>{
    const emAnalise=draft();emAnalise.nodes[0].children[0].status="em_analise";
    expect(validateDraft(emAnalise).nodes[0].children[0].status).toBe("em_analise");
    const apreciado=draft();apreciado.nodes[0].children[0].status="aprovado";
    expect(validateDraft(apreciado).nodes[0].children[0].status).toBe("aprovado");
    const invalido=draft();(invalido.nodes[0].children[0] as {status?:string}).status="em_revisao";
    expect(()=>validateDraft(invalido)).toThrow("Estado de apreciação");
  });
  it("converte a marcação legada approved e a remove do conteúdo salvo",()=>{
    const legado=draft();(legado.nodes[0].children[0] as {approved?:boolean}).approved=true;
    const normalizado=validateDraft(legado);
    expect(normalizado.nodes[0].children[0].status).toBe("aprovado");
    expect("approved" in normalizado.nodes[0].children[0]).toBe(false);
    const naoApreciado=draft();(naoApreciado.nodes[0].children[0] as {approved?:boolean}).approved=false;
    expect(validateDraft(naoApreciado).nodes[0].children[0].status).toBeUndefined();
    const quebrado=draft();(quebrado.nodes[0].children[0] as {approved?:unknown}).approved="sim";
    expect(()=>validateDraft(quebrado)).toThrow("Marcação de aprovação");
  });
  it("normaliza o ponto para revisão e recusa valores inválidos",()=>{
    const comPonto=draft();comPonto.nodes[0].children[0].revisao="  Conferir prazos.  ";
    expect(validateDraft(comPonto).nodes[0].children[0].revisao).toBe("Conferir prazos.");
    const vazio=draft();vazio.nodes[0].children[0].revisao="   ";
    expect(validateDraft(vazio).nodes[0].children[0].revisao).toBeUndefined();
    const quebrado=draft();(quebrado.nodes[0].children[0] as {revisao?:unknown}).revisao=42;
    expect(()=>validateDraft(quebrado)).toThrow("Ponto de revisão");
    const longo=draft();longo.nodes[0].children[0].revisao="x".repeat(2_001);
    expect(()=>validateDraft(longo)).toThrow("Ponto de revisão");
  });
  it("normaliza vínculos e recusa listas inválidas",()=>{
    const comVinculos=draft();comVinculos.nodes[0].children[0].vinculos=["art-1","art-1"," art-2 "];
    expect(validateDraft(comVinculos).nodes[0].children[0].vinculos).toEqual(["art-1","art-2"]);
    const vazios=draft();vazios.nodes[0].children[0].vinculos=["  "];
    expect(validateDraft(vazios).nodes[0].children[0].vinculos).toBeUndefined();
    const muitos=draft();muitos.nodes[0].children[0].vinculos=Array.from({length:11},(_,i)=>"provision-"+i);
    expect(()=>validateDraft(muitos)).toThrow("Vínculos");
    const quebrado=draft();(quebrado.nodes[0].children[0] as {vinculos?:unknown}).vinculos=[1];
    expect(()=>validateDraft(quebrado)).toThrow("Vínculo inválido");
  });
});
