import Link from "next/link";
import {redirect} from "next/navigation";
import {getSessionUser} from "@/lib/auth";
import {loadNovaMesaDraft} from "@/app/actions/nova-mesa-draft";
import {labelFor,type DraftNode} from "@/lib/nova-mesa-poc/model";
import {NovaMesaStatusBadge} from "@/components/status-badge";
import ExportarDocumento from "@/components/nova-mesa-poc/exportar-dialog";

export const dynamic="force-dynamic";

function renderDocument(nodes:DraftNode[]){
  const rows:{node:DraftNode;label:string;depth:number}[]=[];
  let article=0,chapter=0;
  const walk=(siblings:DraftNode[],depth:number)=>{
    for(const node of siblings){
      if(node.type==="chapter")chapter++;
      if(node.type==="article")article++;
      rows.push({node,label:labelFor(node,siblings,article,chapter),depth});
      walk(node.children,depth+1);
    }
  };
  walk(nodes,0);
  return rows;
}

export default async function VisualizarNovaMesa(){
  const user=await getSessionUser();
  if(!user||user.must_change_password)redirect("/login");
  const snapshot=await loadNovaMesaDraft();
  const canEdit=user.role==="admin"||user.role==="coordenador";
  const rows=renderDocument(snapshot.draft.nodes);
  return <div className="mx-auto max-w-5xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Nova minuta do Estatuto</h1>
        <p className="text-sm text-muted-foreground">Visualização somente leitura · Versão {snapshot.version} · Minuta em elaboração · consulte a apreciação de cada dispositivo.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <ExportarDocumento versao={snapshot.version} origem="visualizar"/>
        {canEdit&&<Link href="/mesa-trabalho" className="rounded border px-3 py-2 text-sm">Abrir editor</Link>}
      </div>
    </header>
    <article aria-label="Minuta em elaboração" className="min-w-0 rounded-xl border bg-white p-5 text-zinc-900 shadow-sm sm:p-8">
      <h2 className="mb-7 text-center text-xl font-semibold">MINUTA DO ESTATUTO SOCIAL</h2>
      {rows.length===0?<p className="text-zinc-600">A minuta ainda não possui dispositivos.</p>:rows.map(row=><div key={row.node.id}
        className="my-3 min-w-0 whitespace-pre-wrap break-words leading-relaxed"
        style={{marginLeft:Math.min(row.depth,4)*16,textAlign:row.node.alignment??"left"}}>
        <strong>{row.label}</strong>{row.node.text}{row.node.status&&row.node.status!=="pendente"&&<NovaMesaStatusBadge status={row.node.status} className="ml-2 align-middle"/>}
      </div>)}
    </article>
  </div>;
}
