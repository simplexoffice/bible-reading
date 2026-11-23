import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { sql, withClient } from "./db.js";

const CHAPTER_KEY = /^\d{1,3}:\d{1,3}$/;
let seedTask;

function hashToken(token, salt) {
  return createHash("sha256").update(salt).update("\0").update(token).digest();
}

function matches(token, row) {
  const next = hashToken(token, row.salt);
  const prev = Buffer.from(row.key_hash, "hex");
  return next.length === prev.length && timingSafeEqual(next, prev);
}

export function ensureSeed() {
  seedTask ??= seed().catch((error) => {
    seedTask = undefined;
    throw error;
  });
  return seedTask;
}

async function seed() {
  await withClient(async (q) => {
    await q("select pg_advisory_xact_lock(7272742)");
    const rows = await q("select count(*)::int as n from sessions");
    if (Number(rows[0].n) > 0) return;
    // Seed with owner's actual progress: 71 sessions done (1-71), chapters 5:5 and 5:6
    await q("insert into sessions (n, done) select n, n <= 71 from generate_series(1, 365) as n");
    await q("insert into chapters (key) values ('5:5'), ('5:6')");
  });
}

export async function gate(token) {
  if (typeof token !== "string" || token.length < 1 || token.length > 128) return { error: "unauthorized" };
  return withClient(async (q) => {
    const rows = await q("select salt, key_hash from sync_key where id = 1");
    if (!rows.length) return { error: "unconfigured" };
    return matches(token, rows[0]) ? { ok: true } : { error: "unauthorized" };
  });
}

export async function claim(token) {
  if (typeof token !== "string" || token.length < 1 || token.length > 128) return { error: "unauthorized" };
  return withClient(async (q) => {
    const rows = await q("select salt, key_hash from sync_key where id = 1");
    if (!rows.length) {
      const salt = randomBytes(16).toString("hex");
      const keyHash = hashToken(token, salt).toString("hex");
      const inserted = await q(
        "insert into sync_key (id, salt, key_hash) values (1, $1, $2) on conflict (id) do nothing returning id",
        [salt, keyHash],
      );
      if (inserted.length) return { ok: true, claimed: true };
      const winner = await q("select salt, key_hash from sync_key where id = 1");
      return matches(token, winner[0]) ? { ok: true } : { error: "unauthorized" };
    }
    return matches(token, rows[0]) ? { ok: true } : { error: "unauthorized" };
  });
}

export async function readState() {
  const doneRows = await sql("select n from sessions where done = true order by n");
  const chapterRows = await sql("select key from chapters order by key");
  return {
    done: doneRows.map((row) => Number(row.n)),
    chapters: chapterRows.map((row) => String(row.key)),
  };
}

export async function saveProgress(body) {
  const hasChapter = body.chapter != null && body.chapter !== "";
  const hasSession = body.n != null && body.n !== "";
  const keep = Array.isArray(body.keep) ? body.keep.map((key) => String(key)) : [];
  if (keep.length > 16) return { error: "too many chapters" };
  if (!hasChapter && !hasSession && !keep.length) return { error: "nothing to save" };
  const chapter = hasChapter ? String(body.chapter) : "";
  if ((hasChapter && !CHAPTER_KEY.test(chapter)) || keep.some((key) => !CHAPTER_KEY.test(key))) {
    return { error: "bad chapter" };
  }
  let n = 0;
  if (hasSession) {
    n = Number(body.n);
    if (!(n >= 1 && n <= 365)) return { error: "bad session number" };
  }
  const changes = [];
  if (hasChapter) changes.push({ key: chapter, read: body.read === true });
  keep.forEach((key) => changes.push({ key, read: true }));
  await withClient(async (q) => {
    for (const change of changes) {
      if (change.read) await q("insert into chapters (key) values ($1) on conflict (key) do nothing", [change.key]);
      else await q("delete from chapters where key = $1", [change.key]);
    }
    if (hasSession) await q("update sessions set done = $2 where n = $1", [n, body.done === true]);
  });
  return { ok: true };
}
