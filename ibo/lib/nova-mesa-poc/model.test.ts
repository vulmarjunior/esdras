import { describe, expect, it } from "vitest";
import { changeText, Draft, DraftNode, findNode, insertAfter, labelFor, moveNode, removeNode } from "./model";
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
});
