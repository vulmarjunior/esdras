"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { autosaveRedacao, sobrescreverRedacao, updateRedacao } from "@/app/actions/provision";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Check, CloudUpload, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { RichTextContent } from "@/components/rich-text-content";
import { Markdown } from "@/components/markdown";
import { htmlToText, plainToHtml } from "@/lib/rich-text";
import { lerRascunhoSalvo, registrarRascunhoSalvo } from "@/lib/draft-cache";

const AI_TOOLS = [
  { key: "gramatica", label: "Revisar gramática" },
  { key: "clareza", label: "Melhorar clareza" },
  { key: "estatutario", label: "Linguagem estatutária" },
  { key: "simplificar", label: "Simplificar redação" },
  { key: "comparar", label: "Comparar com vigente", needsComparar: true },
  { key: "valida_tecnica", label: "Checklist técnico (LC 95)" },
];

const DEBOUNCE_MS = 1500;

type SaveState = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";

interface Props {
  provisionId: string;
  initialText: string;
  version: number;
  canEdit: boolean;
  compararTexto?: string;
  editorMinHeightClass?: string;
  /** Modo compacto no fluxo do documento: sem IA, sem motivo e sem checkpoint. */
  inline?: boolean;
}

/**
 * Editor de redação com autosave (RF-08). A persistência corrente grava a redação
 * de trabalho com fila serializada e debounce, sem criar versão histórica a cada
 * tecla; checkpoints recuperáveis continuam sendo criados por "Salvar versão",
 * conclusão e restauração. Em conflito, o texto do servidor é apresentado para
 * revisão manual — nunca há sobrescrita silenciosa.
 */
export function WorkingTextEditor({
  provisionId,
  initialText,
  version,
  canEdit,
  compararTexto,
  editorMinHeightClass,
  inline = false,
}: Props) {
  const [text, setText] = useState(() => lerRascunhoSalvo(provisionId, version)?.texto ?? initialText);
  const [reason, setReason] = useState("");
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiTool, setAiTool] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [checkpointSaving, setCheckpointSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedVersion, setSavedVersion] = useState(() => lerRascunhoSalvo(provisionId, version)?.versao ?? version);
  const [conflict, setConflict] = useState<{ version: number; content: string } | null>(null);
  const [draftLocal, setDraftLocal] = useState<string | null>(null);
  const router = useRouter();

  const textRef = useRef(text);
  const versionRef = useRef(savedVersion);
  const savedTextRef = useRef(text);
  const savingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const salvarRef = useRef<() => Promise<boolean>>(async () => true);
  const chaveDraft = `esdras-draft:${provisionId}`;

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const salvo = window.localStorage.getItem(chaveDraft);
    if (salvo && salvo !== initialText && htmlToText(salvo).trim()) {
      queueMicrotask(() => setDraftLocal(salvo));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveDraft]);

  async function salvarRascunho(): Promise<boolean> {
    if (!canEdit) return true;
    if (savingRef.current) return false;
    const conteudo = textRef.current;
    if (!htmlToText(conteudo).trim()) return true;
    if (conteudo === savedTextRef.current) return true;
    savingRef.current = true;
    setSaveState("saving");
    let res;
    try {
      res = await autosaveRedacao(provisionId, conteudo, versionRef.current);
    } catch {
      savingRef.current = false;
      window.localStorage.setItem(chaveDraft, conteudo);
      setSaveState("error");
      return false;
    }
    savingRef.current = false;
    if (res.conflict) {
      window.localStorage.setItem(chaveDraft, conteudo);
      setConflict({ version: res.version ?? versionRef.current, content: res.serverContent ?? "" });
      setSaveState("conflict");
      return false;
    }
    if (res.error) {
      window.localStorage.setItem(chaveDraft, conteudo);
      setSaveState("error");
      return false;
    }
    savedTextRef.current = conteudo;
    if (res.version) {
      versionRef.current = res.version;
      setSavedVersion(res.version);
    }
    registrarRascunhoSalvo(provisionId, conteudo, res.version ?? versionRef.current);
    window.localStorage.removeItem(chaveDraft);
    setSaveState("saved");
    router.refresh();
    if (textRef.current !== conteudo) {
      setTimeout(() => void salvarRef.current(), 0);
    }
    return true;
  }

  useEffect(() => {
    salvarRef.current = salvarRascunho;
  });

  useEffect(() => {
    if (!canEdit || text === savedTextRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void salvarRef.current(), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, canEdit]);

  useEffect(() => {
    return () => {
      if (canEdit && textRef.current !== savedTextRef.current && htmlToText(textRef.current).trim()) {
        void autosaveRedacao(provisionId, textRef.current, versionRef.current);
      }
    };
  }, [canEdit, provisionId]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (textRef.current !== savedTextRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => setSaveState("idle"), 2500);
    return () => clearTimeout(timer);
  }, [saveState]);

  const plainText = htmlToText(text);

  function alterarTexto(html: string) {
    setText(html);
    if (html !== savedTextRef.current) setSaveState("pending");
  }

  async function runAi(toolKey: string) {
    setAiLoading(true);
    setAiTool(toolKey);
    try {
      const isChecklist = toolKey === "valida_tecnica";
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isChecklist
            ? { action: "valida_tecnica", texto: plainText, rotulo: "Redação de trabalho" }
            : {
                action: "editorial",
                tool: toolKey,
                text: plainText,
                comparar: toolKey === "comparar" ? htmlToText(compararTexto || "") : undefined,
              }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na IA");
      setAiResult(data.result);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao consultar a IA.");
    } finally {
      setAiLoading(false);
    }
  }

  async function salvarCheckpoint() {
    setCheckpointSaving(true);
    let res;
    try {
      res = await updateRedacao(provisionId, textRef.current, versionRef.current, reason);
    } catch {
      setCheckpointSaving(false);
      toast.error("Não foi possível salvar a versão. Tente novamente.");
      return;
    }
    setCheckpointSaving(false);
    if (res.conflict) {
      setConflict({ version: res.version ?? versionRef.current, content: res.serverContent ?? "" });
      setSaveState("conflict");
      return;
    }
    if (res.error) {
      toast.error(res.error);
      return;
    }
    savedTextRef.current = textRef.current;
    if (res.version) {
      versionRef.current = res.version;
      setSavedVersion(res.version);
    }
    registrarRascunhoSalvo(provisionId, textRef.current, res.version ?? versionRef.current);
    window.localStorage.removeItem(chaveDraft);
    setSaveState("saved");
    setReason("");
    toast.success(res.message || "Versão salva.");
    router.refresh();
  }

  function recarregarServidor() {
    if (!conflict) return;
    setText(conflict.content);
    textRef.current = conflict.content;
    savedTextRef.current = conflict.content;
    versionRef.current = conflict.version;
    setSavedVersion(conflict.version);
    window.localStorage.removeItem(chaveDraft);
    setDraftLocal(null);
    setConflict(null);
    setSaveState("idle");
    toast.success("Versão do servidor recarregada.");
  }

  async function manterMeuTexto() {
    if (!conflict) return;
    setCheckpointSaving(true);
    let res;
    try {
      res = await sobrescreverRedacao(provisionId, textRef.current, conflict.version);
    } catch {
      setCheckpointSaving(false);
      toast.error("Não foi possível registrar o texto. Tente novamente.");
      return;
    }
    setCheckpointSaving(false);
    if (res.error && !res.ok) return toast.error(res.error);
    savedTextRef.current = textRef.current;
    if (res.version) {
      versionRef.current = res.version;
      setSavedVersion(res.version);
    }
    registrarRascunhoSalvo(provisionId, textRef.current, res.version ?? versionRef.current);
    window.localStorage.removeItem(chaveDraft);
    setDraftLocal(null);
    setConflict(null);
    setSaveState("saved");
    toast.success("Texto mantido e registrado como nova versão.");
    router.refresh();
  }

  function restaurarDraft() {
    if (!draftLocal) return;
    setText(draftLocal);
    textRef.current = draftLocal;
    setDraftLocal(null);
    setSaveState("pending");
  }

  function descartarDraft() {
    window.localStorage.removeItem(chaveDraft);
    setDraftLocal(null);
  }

  const estadoSalvamento = (() => {
    if (saveState === "saving") return { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, texto: "Salvando…", classe: "text-muted-foreground" };
    if (saveState === "pending") return { icon: <CloudUpload className="h-3.5 w-3.5" />, texto: "Alterações não salvas", classe: "text-amber-700 dark:text-amber-300" };
    if (saveState === "saved") return { icon: <Check className="h-3.5 w-3.5" />, texto: "Salvo", classe: "text-emerald-700 dark:text-emerald-300" };
    if (saveState === "error") return { icon: <AlertTriangle className="h-3.5 w-3.5" />, texto: "Falha ao salvar — texto preservado neste navegador", classe: "text-red-700 dark:text-red-300" };
    if (saveState === "conflict") return { icon: <AlertTriangle className="h-3.5 w-3.5" />, texto: "Conflito de versão", classe: "text-red-700 dark:text-red-300" };
    return null;
  })();

  return (
    <div className="space-y-3">
      {draftLocal && (
        <Alert>
          <AlertTitle>Rascunho local recuperado</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Há um texto não confirmado salvo neste navegador para este dispositivo.</p>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={restaurarDraft}>Restaurar rascunho</Button>
              <Button type="button" size="sm" variant="outline" onClick={descartarDraft}>Descartar</Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {conflict && (
        <Alert variant="destructive">
          <AlertTitle>Conflito de versão</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Este dispositivo foi alterado por outra sessão (versão {conflict.version}). Compare o texto
              do servidor abaixo e escolha: recarregar ou manter o seu texto explicitamente.
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border bg-background p-3">
              {conflict.content.trim() ? (
                <RichTextContent text={conflict.content} className="text-sm" />
              ) : (
                <p className="text-xs italic text-muted-foreground">Sem texto no servidor.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={recarregarServidor} disabled={checkpointSaving}>
                <RotateCcw /> Recarregar do servidor
              </Button>
              <Button type="button" size="sm" onClick={manterMeuTexto} disabled={checkpointSaving}>
                {checkpointSaving && <Loader2 className="animate-spin" />}
                Manter meu texto (sobrescrever)
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {canEdit ? (
        <RichTextEditor
          value={text}
          onChange={alterarTexto}
          onBlur={() => void salvarRef.current()}
          placeholder="Redação de trabalho ainda não definida."
          minHeightClass={editorMinHeightClass}
        />
      ) : (
        <RichTextContent text={text} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {canEdit && estadoSalvamento ? (
            <span className={`inline-flex items-center gap-1 font-medium ${estadoSalvamento.classe}`}>
              {estadoSalvamento.icon}
              {estadoSalvamento.texto}
            </span>
          ) : (
            <>Versão atual: {savedVersion}</>
          )}
        </span>
        {canEdit && inline && (
          <span className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              Autosave ativo · criar ponto recuperável:
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={salvarCheckpoint}
              disabled={checkpointSaving || !plainText.trim()}
              title="Cria uma versão recuperável no histórico, sem interromper a escrita"
            >
              {checkpointSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar versão {savedVersion + 1}
            </Button>
          </span>
        )}
        {canEdit && !inline && (
          <span className="text-xs text-muted-foreground">
            Autosave ativo · o texto é salvo enquanto você escreve; versões históricas são criadas em “Salvar versão”.
          </span>
        )}
      </div>

      {canEdit && !inline && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-violet-500" /> IA:
            </span>
            {AI_TOOLS.map((t) => (
              <Button
                key={t.key}
                type="button"
                variant="outline"
                size="sm"
                disabled={aiLoading || !plainText.trim() || (t.needsComparar && !htmlToText(compararTexto || "").trim())}
                onClick={() => runAi(t.key)}
              >
                {aiLoading && aiTool === t.key && <Loader2 className="h-3 w-3 animate-spin" />}
                {t.label}
              </Button>
            ))}
          </div>

          {aiResult && (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-violet-800 dark:text-violet-200">
                <Sparkles className="h-4 w-4" />
                {aiTool === "valida_tecnica"
                  ? "Checklist de técnica legislativa — gerado por IA, revisar antes de agir."
                  : "Sugestão gerada por IA — revisar antes de incorporar."}
              </p>
              <Markdown className="mb-3 rounded-lg bg-white/70 p-3 font-serif dark:bg-black/20">{aiResult}</Markdown>
              <div className="flex gap-2">
                {aiTool !== "valida_tecnica" && (
                  <Button type="button" size="sm" onClick={() => { alterarTexto(plainToHtml(aiResult)); setAiResult(null); }}>
                    <Check className="mr-1 h-4 w-4" /> Aplicar sugestão
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => setAiResult(null)}>
                  <X className="mr-1 h-4 w-4" /> Descartar
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da alteração (registrado no histórico)"
              className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none ring-ring transition-shadow focus:ring-2"
            />
            <Button type="button" onClick={salvarCheckpoint} disabled={checkpointSaving || !plainText.trim()}>
              {checkpointSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar versão {savedVersion + 1}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
