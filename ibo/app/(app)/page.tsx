import Link from "next/link";
import {redirect} from "next/navigation";
import {getSessionUser} from "@/lib/auth";
import {loadNovaMesaDraft} from "@/app/actions/nova-mesa-draft";
import {statusOf,type DraftNode} from "@/lib/nova-mesa-poc/model";
import {BookOpen,PenLine,FileText,Archive,CalendarDays,Library,ArrowRight,CheckCircle2} from "lucide-react";

export const dynamic="force-dynamic";
function count(nodes:DraftNode[]){
  const result={chapters:0,articles:0,apreciados:0,emAnalise:0,pendentes:0,devices:0};
  const visit=(items:DraftNode[])=>{for(const n of items){
    result.devices++;if(n.type==="chapter")result.chapters++;
    if(n.type==="article")result.articles++;
    const status=statusOf(n);
    if(status==="aprovado")result.apreciados++;else if(status==="em_analise")result.emAnalise++;else result.pendentes++;
    visit(n.children);
  }};visit(nodes);return result;
}
export default async function HomePage(){
  const user=await getSessionUser();
  if(!user||user.must_change_password)redirect("/login");
  const canEdit=user.role==="admin"||user.role==="coordenador";
  let stats:ReturnType<typeof count>|null=null;
  let updatedAt:string|null=null;
  try{const snapshot=await loadNovaMesaDraft();stats=count(snapshot.draft.nodes);updatedAt=snapshot.updatedAt;}
  catch{ /* Apresentação inicial permanece disponível caso a minuta esteja temporariamente indisponível. */ }
  const primary=canEdit?"/mesa-trabalho":"/mesa-trabalho/visualizar";
  return <div className="mx-auto max-w-5xl space-y-6">
    <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">ESDRAS · Reforma do Estatuto Social</p>
      <h2 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">Minuta do novo Estatuto</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Acompanhe a redação e a apreciação do texto pela comissão. A Mesa de Trabalho é o ambiente principal da reforma.</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link href={primary} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"><PenLine className="h-4 w-4"/>{canEdit?"Continuar na Mesa de Trabalho":"Visualizar a minuta"}<ArrowRight className="h-4 w-4"/></Link>
        {canEdit&&<Link href="/mesa-trabalho/visualizar" className="inline-flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium"><FileText className="h-4 w-4"/>Visualizar a minuta</Link>}
      </div>
    </section>
    <section aria-label="Andamento da nova minuta" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-card p-5"><span className="text-xs text-muted-foreground">Capítulos na nova minuta</span><p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.chapters??"—"}</p></div>
      <div className="rounded-xl border bg-card p-5"><span className="text-xs text-muted-foreground">Artigos na nova minuta</span><p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.articles??"—"}</p></div>
      <div className="rounded-xl border bg-card p-5"><span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5"/>Apreciação dos dispositivos</span><p className="mt-2 text-3xl font-semibold tabular-nums">{stats?.apreciados??"—"}</p><p className="mt-1 text-xs text-muted-foreground">{stats?.emAnalise??"—"} em análise · {stats?.pendentes??"—"} pendentes · entre {stats?.devices??"—"} dispositivos</p></div>
    </section>
    <p className="text-xs text-muted-foreground">{updatedAt?"Última gravação da minuta: "+new Date(updatedAt).toLocaleString("pt-BR",{timeZone:"America/Porto_Velho"}):"Os dados de acompanhamento serão exibidos quando a minuta estiver disponível."} · Os indicadores acima não incluem o ambiente legado.</p>
    <section className="grid gap-3 sm:grid-cols-2">
      <Link href="/documentos" className="flex items-center gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted"><BookOpen className="h-5 w-5 text-primary"/><span><strong className="block text-sm">Documentos de consulta</strong><span className="text-xs text-muted-foreground">Estatuto e materiais de referência</span></span><ArrowRight className="ml-auto h-4 w-4"/></Link>
      <Link href="/reunioes" className="flex items-center gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted"><CalendarDays className="h-5 w-5 text-primary"/><span><strong className="block text-sm">Reuniões</strong><span className="text-xs text-muted-foreground">Acompanhamento da comissão</span></span><ArrowRight className="ml-auto h-4 w-4"/></Link>
      <Link href="/literatura" className="flex items-center gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted"><Library className="h-5 w-5 text-primary"/><span><strong className="block text-sm">Literatura de consulta</strong><span className="text-xs text-muted-foreground">Referências para a redação</span></span><ArrowRight className="ml-auto h-4 w-4"/></Link>
      <Link href="/legado" className="flex items-center gap-3 rounded-xl border bg-card p-5 transition-colors hover:bg-muted"><Archive className="h-5 w-5 text-primary"/><span><strong className="block text-sm">Arquivo e legado</strong><span className="text-xs text-muted-foreground">Registros e ferramentas do ambiente anterior</span></span><ArrowRight className="ml-auto h-4 w-4"/></Link>
    </section>
  </div>;
}
