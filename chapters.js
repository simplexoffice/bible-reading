/* Which chapters are read, kept in this browser. A session is read when every chapter in it is. */
const CHAPTERS = "cbr-chapters";

function chapterKey(book, chapter) {
  return book + ":" + chapter;
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

function alignChapterReads() {
  const buttons = [...$("chips").querySelectorAll(".chip")];
  const marks = [...$("chapterReads").querySelectorAll(".chapter-read")];
  buttons.forEach((button, index) => {
    if (!marks[index]) return;
    marks[index].style.flex = "0 0 " + button.offsetWidth + "px";
  });
}

function toggleChapter(book, chapter) {
  const key = chapterKey(book, chapter);
  const session = current();
  const wasDone = state.done.has(session.n);
  if (state.chapters.has(key)) state.chapters.delete(key);
  else state.chapters.add(key);
  saveChapters();
  const nowDone = sessionFullyRead(session);
  paintChapterReads();
  if (nowDone === wasDone) return;
  if (nowDone) state.done.add(session.n);
  else state.done.delete(session.n);
  refreshStatus();
  persistSession(session.n, nowDone);
}
