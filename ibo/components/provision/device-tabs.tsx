"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldHelper } from "@/components/field-helper";
import { RichTextContent } from "@/components/rich-text-content";
import { REFERENCE_TYPE_LABELS } from "@/lib/labels";
import { WorkingTextEditor } from "@/components/provision/working-text-editor";
import { PersonalNoteForm } from "@/components/provision/personal-note-form";
import {
  StatusControl,
  SuggestionForm,
  SuggestionItem,
  CommentForm,
  CommentList,
  PendingForm,
  PendingItem,
  ReferenceForm,
  VoteButtons,
  JustificativaEditor,
  HistoricalTextEditor,
  NewProvisionForm,
  ProvisionAdminActions,
  RelationForm,
  type RelationDeviceOption,
} from "@/components/provision/provision-forms";
import type { Suggestion, Comment, PendingIssue } from "@/lib/types";

type TabKey = "analise" | "colaboracao" | "pendencias" | "historico";

interface Version {
  version: number;
  content: string;
  reason: string | null;
  author_name: string | null;
  created_at: string;
  meeting_id: number | null;
}

interface Props {
  id: string;
  prov: {
    type: string;
    origem: string;
    alteracao_tipo: string;
    status: string;
    texto_vigente: string;
    proposta_inicial: string;
    redacao_trabalho: string;
    justificativa: string;
    redacao_consolidada: string;
    version: number;
  };
  canEditWork: boolean;
  canManage: boolean;
  canFixExtraction: boolean;
  directChildren: number;
  parentType: string | null;
  suggestions: Suggestion[];
  sugVotesMap: Record<number, Record<string, number>>;
  mySugVotesMap: Record<number, string>;
  comments: Comment[];
  pendings: PendingIssue[];
  references: { id: number; tipo: string; texto: string }[];
  versions: Version[];
  relations: { related_id: string; type: string; numero: string | null }[];
  devices: RelationDeviceOption[];
  votes: { opinion: string; c: number }[];
  myVote: string | null;
  votedCount: number;
  personalNote: string;
}

function NumBadge({ n, className }: { n: string; className?: string }) {
  return (
    <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold", className)}>
      {n}
    </span>
  );
}

export function DeviceTabs(props: Props) {
  const { id, prov, canEditWork, canManage, canFixExtraction } = props;
  const [tab, setTab] = useState<TabKey>("analise");

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "analise", label: "Análise" },
    { key: "colaboracao", label: "Colaboração", count: props.suggestions.length + props.comments.length },
    { key: "pendencias", label: "Pendências", count: props.pendings.length },
    { key: "historico", label: "Histórico" },
  ];

  return (
    <div className="space-y-5">
      {canManage && (
        <details className="rounded-xl border bg-card">
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            Administração
          </summary>
          <div className="space-y-4 border-t p-4">
            <NewProvisionForm parentId={id} parentType={prov.type} canEdit={canManage} />
            <ProvisionAdminActions
              provisionId={id}
              origem={prov.origem}
              childCount={props.directChildren}
              canEdit={canManage}
              alteracaoTipo={prov.alteracao_tipo}
              type={prov.type}
              parentType={props.parentType}
            />
          </div>
        </details>
      )}

      <div className="sticky top-0 z-10 -mx-1 border-b bg-background/95 px-1 pb-px backdrop-blur">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(tab === "analise" ? "space-y-4" : "hidden")}>
        <Card>
          <CardContent className="space-y-2 pt-5">
            <StatusControl provisionId={id} status={prov.status} canEdit={canManage} />
            <FieldHelper>
              Fluxo de trabalho: Não iniciado → Em análise → Em discussão → Redação definida → Aprovado. Aprovar congela a redação consolidada.
            </FieldHelper>
          </CardContent>
        </Card>

        <Card className="border-slate-300/70 bg-slate-100/50 dark:border-slate-700/60 dark:bg-slate-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <NumBadge n="1" className="bg-slate-400 text-white" />
              Texto vigente
              <Badge variant="outline" className="text-[10px] text-slate-500">documento histórico — não editável</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HistoricalTextEditor
              provisionId={id}
              campo="texto_vigente"
              texto={prov.texto_vigente}
              canEdit={canFixExtraction}
              emptyLabel="Não existe no estatuto registrado."
            />
            <FieldHelper>É o texto atual do Estatuto registrado — apenas referência. Não precisa de ação.</FieldHelper>
          </CardContent>
        </Card>

        <Card className="border-amber-300/70 bg-amber-50/40 dark:border-amber-700/60 dark:bg-amber-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <NumBadge n="2" className="bg-amber-500 text-white" />
              Proposta inicial
              <Badge variant="outline" className="border-amber-200 bg-amber-100/60 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                preliminar — ponto de partida
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <HistoricalTextEditor
              provisionId={id}
              campo="proposta_inicial"
              texto={prov.proposta_inicial}
              canEdit={canFixExtraction}
              emptyLabel="Sem alteração proposta (manter redação)."
            />
            <FieldHelper>Ponto de partida da reforma. Edite aqui o texto proposto — use negrito ou destaque para marcar o que muda.</FieldHelper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <NumBadge n="3" className="bg-muted text-muted-foreground" />
              Justificativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <JustificativaEditor provisionId={id} initial={prov.justificativa} canEdit={canManage} />
            <FieldHelper>Explique o porquê da alteração. Alimenta o Relatório da reforma.</FieldHelper>
          </CardContent>
        </Card>

        <Card className="border-blue-300/70 bg-blue-50/40 dark:border-blue-700/60 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <NumBadge n="4" className="bg-primary text-primary-foreground" />
              Redação de trabalho
              <Badge variant="outline" className="border-blue-200 bg-blue-100/60 text-[10px] text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                versão atual da comissão
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <WorkingTextEditor
              provisionId={id}
              initialText={prov.redacao_trabalho}
              version={prov.version}
              canEdit={canEditWork}
              compararTexto={prov.texto_vigente}
            />
            <FieldHelper>Redação que a comissão está trabalhando. Cada salvar cria nova versão no histórico.</FieldHelper>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <NumBadge n="5" className="bg-muted text-muted-foreground" />
              Opinião consultiva
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <VoteButtons provisionId={id} currentOpinion={props.myVote} />
            <FieldHelper>Manifestação consultiva dos membros sobre o dispositivo — não é a votação formal da comissão.</FieldHelper>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{props.votedCount} membro(s) se manifestaram. Caráter consultivo — não constitui votação formal da comissão.</span>
              {props.votes.map((v) => (
                <span key={v.opinion} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${v.opinion === "concordo" ? "bg-emerald-500" : v.opinion === "discordo" ? "bg-red-500" : "bg-amber-500"}`} />
                  {v.opinion}: {v.c}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <NumBadge n="6" className="bg-muted text-muted-foreground" />
              Dispositivos relacionados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldHelper>Dispositivos vinculados a este — úteis para evitar contradições e detectar renumeração.</FieldHelper>
            <RelationForm provisionId={id} devices={props.devices} relations={props.relations} canManage={canManage} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <NumBadge n="7" className="bg-muted text-muted-foreground" />
              Fundamentação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReferenceForm provisionId={id} />
            <FieldHelper>Referências que sustentam a proposta — bíblicas, doutrinárias, jurídicas ou pastorais.</FieldHelper>
            <div className="grid gap-4 sm:grid-cols-2">
              {(["biblica", "doutrinaria", "juridica", "pastoral"] as const).map((tipo) => {
                const list = props.references.filter((r) => r.tipo === tipo);
                return (
                  <div key={tipo} className="rounded-lg border bg-muted/30 p-3">
                    <h4 className="mb-1.5 text-sm font-semibold">{REFERENCE_TYPE_LABELS[tipo]}</h4>
                    {list.length ? (
                      <ul className="space-y-1 text-sm">
                        {list.map((r) => (
                          <li key={r.id} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                            <span className="text-muted-foreground">{r.texto}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">—</p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {prov.redacao_consolidada && (
          <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <NumBadge n="✓" className="bg-emerald-600 text-white" />
                Redação consolidada (aprovada)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <RichTextContent text={prov.redacao_consolidada} />
              <FieldHelper>Texto final aprovado — entra no Estatuto consolidado e fica bloqueado.</FieldHelper>
            </CardContent>
          </Card>
        )}
      </div>

      <div className={cn(tab === "colaboracao" ? "space-y-4" : "hidden")}>
        <PersonalNoteForm provisionId={id} initial={props.personalNote} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sugestões de redação</CardTitle>
            <Badge variant="secondary">{props.suggestions.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <SuggestionForm provisionId={id} />
            <FieldHelper>Membros propõem o que mudar no texto; o coordenador decide o destino de cada sugestão de redação.</FieldHelper>
            {props.suggestions.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma sugestão de redação ainda.</p>}
            {props.suggestions.map((s) => (
              <SuggestionItem
                key={s.id}
                sug={s}
                canManage={canManage}
                votes={props.sugVotesMap[s.id]}
                myVote={props.mySugVotesMap[s.id]}
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comentários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CommentForm provisionId={id} suggestionId={null} />
            <FieldHelper>Discussão livre sobre o dispositivo — troca de ideias entre os membros.</FieldHelper>
            <CommentList comments={props.comments} />
          </CardContent>
        </Card>
      </div>

      <div className={cn(tab === "pendencias" ? "space-y-4" : "hidden")}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Pendências</CardTitle>
            <Badge variant="secondary">{props.pendings.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <PendingForm provisionId={id} />
            <FieldHelper>Questões em aberto que precisam ser verificadas antes de aprovar o dispositivo.</FieldHelper>
            {props.pendings.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma pendência registrada.</p>}
            {props.pendings.map((p) => <PendingItem key={p.id} p={p} />)}
          </CardContent>
        </Card>
      </div>

      <div className={cn(tab === "historico" ? "space-y-4" : "hidden")}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de versões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FieldHelper>Registro de todas as versões da redação de trabalho, com autor e motivo de cada alteração.</FieldHelper>
            {props.versions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma alteração registrada ainda. Versão 0 (inicial).</p>
            ) : (
              <ol className="relative space-y-4 border-l pl-5">
                {props.versions.map((v) => (
                  <li key={v.version} className="relative">
                    <span className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background" />
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline" className="font-mono">v{v.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {v.author_name || "—"} · {new Date(v.created_at + "Z").toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {v.reason && <p className="mb-1 text-xs font-medium text-muted-foreground">{v.reason}</p>}
                      {v.content ? (
                        <RichTextContent text={v.content} className="text-sm text-foreground/90" />
                      ) : (
                        <p className="text-sm italic text-muted-foreground">(versão sem texto — redação inicial)</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
