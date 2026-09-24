// Migração aditiva, isolada: NÃO altera provisions, placements ou versões históricas.
// Executar apenas após revisão e backup do banco de destino.
import pg from "pg";
const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL não configurada: migração não executada.");
const hostname=new URL(databaseUrl).hostname;
const ssl=["localhost","127.0.0.1","::1"].includes(hostname)?false:{rejectUnauthorized:false};
const client=new pg.Client({connectionString:databaseUrl,ssl});
await client.connect();
try{
  await client.query("BEGIN");
  await client.query(`CREATE TABLE IF NOT EXISTS nova_mesa_drafts (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 0 CHECK(version >= 0),
    updated_by BIGINT REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await client.query(`CREATE TABLE IF NOT EXISTS nova_mesa_draft_versions (
    id BIGSERIAL PRIMARY KEY,
    draft_id TEXT NOT NULL REFERENCES nova_mesa_drafts(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    content JSONB NOT NULL,
    author_id BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(draft_id,version)
  )`);
  await client.query("COMMIT");
  console.log("Tabelas isoladas da nova minuta criadas/verificadas. Nenhum dispositivo histórico modificado.");
}catch(error){await client.query("ROLLBACK");throw error;}finally{await client.end();}
