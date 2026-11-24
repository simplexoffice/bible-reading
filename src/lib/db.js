import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const databaseUrl = (process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "").trim();
let pool;
let local;
let schemaReady;

export async function sql(text, params = []) {
  if (databaseUrl !== "") {
    await ensureSchema();
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows;
  }
  local ??= startLocal().catch((error) => {
    local = undefined;
    throw error;
  });
  return (await (await local).query(text, params)).rows;
}

export async function withClient(fn) {
  if (databaseUrl !== "") {
    await ensureSchema();
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await fn((text, params = []) => client.query(text, params).then((res) => res.rows));
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
  local ??= startLocal().catch((error) => {
    local = undefined;
    throw error;
  });
  const db = await local;
  await db.query("begin");
  try {
    const result = await fn((text, params = []) => db.query(text, params).then((res) => res.rows));
    await db.query("commit");
    return result;
  } catch (error) {
    await db.query("rollback");
    throw error;
  }
}

function postgres() {
  pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
  return pool;
}

function ensureSchema() {
  schemaReady ??= applySchema().catch((error) => {
    schemaReady = undefined;
    throw error;
  });
  return schemaReady;
}

async function applySchema() {
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  const client = await postgres().connect();
  try {
    await client.query("set lock_timeout = '60s'");
    await client.query("select pg_advisory_lock(7272741)");
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const done = new Set((await client.query("select name from schema_migrations")).rows.map((row) => row.name));
    for (const file of files.filter((name) => !done.has(name))) {
      await client.query("begin");
      try {
        await client.query(await readFile(`migrations/${file}`, "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock(7272741)").catch(() => {});
    client.release();
  }
}

async function startLocal() {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) await db.exec(await readFile(`migrations/${file}`, "utf8"));
  return db;
}
