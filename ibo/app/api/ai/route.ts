import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { all, get } from "@/lib/db";
import { formarGuia } from "@/lib/legal-refs";
import { montarContextoConsulta } from "@/lib/confissoes/recuperacao";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_CHAIN = [
  process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "openai/gpt-oss-20b",
].filter((m, i, arr) => m && arr.indexOf(m) === i);

const GUIA_CONTEXTO = formarGuia();
const GUIA_BLOCO = `\n\nReferências normativas (obrigatórias) — Lei Complementar nº 95/1998 e Manual de Redação da Presidência da República:\n${GUIA_CONTEXTO}`;

const TOOLS: Record<string, { system: string; prompt: (t: string) => string }> = {
  gramatica: {
    system:
      "Você é um revisor de textos jurídicos e eclesiásticos em português do Brasil. Corrija apenas ortografia, concordância, pontuação e sintaxe. Não altere o significado nem o estilo normativo. Devolva somente o texto corrigido.",
    prompt: (t) => `Corrija os erros gramaticais do texto a seguir, preservando o conteúdo:\n\n${t}`,
  },
  clareza: {
    system:
      "Você é um assistente de redação. Melhore a clareza do texto sem alterar seu significado. Mantenha o tom formal e institucional. Devolva somente o texto reescrito." + GUIA_BLOCO,
    prompt: (t) => `Reescreva o texto a seguir com mais clareza, sem mudar o sentido:\n\n${t}`,
  },
  estatutario: {
    system:
      "Você é especialista em redação estatutária de associações religiosas no Brasil. Sugira uma formulação mais normativa, formal e jurídica, mantendo o sentido. Devolva somente o texto sugerido." + GUIA_BLOCO,
    prompt: (t) => `Reescreva em linguagem estatutária formal e normativa:\n\n${t}`,
  },
  simplificar: {
    system:
      "Você é um redator. Simplifique o texto eliminando redundâncias e repetições, sem alterar o significado nem o tom formal. Devolva somente o texto simplificado." + GUIA_BLOCO,
    prompt: (t) => `Simplifique o texto eliminando redundâncias, mantendo o sentido:\n\n${t}`,
  },
  comparar: {
    system:
      "Você é um assistente de redação institucional. Compare duas redações de um mesmo dispositivo estatutário e aponte objetivamente as diferenças: o que mudou, o que foi incluído, removido ou reescrito. Não invente conteúdo. Devolva apenas o relatório das diferenças.",
    prompt: (t) => `Redação de referência:\n\n${t}`,
  },
  justificativa: {
    system:
      "Você é assistente de uma comissão de reforma estatutária. Melhore a clareza argumentativa de uma justificativa de alteração, mantendo os fatos. Devolva somente o texto melhorado." + GUIA_BLOCO,
    prompt: (t) => `Melhore a clareza argumentativa desta justificativa, sem inventar fatos:\n\n${t}`,
  },
};

async function callGroq(system: string, userPrompt: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error("GROQ_API_KEY não configurada.");
  }
  let lastError = "";
  for (const model of MODEL_CHAIN) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.3,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    } catch (e) {
      throw new Error(`Falha de rede ao chamar a Groq: ${e instanceof Error ? e.message : "erro desconhecido"}`);
    }
    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || "";
    }
    const body = await res.text();
    lastError = `Erro da API Groq (${res.status}) com ${model}: ${body.slice(0, 300)}`;
    const isModelMissing = res.status === 404 || /does not exist|model not found|not supported/i.test(body);
    if (!isModelMissing) {
      throw new Error(lastError);
    }
  }
  throw new Error(lastError || "Nenhum modelo Groq disponível.");
}

export async function POST(req: NextRequest) {
  const user = await requireRole("coordenador", "admin", "membro").catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  try {
    if (body.action === "editorial") {
      const tool = TOOLS[body.tool];
      if (!tool) {
        return NextResponse.json({ error: "Ferramenta desconhecida." }, { status: 400 });
      }
      const text = String(body.text || "").trim();
      if (!text) {
        return NextResponse.json({ error: "Texto vazio." }, { status: 400 });
      }
      let result: string;
      if (body.tool === "comparar") {
        const outro = String(body.comparar || "").trim();
        if (!outro) {
          return NextResponse.json({ error: "Texto de comparação vazio." }, { status: 400 });
        }
        result = await callGroq(tool.system, tool.prompt(text) + `\n\nOutra redação para comparar:\n\n${outro}`);
      } else {
        result = await callGroq(tool.system, tool.prompt(text));
      }
      return NextResponse.json({ result });
    }

    if (body.action === "coerencia") {
      const textos = Array.isArray(body.textos) ? body.textos.map((t: string) => String(t).trim()).filter(Boolean) : [];
      if (textos.length === 0) {
        return NextResponse.json({ error: "Nenhum dispositivo a analisar." }, { status: 400 });
      }
      const system =
        "Você é um revisor técnico de estatutos de associações religiosas. Analise a coerência dos dispositivos fornecidos procurando: duplicidades, contradições, nomenclaturas divergentes, competências conflitantes, conceitos indefinidos, referências internas incorretas e lacunas. Aponte APENAS alertas objetivos e acionáveis, citando o dispositivo. Não reescreva os textos nem invente conteúdo. Se não houver problemas, diga que a análise não encontrou alertas.";
      const result = await callGroq(system, `Analise a coerência destes dispositivos:\n\n${textos.join("\n\n")}`);
      return NextResponse.json({ result });
    }

    if (body.action === "duvida") {
      const pergunta = String(body.pergunta || "").trim();
      if (!pergunta) {
        return NextResponse.json({ error: "Digite sua dúvida." }, { status: 400 });
      }
      const system =
        "Você é um assessor de redação legislativa e estatutária em português do Brasil. Responda às dúvidas usando APENAS as regras fornecidas (Lei Complementar nº 95/1998 e Manual de Redação da Presidência da República), citando a fonte de cada orientação. Se a pergunta não for sobre redação ou técnica legislativa, diga que está fora do seu escopo. Seja objetivo e prático, com exemplos quando útil.";
      const result = await callGroq(system, `Regras de referência:\n\n${GUIA_CONTEXTO}\n\nPergunta: ${pergunta}`);
      return NextResponse.json({ result });
    }

    if (body.action === "valida_tecnica") {
      const texto = String(body.texto || "").trim();
      if (!texto) {
        return NextResponse.json({ error: "Texto vazio." }, { status: 400 });
      }
      const rotulo = String(body.rotulo || "").trim();
      const system =
        "Você aplica o checklist de técnica legislativa (Lei Complementar nº 95/1998 e Manual de Redação da Presidência da República) a um dispositivo estatutário. Aponte APENAS desvios objetivos e acionáveis em relação às regras (ex.: 'este artigo trata de mais de um assunto', 'use Parágrafo único', 'evite 'bem como' em enumeração', 'prefira ordem direta'). Não reescreva o texto. Formate em lista, citando a regra aplicável. Se não houver desvios, diga que o dispositivo está conforme.";
      const result = await callGroq(
        system,
        `Regras de referência:\n\n${GUIA_CONTEXTO}\n\n${rotulo ? `Dispositivo (${rotulo}):` : "Dispositivo:"}\n\n${texto}`
      );
      return NextResponse.json({ result });
    }

    if (body.action === "consulta_doutrinaria") {
      const pergunta = String(body.pergunta || "").trim();
      if (!pergunta) {
        return NextResponse.json({ error: "Digite sua pergunta." }, { status: 400 });
      }
      const contexto = montarContextoConsulta(pergunta);
      const system =
        "Você é um assessor doutrinário de uma comissão de reforma estatutária de uma igreja batista. Responda à pergunta APENAS com base nos documentos de fé fornecidos (confissões e declarações batistas), citando o nome da confissão e a seção correspondente. Se a pergunta não tiver cobertura nos documentos fornecidos, declare isso explicitamente e não invente conteúdo nem cite textos fora dos documentos. Seja objetivo, fiel ao texto e em português do Brasil.";
      const result = await callGroq(system, `${contexto}\n\nPergunta: ${pergunta}`);
      return NextResponse.json({ result });
    }

    if (body.action === "minuta") {
      const meetingId = Number(body.meetingId);
      const meeting = await get<{ numero: number; data: string; horario: string | null; local: string | null; pauta: string | null }>(
        "SELECT numero, data, horario, local, pauta FROM meetings WHERE id = ?",
        [meetingId]
      );
      if (!meeting) {
        return NextResponse.json({ error: "Reunião não encontrada." }, { status: 404 });
      }
      const presentes = await all<{ name: string }>(
        "SELECT u.name FROM meeting_members mm JOIN users u ON u.id = mm.user_id WHERE mm.meeting_id = ? AND mm.presente = 1 ORDER BY u.name",
        [meetingId]
      );
      const eventos = await all<{ hora: string; descricao: string }>(
        "SELECT hora, descricao FROM meeting_events WHERE meeting_id = ? ORDER BY id",
        [meetingId]
      );
      const decisoes = await all<{ code: string; texto: string }>(
        "SELECT code, texto FROM meeting_decisions WHERE meeting_id = ? ORDER BY id",
        [meetingId]
      );

      const facts = JSON.stringify({
        reuniao: meeting,
        presentes: presentes.map((p) => p.name),
        eventos,
        decisoes,
      });

      const system =
        "Você é secretário de uma comissão de reforma estatutária. Redija uma ata formal e sóbria. REGRA OBRIGATÓRIA: utilize exclusivamente os fatos fornecidos em JSON; não invente decisões, participantes, horários ou acontecimentos. Devolva somente a ata.";
      const result = await callGroq(system, `Redija a ata a partir destes fatos:\n\n${facts}`);
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
