import { describe, expect, it } from "vitest";
import { changeText, Draft, DraftNode, findNode, flattenDraft, insertAfter, labelFor, moveNode, removeNode, setRichText, setStatus, statusOf } from "./model";
const node=(id:string,type:DraftNode["type"],children:DraftNode[]=[]):DraftNode=>({id,type,text:id,children});
const base=():Draft=>({id:"nova",nodes:[node("cap","chapter",[node("a","article",[node("p1","paragraph")]),node("b","article")])]});
describe("modelo experimental da minuta independente",()=>{
 it("insere artigo mantendo identidades e ordem",()=>{
  const draft=insertAfter(base(),"cap","a",node("novo","article"));
  expect(draft.nodes[0].children.map(n=>n.id)).toEqual(["a","novo","b"]);
  expect(findNode(draft.nodes,"b")?.id).toBe("b");
 });
 it("muda entre parágrafo único e parágrafos numerados",()=>{
  const original=base(),a=original.nodes[0].children[0];
  expect(labelFor(a.children[0],a.children,1,1)).toBe("Parágrafo único. ");
  const changed=insertAfter(original,"a","p1",node("p2","paragraph"));
  const paragraphs=changed.nodes[0].children[0].children;
  expect(paragraphs.map(p=>labelFor(p,paragraphs,1,1))).toEqual(["§ 1º ","§ 2º "]);
 });
 it("move artigo sem trocar sua identidade ou seus subordinados",()=>{
  const moved=moveNode(base(),"a","cap","b");
  expect(moved.nodes[0].children.map(n=>n.id)).toEqual(["b","a"]);
  expect(findNode(moved.nodes,"a")?.children[0].id).toBe("p1");
 });
 it("recupera só texto do dispositivo, sem substituir parágrafos",()=>{
  const draft=changeText(base(),"a","Redação anterior");
  expect(findNode(draft.nodes,"a")?.text).toBe("Redação anterior");
  expect(findNode(draft.nodes,"p1")?.text).toBe("p1");
 });
 it("retira somente da minuta, sem modificar o original",()=>{
  const draft=base();expect(findNode(removeNode(draft,"a").nodes,"a")).toBeUndefined();
  expect(findNode(draft.nodes,"a")).toBeDefined();
 });
 it("rejeita movimentação circular",()=>expect(()=>moveNode(base(),"a","p1",null)).toThrow());
 it("rejeita parágrafo fora de artigo, inclusive via movimentação",()=>{
  expect(()=>insertAfter(base(),null,null,node("p2","paragraph"))).toThrow("Hierarquia");
  expect(()=>moveNode(base(),"p1","cap",null)).toThrow("Hierarquia");
 });
 it("rejeita identidades repetidas em subárvores",()=>{
  expect(()=>insertAfter(base(),"cap",null,node("novo","article",[node("p1","paragraph")]))).toThrow("duplicada");
 });
 it("aceita bloco livre dentro de artigo sem renumerar parágrafos",()=>{
  const draft=insertAfter(base(),"a","p1",node("rascunho","free"));
  expect(draft.nodes[0].children[0].children.map(n=>n.type)).toEqual(["paragraph","free"]);
  expect(labelFor(draft.nodes[0].children[0].children[0],draft.nodes[0].children[0].children,1,1)).toBe("Parágrafo único. ");
 });
 it("numera seções por capítulo e subseções por seção, sem reiniciar artigos",()=>{
  const first=node("c1","chapter",[
    node("s1","section",[node("ss1","subsection",[node("art1","article")]),node("ss2","subsection",[node("art2","article")])]),
    node("s2","section",[node("art3","article")])
  ]);
  const second=node("c2","chapter",[node("s3","section",[node("ss3","subsection",[node("art4","article")])])]);
  const draft:Draft={id:"nova",nodes:[first,second]};
  expect(labelFor(first.children[0],first.children,0,1)).toBe("Seção I");
  expect(labelFor(first.children[1],first.children,0,1)).toBe("Seção II");
  expect(labelFor(first.children[0].children[0],first.children[0].children,0,1)).toBe("Subseção I");
  expect(labelFor(first.children[0].children[1],first.children[0].children,0,1)).toBe("Subseção II");
  expect(labelFor(second.children[0],second.children,0,2)).toBe("Seção I");
  expect(findNode(draft.nodes,"art4")?.id).toBe("art4");
 });
 it("admite artigos em seção e subseção, mas não subseção diretamente no capítulo",()=>{
  const draft=insertAfter(base(),"cap",null,node("sec","section"));
  const withSub=insertAfter(draft,"sec",null,node("sub","subsection"));
  expect(insertAfter(withSub,"sub",null,node("art","article")).nodes[0].children[0].children[0].children[0].id).toBe("art");
  expect(()=>insertAfter(draft,"cap",null,node("invalid","subsection"))).toThrow("Hierarquia");
  expect(()=>moveNode(withSub,"sub","cap",null)).toThrow("Hierarquia");
 });
 it("registra e retira o estado de apreciação sem sujar o nó",()=>{
  const apreciado=setStatus(base(),"a","aprovado");
  expect(statusOf(findNode(apreciado.nodes,"a")!)).toBe("aprovado");
  const limpo=setStatus(apreciado,"a","pendente");
  expect(findNode(limpo.nodes,"a")?.status).toBeUndefined();
  expect(statusOf(findNode(limpo.nodes,"a")!)).toBe("pendente");
 });
 it("editar o texto de um dispositivo apreciado devolve para em análise",()=>{
  const apreciado=setStatus(base(),"a","aprovado");
  const editado=changeText(apreciado,"a","Redação nova");
  expect(statusOf(findNode(editado.nodes,"a")!)).toBe("em_analise");
 });
 it("formatação que não muda o texto preserva a apreciação",()=>{
  const apreciado=setStatus(base(),"a","aprovado");
  const formatado=setRichText(apreciado,"a",[{text:"a",marks:["bold"]}]);
  expect(statusOf(findNode(formatado.nodes,"a")!)).toBe("aprovado");
 });
 it("movimentação preserva o estado do dispositivo",()=>{
  const movido=moveNode(setStatus(base(),"a","em_analise"),"a","cap","b");
  expect(statusOf(findNode(movido.nodes,"a")!)).toBe("em_analise");
 });
 it("achata a árvore com pai, numeração e profundidade",()=>{
  const rows=flattenDraft(base());
  const artigo=rows.find(row=>row.node.id==="a")!;
  expect(artigo.parentId).toBe("cap");
  expect(artigo.depth).toBe(1);
  expect(artigo.articleNumber).toBe(1);
  const paragrafo=rows.find(row=>row.node.id==="p1")!;
  expect(paragrafo.parentId).toBe("a");
  expect(paragrafo.depth).toBe(2);
 });
});
