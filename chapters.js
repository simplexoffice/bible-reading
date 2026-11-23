/* Which chapters are read. The shared record keeps each chapter; this browser keeps a copy. */
const CHAPTERS = "cbr-chapters";
const CHAPTERS_SYNCED = "cbr-chapters-synced";
let chapterSync = null;

function chapterKey(book, chapter) {
  return book + ":" + chapter;
}

function chapterKeyOk(key) {
  return typeof key === "string" && /^\d{1,3}:\d{1,3}$/.test(key);
}

function keysCoveredBySessions(doneSet) {
  const covered = new Set();
  doneSet.forEach((n) => {
    const session = PLAN.sessions[n - 1];
    if (session) sessionChapterKeys(session).forEach((key) => covered.add(key));
  });
  return covered;
}

function chaptersToUpload(serverKeys, doneSet) {
  if (store.get(CHAPTERS_SYNCED)) return [];
  const onServer = new Set(serverKeys);
  const covered = keysCoveredBySessions(doneSet);
  const upload = [];
  state.chapters.forEach((key) => {
    if (!chapterKeyOk(key) || onServer.has(key) || covered.has(key)) return;
    upload.push(key);
  });
  return upload;
}

function sessionChapterKeys(session) {
  return scriptureQueries(session).filter((chip) => chip.book).map((chip) => chapterKey(chip.book, chip.chapter));
}

function sessionFullyRead(session) {
  const keys = sessionChapterKeys(session);
  if (!keys.length) return state.done.has(session.n);
  return keys.every((key) => state.chapters.has(key));
}

function fillChaptersForDoneSessions() {
  state.done.forEach((n) => {
    const session = PLAN.sessions[n - 1];
    if (!session) return;
    sessionChapterKeys(session).forEach((key) => state.chapters.add(key));
  });
}

function saveChapters() {
  const diff = {};
  state.chapters.forEach((key) => { diff[key] = true; });
  if (Object.keys(diff).length) store.set(CHAPTERS, JSON.stringify(diff));
  else store.remove(CHAPTERS);
}

function loadChapters() {
  try {
    const saved = JSON.parse(store.get(CHAPTERS) || "{}") || {};
    Object.entries(saved).forEach(([key, value]) => {
      if (value) state.chapters.add(key);
    });
  } catch (e) { /* keep an empty set */ }
}

function promoteFullSessions() {
  PLAN.sessions.forEach((session) => {
    if (sessionChapterKeys(session).length && sessionFullyRead(session)) state.done.add(session.n);
  });
}

function dropFullChaptersForOpenSessions() {
  PLAN.sessions.forEach((session) => {
    if (state.done.has(session.n)) return;
    const keys = sessionChapterKeys(session);
    if (keys.length && keys.every((key) => state.chapters.has(key))) {
      keys.forEach((key) => state.chapters.delete(key));
    }
  });
}

function readTick() {
  const span = el("span", { class: "tick", "aria-hidden": "true" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 18 18");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M4.2 9.2 L7.3 12.2 L13.8 5.8");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  span.append(svg);
  return span;
}

function paintChapterReads() {
  document.querySelectorAll(".chapter-read input").forEach((input) => {
    input.disabled = !state.ready;
    input.checked = state.chapters.has(input.dataset.key);
  });
}

function toggleChapter(book, chapter) {
  const key = chapterKey(book, chapter);
  const session = current();
  const wasDone = state.done.has(session.n);
  const read = !state.chapters.has(key);
  if (read) state.chapters.add(key);
  else state.chapters.delete(key);
  saveChapters();
  const nowDone = sessionFullyRead(session);
  if (nowDone !== wasDone) {
    if (nowDone) state.done.add(session.n);
    else state.done.delete(session.n);
    refreshStatus();
  } else paintChapterReads();
  const body = { chapter: key, read };
  if (nowDone !== wasDone) {
    body.n = session.n;
    body.done = nowDone;
    if (!nowDone) body.keep = sessionChapterKeys(session).filter((item) => state.chapters.has(item));
  }
  persistRead(body);
}

function publishLocalChapters(upload) {
  if (!upload.length) {
    store.set(CHAPTERS_SYNCED, "1");
    return;
  }
  if (chapterSync) return;
  chapterSync = persistRead({ keep: upload }).finally(() => { chapterSync = null; });
}

function persistRead(body, retried) {
  if (!state.server) {
    if (body.n != null) saveOverrides();
    saveChapters();
    setSync("Saved on this device");
    return Promise.resolve(false);
  }
  setSync("Saving…");
  return fetch(API, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(body),
  }).then((response) => response.json()).then((data) => {
    if (data && data.ok && Array.isArray(data.chapters)) {
      applyServer(data.done || [], data.chapters);
      setSync("Shared progress · saved");
      return true;
    }
    if (data && data.ok) {
      applyServer(data.done || []);
      setSync("Shared progress · saved");
      return true;
    }
    if (!retried && body.n != null && (body.chapter != null || body.keep)) {
      return persistRead({ n: body.n, done: body.done === true }, true);
    }
    if (body.chapter != null || body.keep) {
      setSync("Saved on this device");
      return false;
    }
    setSync("Could not save — try again in a moment");
    return false;
  }).catch(() => {
    setSync("Could not save — check the connection and try again");
    return false;
  });
}
