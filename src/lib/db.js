import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool;
let local;

export async function sql(text, params = []) {
  if (databaseUrl !== "") {
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

async function startLocal() {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) await db.exec(await readFile(`migrations/${file}`, "utf8"));
  return db;
}
