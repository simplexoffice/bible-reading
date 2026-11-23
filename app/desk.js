"use client";

import { useEffect, useMemo, useState } from "react";
import { PLAN, TOTAL, sessionByNumber, sessionChapters } from "../src/lib/reading";

const API = "/api/progress";
const KEY = "cbr-sync-key";
const LAST = "cbr-last";
const THEME = "cbr-theme";

const seedDone = () => Array.from({ length: 71 }, (_, index) => index + 1);
const seedChapters = () => ["5:5", "5:6"];

function readStorage(name) {
  try { return localStorage.getItem(name) || ""; } catch (error) { return ""; }
}

function writeStorage(name, value) {
  try {
    if (value) localStorage.setItem(name, value);
    else localStorage.removeItem(name);
  } catch (error) { /* this browser is not storing the desk */ }
}

async function postRecord(body) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data || data.ok !== true) throw new Error(data?.error || "unreachable");
  return data;
}

export default function Desk() {
  const [done, setDone] = useState(seedDone);
  const [chapters, setChapters] = useState(seedChapters);
  const [view, setView] = useState(72);
  const [syncKey, setSyncKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [status, setStatus] = useState("Saved progress is on this device until you save a sync key.");
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("light");

  const session = sessionByNumber(view);
  const era = PLAN.eras[session.era];
  const chips = useMemo(() => sessionChapters(session), [session]);
  const chapterSet = useMemo(() => new Set(chapters), [chapters]);
  const doneSet = useMemo(() => new Set(done), [done]);
  const percent = Math.round((done.length / TOTAL) * 100);

  useEffect(() => {
    const storedTheme = readStorage(THEME);
    const nextTheme = storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    const last = Number(readStorage(LAST));
    if (last >= 1 && last <= TOTAL) setView(last);
    const key = readStorage(KEY);
    if (!key) return;
    setSyncKey(key);
    setDraftKey(key);
    fetch(API, { headers: { "x-sync-key": key } })
      .then((response) => response.json())
      .then((data) => {
        if (!data?.ok) throw new Error(data?.error || "unreachable");
        setDone(data.done || []);
        setChapters(data.chapters || []);
        setStatus("Shared progress is in sync.");
      })
      .catch(() => setStatus("The shared record did not answer. Checks stay on this device."));
  }, []);

  function remember(next) {
    setView(next);
    writeStorage(LAST, String(next));
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    writeStorage(THEME, next);
  }

  async function saveKey(event) {
    event.preventDefault();
    const key = draftKey.trim();
    if (!key || key.length > 128) {
      setStatus("Enter a sync key of at most 128 characters.");
      return;
    }
    setStatus("Saving the sync key…");
    try {
      const data = await postRecord({ token: key });
      writeStorage(KEY, key);
      setSyncKey(key);
      setDone(data.done || []);
      setChapters(data.chapters || []);
      setStatus(data.claimed ? "Saved. Type this same key on your other device." : "Shared progress is in sync.");
    } catch (error) {
      setStatus(error.message === "unauthorized" ? "That sync key was not accepted." : "The shared record did not answer. Checks stay on this device.");
    }
  }

  async function toggleChapter(chip) {
    const read = !chapterSet.has(chip.key);
    const nextChapters = read ? [...chapters, chip.key] : chapters.filter((key) => key !== chip.key);
    const keys = chips.map((item) => item.key);
    const fully = keys.length > 0 && keys.every((key) => nextChapters.includes(key));
    const wasDone = doneSet.has(session.n);
    const nextDone = fully
      ? (wasDone ? done : [...done, session.n])
      : done.filter((n) => n !== session.n);
    setChapters(nextChapters);
    setDone(nextDone);
    if (!syncKey) {
      setStatus("Add a sync key to keep this check on your other device.");
      return;
    }
    const body = { token: syncKey, chapter: chip.key, read };
    if (fully !== wasDone) {
      body.n = session.n;
      body.done = fully;
      if (!fully) body.keep = keys.filter((key) => nextChapters.includes(key));
    }
    setStatus("Saving…");
    try {
      const data = await postRecord(body);
      setDone(data.done || []);
      setChapters(data.chapters || []);
      setStatus("Shared progress is saved.");
    } catch (error) {
      setStatus("The shared record did not answer. Checks stay on this device.");
    }
  }

  const matches = PLAN.sessions.filter((item) => {
    const text = `${item.n} ${item.note} ${(item.refs || []).map((ref) => ref.label).join(" ")}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }).slice(0, 40);

  return (
    <main className="wrap">
      <div className="top">
        <div>
          <p className="kicker">Reading desk</p>
          <h1>Chronological Bible Reading</h1>
          <p className="lede">{done.length} of {TOTAL} read · {percent}% of the year</p>
          <div className="bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        <button type="button" className="ghost" onClick={toggleTheme}>{theme === "dark" ? "Light" : "Dark"}</button>
      </div>

      <section className="card" aria-label="Sync">
        <form onSubmit={saveKey} className="row">
          <input
            type="password"
            value={draftKey}
            maxLength={128}
            autoComplete="off"
            placeholder="Sync key"
            aria-label="Sync key"
            onChange={(event) => setDraftKey(event.target.value)}
          />
          <button className="primary" type="submit">Save</button>
        </form>
        <p className="status" role="status">{status}</p>
      </section>

      <article className="card">
        <p className="kicker">Session {session.n} · {era.name}</p>
        <h2>{session.note ? session.note.charAt(0).toUpperCase() + session.note.slice(1) : era.name}</h2>
        <div className="chapters">
          {chips.map((chip) => (
            <label key={chip.key} className={chapterSet.has(chip.key) ? "chapter is-read" : "chapter"}>
              <input type="checkbox" checked={chapterSet.has(chip.key)} onChange={() => toggleChapter(chip)} />
              <a href={chip.href}>{chip.label}</a>
            </label>
          ))}
        </div>
        {(session.subjects || []).length > 0 && <p className="help">{session.subjects.join(" · ")}</p>}
        <div className="nav">
          <button type="button" onClick={() => remember(Math.max(1, view - 1))} disabled={view === 1}>Previous</button>
          <button type="button" onClick={() => remember(Math.min(TOTAL, view + 1))} disabled={view === TOTAL}>Next</button>
          {chips[0] && <a href={`https://wol.jw.org/en/wol/s/r1/lp-e?q=${encodeURIComponent(chips[0].query)}`}>Research {chips[0].query}</a>}
        </div>
      </article>

      <section className="card">
        <label htmlFor="find">Find a session</label>
        <input id="find" type="search" value={query} placeholder="Name, book, or number" onChange={(event) => setQuery(event.target.value)} />
        <div className="sessions">
          {matches.map((item) => (
            <button
              type="button"
              key={item.n}
              className={`session${doneSet.has(item.n) ? " is-done" : ""}${item.n === view ? " is-current" : ""}`}
              onClick={() => remember(item.n)}
            >
              {item.n}. {item.note || PLAN.eras[item.era].name}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
