import Link from "next/link";
import {redirect} from "next/navigation";
import {getSessionUser} from "@/lib/auth";
import {Archive,ArrowRight,BookOpenText,History,ListOrdered,ClipboardCheck,ShieldAlert} from "lucide-react";
export default async function LegacyArchive(){
  const user=await getSessionUser();if(!user||user.must_change_password)redirect("/login");
  const editor=user.role==="admin"||user.role==="coordenador";
  const links=[
    {href:"/legado/painel",title:"Painel clássico",description:"Indicadores e árvore da proposta anterior.",icon:History},
    {href:"/consolidado",title:"Proposta anterior",description:"Texto em construção no ambiente anterior.",icon:BookOpenText},
    {href:"/comparativo",title:"Acompanhamento anterior",description:"Comparativo da proposta histórica.",icon:Archive},
    ...(editor?[
      {href:"/legado/mesa-atual",title:"Mesa de trabalho anterior",description:"Redação e registros mantidos para consulta.",icon:BookOpenText},
      {href:"/pendentes",title:"Pendências anteriores",description:"Pendências associadas à estrutura legada.",icon:ClipboardCheck},
      {href:"/conferencia",title:"Conferência anterior",description:"Ferramenta do fluxo antigo; não altera a nova minuta.",icon:ClipboardCheck},
      {href:"/renumeracao",title:"Renumeração anterior",description:"Opera no modelo antigo, não na nova Mesa.",icon:ListOrdered},
      {href:"/coerencia",title:"Coerência anterior",description:"Ferramenta vinculada à proposta histórica.",icon:ShieldAlert},
      {href:"/marcos",title:"Marcos anteriores",description:"Registros do ambiente clássico.",icon:History}
    ]:[])
  ];
  return <div className="mx-auto max-w-4xl space-y-5">
    <header className="rounded-2xl border bg-card p-6"><span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Archive className="h-4 w-4"/>Arquivo do projeto</span><h2 className="mt-2 font-heading text-2xl font-semibold">Ambiente anterior · Legado</h2><p className="mt-2 text-sm text-muted-foreground">O trabalho anterior permanece preservado para consulta. As ferramentas abaixo operam sobre a estrutura histórica, não sobre a minuta da nova Mesa.</p><Link href="/" className="mt-4 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">Voltar ao início</Link></header>
    <div className="grid gap-3 sm:grid-cols-2">{links.map(({href,title,description,icon:Icon})=><Link key={href} href={href} className="flex items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"/><span className="flex-1"><strong className="block text-sm">{title}</strong><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground"/></Link>)}</div>
  </div>;
}
