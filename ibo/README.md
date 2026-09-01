# ESDRAS — Reforma do Estatuto da IBO (MVP)

Espaço de Sugestões, Deliberações, Revisões, Atas e Sistematização para a **Comissão de Reforma do Estatuto Social da Igreja Batista Olaria (IBO)**.

Aplicação web para análise do Estatuto dispositivo por dispositivo (capítulo → artigo → parágrafo → inciso → alínea), com texto vigente, proposta inicial de reforma, redação de trabalho, sugestões, comentários, pendências, fundamentação bíblica/doutrinária/jurídica, reuniões com deliberações e atas, histórico de versões, trilha de auditoria e geração automática do Estatuto consolidado.

Especificação completa: [`PRD_ESDRAS.md`](../PRD_ESDRAS.md).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Tailwind CSS 4** + **shadcn/ui**
- **SQLite** (better-sqlite3) — banco local; o PRD prevê migração futura para Supabase
- **Groq API** — ferramentas editoriais de IA e redação de minuta de ata (todas as chamadas no servidor)

## Como executar

Pré-requisitos: Node.js 20+.

```bash
npm install
npm run seed      # cria o banco data/esdras.db com o Estatuto importado
npm run dev       # http://localhost:3000
```

### Chave da Groq (IA)

Edite `.env.local` e preencha:

```
GROQ_API_KEY=sua-chave-aqui
```

Sem a chave, o sistema funciona normalmente; os botões de IA retornam "GROQ_API_KEY não configurada".

## Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@ibo.local` | `admin123` |
| Coordenador / Relator | `coordenador@ibo.local` | `coord123` |
| Membro da Comissão (1–7) | `membro1@ibo.local` … `membro7@ibo.local` | `membro123` |

## O que foi importado

- **Estatuto registrado da IBO** (`Documentos fonte/Estatuto IBO (Registrado)_ocred (1).pdf`) → campo `texto_vigente`, com a estrutura hierárquica completa (8 capítulos, 33 artigos, 56 parágrafos, 58 incisos — 155 dispositivos).
- **Proposta de Reforma** (`Documentos fonte/Proposta de reforma...pdf`) → campos `proposta_inicial` e `justificativa`, preservando a lógica comparativa "Redação atual | Sugestão | Justificativa" do documento original.

## Funcionalidades do MVP (mapeamento com o PRD §46)

1. Autenticação (e-mail/senha, sessão JWT, sem cadastro público)
2. Perfis e permissões: Administrador, Coordenador/Relator, Membro
3. Estrutura hierárquica de capítulos/dispositivos com `parent_id` (PRD §5.1)
4. Texto vigente (não editável)
5. Proposta inicial (não editável)
6. Redação de trabalho com controle de versão e detecção de conflito de concorrência (PRD §41)
7. Sugestões com status (aberta → aceita/rejeitada/etc., PRD §11)
8. Comentários em dispositivos e sugestões (PRD §12)
9. Justificativas
10. Referências bíblicas (PRD §15)
11. Fundamentos doutrinários e jurídicos
12. Novos dispositivos (marcados como "proposta inicial" / "novo")
13. Histórico de versões (PRD §19)
14. Status/workflow (não iniciado → … → aprovado → reaberto, PRD §8)
15. Reuniões com modo reunião, presença e registro automático de eventos (PRD §21–24)
16. Deliberações com código `DEC-AAAA-MM-DD-NNN-NNN` (PRD §25)
17. Geração de minuta de ata a partir dos registros (PRD §27), com opção de redação por IA restrita aos fatos registrados (PRD §28)
18. IA editorial: revisar gramática, melhorar clareza, linguagem estatutária, simplificar, revisar justificativa — sempre como sugestão com "Aplicar" explícito (PRD §31–32)
19. Estatuto consolidado (somente dispositivos aprovados, PRD §34)
20. Exportações: consolidado, quadro comparativo, relatório da reforma, fundamentação, histórico da comissão, atas (PRD §35)
21. Trilha de auditoria (PRD §20)

## Estrutura do projeto

```
app/
  (app)/                # área autenticada
    page.tsx            # Painel da Reforma (progresso + navegação)
    dispositivo/[id]/   # tela de análise do dispositivo
    reunioes/           # módulo reuniões, deliberações e atas
    pendentes/          # questões pendentes
    consolidado/        # Estatuto consolidado
    relatorios/         # exportações
    auditoria/          # trilha de auditoria
    admin/              # usuários (somente administrador)
  actions/              # Server Actions (lógica de negócio + autorização)
  api/ai/               # proxy Groq (servidor)
  api/export/           # downloads de relatórios
lib/
  schema.sql            # modelo de dados (SQLite)
  seed-data/*.json      # Estatuto + Proposta estruturados por capítulo
  db.ts, auth.ts, data.ts, labels.ts, types.ts
scripts/seed.mjs        # cria/recria o banco com dados iniciais
```

## Decisões de arquitetura

- **Integridade > histórico > simplicidade > colaboração > estética** (PRD §50): nenhuma contribuição sobrescreve outra; toda alteração da redação de trabalho gera versão; decisões mantêm vínculo com reunião e dispositivo.
- Banco local SQLite para o MVP; o `lib/schema.sql` segue o modelo conceitual do PRD §39 para facilitar a migração ao Supabase (PostgreSQL + Auth + RLS).
- IA exclusivamente assistiva: resposta sempre rotulada como "Sugestão gerada por IA — revisar antes de incorporar", aplicação explícita pelo usuário, chave apenas no servidor.

## Limitações conhecidas (fora do escopo do MVP)

Sem Supabase (Realtime/RLS), sem edição Google Docs-like, sem renumerador automático com alerta de referências internas, sem assinatura digital. Veja PRD §45.