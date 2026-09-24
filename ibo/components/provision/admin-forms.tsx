"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PROVISION_TYPE_LABELS } from "@/lib/labels";
import type { DispositivoOption } from "@/lib/data";
import {
  createProvision,
  updateProvision,
  deleteProvision,
  setAlteracaoTipo,
  setOrigemReferencia,
  setTagNovo,
} from "@/app/actions/provision";
import { ConfirmDialog, type ConfirmDialogState } from "@/components/confirm-dialog";
import { SubmitBtn } from "@/components/provision/submit-btn";

function agruparPorCapitulo(options: DispositivoOption[]): [string, DispositivoOption[]][] {
  const mapa = new Map<string, DispositivoOption[]>();
  for (const option of options) {
    const lista = mapa.get(option.chapter) ?? [];
    lista.push(option);
    mapa.set(option.chapter, lista);
  }
  return [...mapa.entries()];
}

export function NewProvisionForm({
  parentId,
  parentType,
  canEdit,
  types,
  label = "Incluir dispositivo",
  origemOptions,
  onCreated,
  afterId,
  siblingOptions,
  defaultOpen = false,
}: {
  parentId: string | null;
  parentType: string;
  canEdit: boolean;
  types?: string[];
  label?: string;
  origemOptions?: DispositivoOption[];
  onCreated?: (id: string) => void;
  /** Posição fixa de inserção: undefined = fim; null = início; id = após o irmão. */
  afterId?: string | null;
  /** Irmãos do destino para escolher a posição (quando afterId não é fixo). */
  siblingOptions?: { id: string; label: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const onlyType = types?.length === 1 ? types[0] : "";
  const [form, setForm] = useState({ tipo: onlyType, numero: "", titulo: "", texto: "", justificativa: "", origemRefId: "" });
  const [posicao, setPosicao] = useState<string>("__fim__");
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const origemGroups = useMemo(() => agruparPorCapitulo(origemOptions ?? []), [origemOptions]);

  const allowed: Record<string, string[]> = {
    capitulo: ["secao", "artigo"],
    secao: ["artigo"],
    artigo: ["paragrafo", "inciso", "alinea"],
    paragrafo: ["inciso", "alinea"],
    inciso: ["alinea"],
    alinea: ["item"],
    item: [],
  };
  const tipos = types || (parentId ? allowed[parentType] || [] : ["capitulo", "secao", "artigo"]);
  const tipoEfetivo = form.tipo || onlyType;
  const estrutural = tipoEfetivo === "capitulo" || tipoEfetivo === "secao";

  if (!canEdit) return null;

  async function submit() {
    setPending(true);
    const posicaoEfetiva =
      afterId !== undefined
        ? afterId
        : posicao === "__fim__"
          ? undefined
          : posicao === "__inicio__"
            ? null
            : posicao;
    const res = await createProvision(parentId, form.tipo, form.texto, form.justificativa, form.titulo, form.numero, form.origemRefId || undefined, posicaoEfetiva);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo criado.");
    setForm({ tipo: onlyType, numero: "", titulo: "", texto: "", justificativa: "", origemRefId: "" });
    setPosicao("__fim__");
    setOpen(false);
    if (res.id && onCreated) {
      onCreated(res.id);
    } else {
      router.refresh();
    }
    if (res.id && !onCreated) {
      setTimeout(() => router.push(`/dispositivo/${res.id}`), 400);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="border-primary/30 text-primary hover:bg-primary/5">
        {label}
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="text-sm font-medium">Novo dispositivo</p>
      {tipos.length === 1 ? (
        <p className="rounded-md border bg-background px-3 py-2 text-sm">
          Tipo: <strong>{PROVISION_TYPE_LABELS[tipos[0]]}</strong>
        </p>
      ) : (
        <select
          value={form.tipo}
          onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
        >
          <option value="">Escolha o tipo...</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{PROVISION_TYPE_LABELS[t]}</option>
          ))}
        </select>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={form.numero}
          onChange={(e) => setForm({ ...form, numero: e.target.value })}
          placeholder="Número (provisório) — ex.: 2º, I, a)"
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
        <input
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          placeholder={estrutural ? "Título (obrigatório)" : "Título (capítulos/seções)"}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm"
        />
      </div>
      {afterId === undefined && siblingOptions && siblingOptions.length > 0 && (
        <label className="block space-y-1 text-xs font-medium">
          Posição da inserção
          <select
            value={posicao}
            onChange={(e) => setPosicao(e.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal"
          >
            <option value="__fim__">Ao final do trecho</option>
            <option value="__inicio__">No início do trecho</option>
            {siblingOptions.map((option) => (
              <option key={option.id} value={option.id}>Após {option.label}</option>
            ))}
          </select>
        </label>
      )}
      {estrutural ? (
        <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Capítulos e seções são identificados pelo título; o texto de corpo pertence aos artigos e dispositivos subordinados.
        </p>
      ) : (
        <textarea
          rows={3}
          value={form.texto}
          onChange={(e) => setForm({ ...form, texto: e.target.value })}
          placeholder="Texto do novo dispositivo (redação inicial da comissão)..."
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      )}
      <textarea
        rows={2}
        value={form.justificativa}
        onChange={(e) => setForm({ ...form, justificativa: e.target.value })}
        placeholder="Justificativa (opcional)"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      {origemGroups.length > 0 && (
        <label className="block space-y-1 text-xs font-medium">
          Origem (opcional — dispositivo do Estatuto registrado)
          <select
            value={form.origemRefId}
            onChange={(e) => setForm({ ...form, origemRefId: e.target.value })}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal"
          >
            <option value="">Automático / sem referência</option>
            {origemGroups.map(([capitulo, options]) => (
              <optgroup key={capitulo || "__sem_capitulo__"} label={capitulo || "Sem capítulo"}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <SubmitBtn label="Criar dispositivo" pending={pending} onClick={submit} />
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
        <span className="text-xs text-muted-foreground">
          Sem número definitivo — a numeração será definida na consolidação.
        </span>
      </div>
    </div>
  );
}

export function ProvisionAdminActions({
  provisionId,
  numero,
  titulo,
  origem,
  origemRefId,
  semOrigem,
  temVigente,
  origemOptions,
  childCount,
  canEdit,
  alteracaoTipo,
  type,
  parentType,
}: {
  provisionId: string;
  numero?: string | null;
  titulo?: string | null;
  origem: string;
  origemRefId: string | null;
  semOrigem: boolean;
  temVigente: boolean;
  origemOptions: DispositivoOption[];
  childCount: number;
  canEdit: boolean;
  alteracaoTipo: string;
  type?: string;
  parentType?: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [tagNovoPending, setTagNovoPending] = useState(false);
  const [origemPending, setOrigemPending] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);
  const [form, setForm] = useState({ numero: numero ?? "", titulo: titulo ?? "", posicaoSugerida: "", type: "" });
  const router = useRouter();
  const origemAtual = origemRefId ?? (semOrigem ? "__nenhuma__" : "__auto__");
  const origemGroups = useMemo(
    () => agruparPorCapitulo(origemOptions.filter((option) => option.id !== provisionId)),
    [origemOptions, provisionId]
  );

  const tiposValidos = useMemo(() => {
    const HIERARQUIA: Record<string, string[]> = {
      capitulo: ["secao", "artigo"],
      secao: ["artigo"],
      artigo: ["paragrafo", "inciso", "alinea"],
      paragrafo: ["inciso", "alinea"],
      inciso: ["alinea"],
      alinea: ["item"],
      item: [],
    };
    if (!parentType) return ["capitulo", "secao", "artigo"];
    return HIERARQUIA[parentType] || [];
  }, [parentType]);

  if (!canEdit) return null;

  async function save() {
    setPending(true);
    const res = await updateProvision(provisionId, { ...form, type: form.type || undefined });
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo atualizado.");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const res = await deleteProvision(provisionId);
    setPending(false);
    setConfirmState(null);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Dispositivo retirado da minuta.");
    router.push("/");
    router.refresh();
  }

  function askRemove() {
    const base =
      "O dispositivo será retirado da minuta por exclusão reversível: sugestões, comentários, pendências, referências, versões e vínculos são preservados e a restauração fica disponível na Mesa de Trabalho.";
    setConfirmState({
      title: "Retirar dispositivo da minuta",
      description:
        childCount > 0
          ? `Este dispositivo possui ${childCount} dispositivo(s) filho(s), que acompanham a retirada.\n\n${base}`
          : base,
      confirmLabel: "Retirar da minuta",
    });
  }

  async function toggleRevogado() {
    setPending(true);
    const target = alteracaoTipo === "revogado" ? "nao_avaliado" : "revogado";
    const res = await setAlteracaoTipo(provisionId, target);
    setPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Alteração salva.");
    router.refresh();
  }

  async function toggleTagNovo() {
    setTagNovoPending(true);
    const res = await setTagNovo(provisionId, origem !== "novo");
    setTagNovoPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Marcação atualizada.");
    router.refresh();
  }

  async function changeOrigem(destino: string) {
    setOrigemPending(true);
    const res = await setOrigemReferencia(provisionId, destino);
    setOrigemPending(false);
    if (res.error) return toast.error(res.error);
    toast.success(res.message || "Origem atualizada.");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {editing && (
        <div className="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:grid-cols-3">
          <label className="text-sm">
            Número (provisório)
            <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="Ex.: 2º, I, a — deixe vazio para 'NOVO'" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Título (capítulos/seções)
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          <label className="text-sm">
            Posição sugerida
            <input value={form.posicaoSugerida} onChange={(e) => setForm({ ...form, posicaoSugerida: e.target.value })} placeholder="Ex.: Após o atual Art. 12" className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" />
          </label>
          {type && tiposValidos.length > 0 && (
            <label className="text-sm sm:col-span-3">
              Classificação
              <select value={form.type || type} onChange={(e) => setForm({ ...form, type: e.target.value === type ? "" : e.target.value })} className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm">
                {tiposValidos.map((t) => (
                  <option key={t} value={t}>{PROVISION_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted-foreground">
                Altera o tipo do dispositivo. Filhos incompatíveis bloqueiam a troca.
              </span>
            </label>
          )}
          <div className="flex gap-2 sm:col-span-3">
            <SubmitBtn label="Salvar" pending={pending} onClick={save} />
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => { setForm({ numero: numero ?? "", titulo: titulo ?? "", posicaoSugerida: "", type: "" }); setEditing(!editing); }}>
          {editing ? "Fechar edição" : "Editar dispositivo"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
          onClick={askRemove}
        >
          Retirar da minuta
        </Button>
        {temVigente && (
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Para propor a supressão de regra vigente, marque-o como revogado.</span>
            <Button
              size="sm"
              variant={alteracaoTipo === "revogado" ? "default" : "outline"}
              disabled={pending}
              onClick={toggleRevogado}
              className={
                alteracaoTipo === "revogado"
                  ? "border-red-600 bg-red-600 text-white hover:bg-red-700"
                  : "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
              }
            >
              {alteracaoTipo === "revogado" ? "Desfazer revogação" : "Revogar dispositivo"}
            </Button>
          </span>
        )}
      </div>
      <div className="grid gap-3 rounded-xl border bg-muted/25 p-3 sm:grid-cols-2">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={origem === "novo"}
            disabled={tagNovoPending}
            onChange={toggleTagNovo}
          />
          <span>
            <span className="font-medium">Dispositivo novo</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Marca o selo &quot;novo&quot; nos documentos; não altera o histórico nem as regras de exclusão/revogação.
            </span>
          </span>
        </label>
        <label className="block space-y-1 text-xs font-medium">
          Origem no Estatuto registrado
          <select
            value={origemAtual}
            disabled={origemPending}
            onChange={(event) => changeOrigem(event.target.value)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm font-normal disabled:opacity-60"
          >
            <option value="__auto__">Automático (próprio número vigente)</option>
            <option value="__nenhuma__">Sem correspondente no Estatuto vigente</option>
            {origemGroups.map(([capitulo, options]) => (
              <optgroup key={capitulo || "__sem_capitulo__"} label={capitulo || "Sem capítulo"}>
                {options.map((option) => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>
      <ConfirmDialog state={confirmState} pending={pending} onConfirm={remove} onClose={() => setConfirmState(null)} />
    </div>
  );
}
