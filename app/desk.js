"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PLAN, TOTAL, sessionByNumber, sessionChapters } from "../src/lib/reading";
import { LIBRARY } from "../src/lib/research";
import { Horizon } from "./horizon";
import { LibraryPanel } from "./library-panel";
import { ReadingPanel } from "./reading-panel";
import { SessionIndex } from "./session-index";
import { YearLine } from "./year-line";

const API = "/api/progress";
const KEY = "cbr-sync-key";
const LAST = "cbr-last";
const THEME = "cbr-theme";
const TRAIL = "cbr-trail";

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

function readTrail() {
  try {
    const items = JSON.parse(readStorage(TRAIL) || "[]");
    if (!Array.isArray(items)) return [];
    return items.filter((item) => (
      item && typeof item.label === "string" && typeof item.href === "string" && item.href.startsWith("https://wol.jw.org/")
    )).slice(0, 8);
  } catch (error) { return []; }
}

async function postRecord(body) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: JSON.stringify(body),
  });
  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("unreachable");
  }
  if (data?.ok === true || data?.error === "nothing to save") return data;
  throw new Error(data?.error || "unreachable");
}

export default function Desk() {
  const [done, setDone] = useState(seedDone);
  const [chapters, setChapters] = useState(seedChapters);
  const [view, setView] = useState(72);
  const [chip, setChip] = useState(0);
  const [syncKey, setSyncKey] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState("Saved progress is on this device until you save a sync key.");
  const [statusKind, setStatusKind] = useState("");
  const [theme, setTheme] = useState("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const [changingKey, setChangingKey] = useState(false);
  const [trail, setTrail] = useState([]);
  const writing = useRef(false);

  const session = sessionByNumber(view);
  const era = PLAN.eras[session.era];
  const chips = useMemo(() => sessionChapters(session), [session]);
  const chapterSet = useMemo(() => new Set(chapters), [chapters]);
  const doneSet = useMemo(() => new Set(done), [done]);
  const selected = chips[Math.min(chip, Math.max(chips.length - 1, 0))];
  const resume = useMemo(() => {
    for (let n = 1; n <= TOTAL; n += 1) {
      if (!doneSet.has(n)) return n === view ? null : n;
    }
    return null;
  }, [doneSet, view]);

  useEffect(() => {
    const storedTheme = readStorage(THEME) || document.documentElement.dataset.theme;
    const nextTheme = storedTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    const hashed = Number(window.location.hash.replace("#", ""));
    const last = Number(readStorage(LAST));
    const start = hashed >= 1 && hashed <= TOTAL ? hashed : last >= 1 && last <= TOTAL ? last : 72;
    setView(start);
    setTrail(readTrail());
    const key = readStorage(KEY);
    if (!key) return;
    setSyncKey(key);
    setDraftKey(key);
    setStatus("Checking shared progress…");
  }, []);

  useEffect(() => {
    if (!syncKey) return undefined;
    let stopped = false;
    async function pull() {
      if (writing.current || stopped) return;
      try {
        const response = await fetch(API, { headers: { "x-sync-key": syncKey } });
        const data = await response.json();
        if (stopped || writing.current) return;
        if (data?.error === "unauthorized") {
          writeStorage(KEY, "");
          setSyncKey("");
          setStatus("That sync key was not accepted.");
          setStatusKind("is-error");
          return;
        }
        if (!data?.ok) throw new Error(data?.error || "unreachable");
        setDone(data.done || []);
        setChapters(data.chapters || []);
        setStatus("Shared progress is in sync.");
        setStatusKind("is-saved");
      } catch (error) {
        if (stopped || writing.current) return;
        setStatus("The shared record did not answer. Checks stay on this device.");
        setStatusKind("is-error");
      }
    }
    pull();
    const timer = setInterval(pull, 30000);
    function onShow() {
      if (document.visibilityState === "visible") pull();
    }
    document.addEventListener("visibilitychange", onShow);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [syncKey]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(event) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      document.getElementById("menuButton")?.focus();
    }
    function onClick(event) {
      if (event.target.closest(".menu")) return;
      setMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [menuOpen]);

  function go(next, focus) {
    const n = Math.min(TOTAL, Math.max(1, next));
    setView(n);
    setChip(0);
    writeStorage(LAST, String(n));
    if (window.location.hash !== `#${n}`) window.history.replaceState(null, "", `#${n}`);
    if (focus) document.getElementById("title")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function onEra(index) {
    if (index < 0 || index >= PLAN.eras.length || index === session.era) return;
    const found = PLAN.sessions.find((item) => item.era === index);
    if (found) go(found.n, true);
  }

  function applyTheme(next) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    writeStorage(THEME, next);
  }

  function trackLookup(event) {
    const link = event.target.closest("a[data-track]");
    if (!link || !link.href.startsWith("https://wol.jw.org/")) return;
    const href = link.href;
    const label = link.dataset.track;
    setTrail((current) => {
      const next = [{ label, href }, ...current.filter((item) => item.href !== href)].slice(0, 8);
      writeStorage(TRAIL, JSON.stringify(next));
      return next;
    });
  }

  async function saveKey(event) {
    event.preventDefault();
    const key = draftKey.trim();
    if (!key || key.length > 128) {
      setStatus("Enter a sync key of at most 128 characters.");
      setStatusKind("is-error");
      return;
    }
    setStatus("Saving the sync key…");
    setStatusKind("");
    try {
      const data = await postRecord({ token: key });
      writeStorage(KEY, key);
      setSyncKey(key);
      setDone(data.done || []);
      setChapters(data.chapters || []);
      setChangingKey(false);
      setStatus(data.claimed ? "Saved on this browser. Type this same key on your other device." : "Shared progress is in sync.");
      setStatusKind("is-saved");
    } catch (error) {
      setStatus(error.message === "unauthorized" ? "That sync key was not accepted." : "The shared record did not answer. Checks stay on this device.");
      setStatusKind("is-error");
    }
  }

  async function toggleChapter(item) {
    const read = !chapterSet.has(item.key);
    const nextChapters = read ? [...chapters, item.key] : chapters.filter((key) => key !== item.key);
    const keys = chips.map((chipItem) => chipItem.key);
    const fully = keys.length > 0 && keys.every((key) => nextChapters.includes(key));
    const wasDone = doneSet.has(session.n);
    const nextDone = fully ? (wasDone ? done : [...done, session.n]) : done.filter((n) => n !== session.n);
    setChapters(nextChapters);
    setDone(nextDone);
    if (!syncKey) {
      setStatus("Add a sync key to keep this check on your other device.");
      setStatusKind("");
      return;
    }
    const body = { token: syncKey, chapter: item.key, read };
    if (fully !== wasDone) {
      body.n = session.n;
      body.done = fully;
      if (!fully) body.keep = keys.filter((key) => nextChapters.includes(key));
    }
    setStatus("Saving…");
    setStatusKind("");
    writing.current = true;
    try {
      const data = await postRecord(body);
      setDone(data.done || []);
      setChapters(data.chapters || []);
      setStatus("Shared progress is saved.");
      setStatusKind("is-saved");
    } catch (error) {
      setStatus("The shared record did not answer. Checks stay on this device.");
      setStatusKind("is-error");
    } finally {
      writing.current = false;
    }
  }

  return (
    <div className="wrap" onClick={trackLookup}>
      <a className="skip" href="#title">Skip to the session</a>
      <Horizon
        eraIndex={session.era}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onEra={onEra}
        theme={theme}
        onTheme={applyTheme}
        trail={trail}
      />
      <header>
        <p className="kicker">Reading desk</p>
        <h1>Chronological Bible Reading</h1>
        <p className="lede">365 numbered sessions follow the order of events, so a missed day never puts you behind. Background opens on the English publications library, shelf by shelf.</p>
        <p className="progress" id="progressText">{done.length} of {TOTAL} read</p>
        <div className="bar" id="bar" role="progressbar" aria-valuemin={0} aria-valuemax={TOTAL} aria-valuenow={done.length} aria-label="Sessions read">
          <span id="barFill" style={{ width: `${(done.length / TOTAL) * 100}%` }} />
        </div>
      </header>
      <ReadingPanel
        session={session}
        era={era}
        chips={chips}
        chipIndex={chip}
        chapterSet={chapterSet}
        onChip={setChip}
        onToggleChapter={toggleChapter}
        onPrev={() => go(view - 1, true)}
        onNext={() => go(view + 1, true)}
        resume={resume}
        onResume={() => resume && go(resume, true)}
      />
      <LibraryPanel session={session} query={selected?.query || ""} />
      <YearLine view={view} doneSet={doneSet} onPick={(n) => go(n, true)} />
      <SessionIndex view={view} eraIndex={session.era} doneSet={doneSet} onPick={(n) => go(n, true)} />
      <footer>
        {syncKey && !changingKey ? (
          <div className="sync-key">
            <p className="menu-label">Sync key</p>
            <p className="menu-note">Saved on this browser. Progress keeps syncing, so you do not need to enter it again.</p>
            <p className={`menu-note sync-key-status${statusKind ? ` ${statusKind}` : ""}`} id="syncLine" role="status">{status}</p>
            <button type="button" onClick={() => setChangingKey(true)}>Change key</button>
          </div>
        ) : (
          <form id="syncKeyForm" className="sync-key" onSubmit={saveKey}>
            <label className="menu-label" htmlFor="syncKey">Sync key</label>
            <div className="sync-key-row">
              <input
                id="syncKey"
                type={reveal ? "text" : "password"}
                autoComplete="off"
                maxLength={128}
                spellCheck={false}
                aria-describedby="syncLine"
                value={draftKey}
                onChange={(event) => setDraftKey(event.target.value)}
              />
              <button type="button" id="syncKeyReveal" onClick={() => setReveal((shown) => !shown)}>{reveal ? "Hide" : "Show"}</button>
              <button type="submit">Save</button>
              {syncKey ? <button type="button" onClick={() => setChangingKey(false)}>Cancel</button> : null}
            </div>
            <p className={`menu-note sync-key-status${statusKind ? ` ${statusKind}` : ""}`} id="syncLine" role="status">{status}</p>
          </form>
        )}
        <p>The sync key stays in this browser. Checks keep syncing with the shared reading record. Publication text stays on <a href={LIBRARY}>Watchtower Online Library</a>.</p>
      </footer>
    </div>
  );
}
