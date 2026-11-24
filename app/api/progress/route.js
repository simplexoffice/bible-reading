import { claim, ensureSeed, gate, readState, saveProgress } from "../../../src/lib/record.js";

export const dynamic = "force-dynamic";

function json(body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function tokenFrom(request, body) {
  const header = request.headers.get("x-sync-key");
  if (typeof header === "string" && header !== "") return header;
  if (body && typeof body.token === "string") return body.token;
  return "";
}

export async function GET(request) {
  try {
    await ensureSeed();
    const verdict = await gate(tokenFrom(request));
    if (verdict.error) return json({ ok: false, error: verdict.error });
    return json({ ok: true, ...(await readState()) });
  } catch (error) {
    console.error("progress get failed", error?.code || error?.name || "error");
    return json({ ok: false, error: "unavailable" });
  }
}

export async function POST(request) {
  const raw = await request.text();
  if (!raw || raw.length > 4096) return json({ ok: false, error: "bad request" }, 400);
  let body;
  try {
    body = JSON.parse(raw);
  } catch (error) {
    return json({ ok: false, error: "bad request" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false, error: "bad request" }, 400);
  try {
    await ensureSeed();
    const verdict = await claim(tokenFrom(request, body));
    if (verdict.error) return json({ ok: false, error: verdict.error });
    const saved = await saveProgress(body);
    const state = await readState();
    if (saved.error && saved.error !== "nothing to save") {
      return json({ ok: false, error: saved.error, claimed: verdict.claimed === true, ...state });
    }
    return json({ ok: true, claimed: verdict.claimed === true, ...state });
  } catch (error) {
    console.error("progress post failed", error?.code || error?.name || "error");
    return json({ ok: false, error: "unavailable" });
  }
}
