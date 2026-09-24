PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','coordenador','membro')),
  phone TEXT,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provisions (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL DEFAULT 'projeto-ibo',
  type TEXT NOT NULL CHECK (type IN ('capitulo','secao','artigo','paragrafo','inciso','alinea')),
  numero TEXT,
  titulo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ordem_pai INTEGER NOT NULL DEFAULT 0,
  origem TEXT NOT NULL DEFAULT 'original' CHECK (origem IN ('original','novo')),
  -- Anotação de trabalho: referência manual ao dispositivo de origem no Estatuto
  -- registrado (define o chip "era N" e o texto apresentado na aba Origem).
  -- Vazio + sem_origem = 0 → correspondência automática (próprio número).
  origem_ref_id TEXT REFERENCES provisions(id) ON DELETE SET NULL,
  sem_origem INTEGER NOT NULL DEFAULT 0 CHECK (sem_origem IN (0,1)),
  alteracao_tipo TEXT NOT NULL DEFAULT 'nao_avaliado' CHECK (alteracao_tipo IN ('nao_avaliado','mantido','alteracao_redacional','alteracao_material','novo','revogado','desmembrado','incorporado','reorganizado')),
  status TEXT NOT NULL DEFAULT 'nao_iniciado' CHECK (status IN ('nao_iniciado','em_analise','em_discussao','redacao_definida','aprovado','reaberto')),
  texto_vigente TEXT NOT NULL DEFAULT '',
  proposta_inicial TEXT NOT NULL DEFAULT '',
  redacao_trabalho TEXT NOT NULL DEFAULT '',
  justificativa TEXT NOT NULL DEFAULT '',
  redacao_consolidada TEXT NOT NULL DEFAULT '',
  posicao_sugerida TEXT,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_provisions_parent ON provisions(parent_id);
CREATE INDEX IF NOT EXISTS idx_provisions_ordem ON provisions(ordem);

-- Localização independente por versão do documento. A identidade do dispositivo
-- permanece em `provisions`; esta tabela permite que a proposta mova e renumere
-- dispositivos sem alterar a estrutura histórica do Estatuto vigente.
CREATE TABLE IF NOT EXISTS provision_placements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  version_key TEXT NOT NULL CHECK (version_key IN ('vigente','proposta','consolidada')),
  parent_id TEXT REFERENCES provisions(id) ON DELETE SET NULL,
  numero TEXT,
  titulo TEXT,
  ordem_pai INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER REFERENCES users(id),
  UNIQUE (version_key, provision_id)
);

CREATE INDEX IF NOT EXISTS idx_provision_placements_version_parent
  ON provision_placements(version_key, parent_id, ordem_pai);

CREATE TABLE IF NOT EXISTS provision_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  reason TEXT,
  meeting_id INTEGER,
  author_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provision_id, version)
);

CREATE TABLE IF NOT EXISTS suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  texto TEXT NOT NULL,
  justificativa TEXT,
  onde_esta TEXT,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_discussao','aceita','aceita_parcialmente','rejeitada','retirada')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id),
  provision_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
  pending_id INTEGER,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pending_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES users(id),
  categoria TEXT NOT NULL CHECK (categoria IN ('juridica','biblica','doutrinaria','eclesiologica','administrativa','redacao','referencia_cruzada','outra')),
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','resolvida')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS references_tb (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('biblica','doutrinaria','juridica','pastoral')),
  texto TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provision_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  related_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  UNIQUE (provision_id, related_id)
);

CREATE TABLE IF NOT EXISTS votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  provision_id TEXT REFERENCES provisions(id) ON DELETE CASCADE,
  suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
  opinion TEXT NOT NULL CHECK (opinion IN ('concordo','discordo','ressalva')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_provision ON votes(user_id, provision_id) WHERE suggestion_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_votes_suggestion ON votes(user_id, suggestion_id) WHERE suggestion_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  data TEXT NOT NULL,
  horario TEXT,
  local TEXT,
  pauta TEXT,
  coordenador_id INTEGER REFERENCES users(id),
  secretario_id INTEGER REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'planejada' CHECK (status IN ('planejada','em_andamento','encerrada')),
  started_at TEXT,
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meeting_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  presente INTEGER NOT NULL DEFAULT 0,
  UNIQUE (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS meeting_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  hora TEXT NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meeting_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  provision_id TEXT REFERENCES provisions(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL,
  texto TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS minutes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','em_revisao','aprovada')),
  conteudo TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS minutes_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  minutes_id INTEGER NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  opinion TEXT NOT NULL CHECK (opinion IN ('concordo','correcao','ressalva')),
  content TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS minutes_retifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  minutes_id INTEGER NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS personal_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provision_id TEXT NOT NULL REFERENCES provisions(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provision_id, user_id)
);

-- Biblioteca de literatura de consulta (livros doutrinários). O conteúdo é
-- importado pelo Admin (MD/TXT/EPUB) e dividido em seções; `busca` guarda o
-- texto normalizado (sem acentos) para a busca e a recuperação por IA.
CREATE TABLE IF NOT EXISTS library_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  autor TEXT,
  ano INTEGER,
  fonte TEXT,
  resumo TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS library_sections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES library_books(id) ON DELETE CASCADE,
  ordem_pai INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL,
  busca TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_library_sections_book ON library_sections(book_id, ordem_pai);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
