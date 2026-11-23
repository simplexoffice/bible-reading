/* Reading desk. One session, then the publications library. */
const API = "https://script.google.com/macros/s/AKfycbx9xOiy-hPpHHy8je-5CGtVPsbT7ZQGnpysvlj2huxga5e9LbAJQJtj2EkKKU-6WBZa/exec";
const OVERRIDES = "cbr-overrides";
const TOTAL = 365;

const $ = (id) => document.getElementById(id);

const store = {
  get(key) { try { return localStorage.getItem(key); } catch (e) { return null; } },
  set(key, val) { try { localStorage.setItem(key, val); } catch (e) {} },
  remove(key) { try { localStorage.removeItem(key); } catch (e) {} },
};

const state = { done: new Set(), chapters: new Set(), server: false, ready: false, view: 1, chip: 0 };

function el(tag, attrs, kids) {
  const node = document.createElement(tag);
  Object.entries(attrs || {}).forEach(([key, value]) => {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (value != null) node.setAttribute(key, value);
  });
  (kids || []).forEach((kid) => node.append(kid));
  return node;
}

function chipsFor(session) {
  const chips = scriptureQueries(session);
  return chips.length ? chips : [{ label: "Bible", query: "Bible" }];
}

function readingReminder(note) {
  if (!note) return "";
  return note.charAt(0).toUpperCase() + note.slice(1);
}

function current() { return PLAN.sessions[state.view - 1]; }

function nextUnread() {
  for (let n = 1; n <= TOTAL; n += 1) if (!state.done.has(n)) return n;
  return null;
}

function setSync(message) { $("syncLine").textContent = message; }

function readTrail() {
  try { return JSON.parse(store.get("cbr-trail") || "[]") || []; } catch (e) { return []; }
}

function remember(label, href) {
  const items = readTrail().filter((item) => item.href !== href);
  items.unshift({ label, href });
  store.set("cbr-trail", JSON.stringify(items.slice(0, 8)));
  renderTrail();
}

function updateProgress() {
  const done = state.done.size;
  $("progressText").textContent = done + " of " + TOTAL + " read";
  $("bar").setAttribute("aria-valuenow", String(done));
  $("bar").setAttribute("aria-valuemax", String(TOTAL));
  $("barFill").style.width = (done / TOTAL * 100) + "%";
}

function patchIndex() {
  document.querySelectorAll(".row").forEach((row) => {
    const n = Number(row.dataset.n);
    row.classList.toggle("is-done", state.done.has(n));
    row.classList.toggle("is-current", n === state.view);
    if (n === state.view) row.setAttribute("aria-current", "true");
    else row.removeAttribute("aria-current");
  });
  PLAN.eras.forEach((era, index) => {
    const count = PLAN.sessions.filter((session) => session.era === index && state.done.has(session.n)).length;
    $("eraCount-" + index).textContent = count + " of " + era.count;
    document.querySelectorAll(".era")[index].classList.toggle("is-current", index === current().era);
  });
}

function refreshStatus() {
  const n = state.view;
  $("prev").disabled = n <= 1;
  $("next").disabled = n >= TOTAL;
  const resumeN = nextUnread();
  const resume = $("resume");
  if (resumeN && resumeN !== n) {
    resume.hidden = false;
    resume.disabled = false;
    resume.textContent = "Resume session " + resumeN;
  } else {
    resume.hidden = true;
  }
  updateProgress();
  patchIndex();
  paintJourney();
  paintChapterReads();
}

function applyQuery(query) {
  $("queryLine").textContent = query;
  document.querySelectorAll("[data-shelf]").forEach((link) => {
    const name = link.querySelector(".shelf-name").textContent;
    link.href = searchUrl(query, link.dataset.shelf);
    link.dataset.track = query + " · " + name;
  });
}

function selectChip(index) {
  state.chip = index;
  const chips = chipsFor(current());
  $("chips").querySelectorAll(".chip").forEach((item, itemIndex) => {
    const on = itemIndex === index;
    item.setAttribute("aria-checked", on ? "true" : "false");
    item.tabIndex = on ? 0 : -1;
  });
  applyQuery(chips[index].query);
}

function renderChips(session) {
  const chips = chipsFor(session);
  const box = $("chips");
  const pick = $("chapterPick");
  box.replaceChildren();
  const show = chips.some((chip) => chip.book);
  pick.hidden = !show;
  state.chip = Math.min(state.chip, Math.max(chips.length - 1, 0));
  chips.forEach((chip, index) => {
    const on = index === state.chip;
    const button = el("button", {
      type: "button",
      class: "chip",
      role: "radio",
      "aria-checked": on ? "true" : "false",
      tabindex: on ? "0" : "-1",
      text: chip.label,
    });
    button.addEventListener("click", () => selectChip(index));
    button.addEventListener("keydown", (event) => {
      const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
      const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
      if (!forward && !back) return;
      event.preventDefault();
      const count = chips.length;
      const next = (index + (forward ? 1 : -1) + count) % count;
      selectChip(next);
      box.querySelectorAll(".chip")[next].focus();
    });
    const column = el("div", { class: "chip-col" }, [button]);
    if (chip.book) {
      const key = chapterKey(chip.book, chip.chapter);
      const input = el("input", { type: "checkbox", "aria-label": chip.label + " read", "data-key": key });
      input.disabled = !state.ready;
      input.checked = state.chapters.has(key);
      input.addEventListener("change", () => toggleChapter(chip.book, chip.chapter));
      column.append(el("label", { class: "chapter-read" }, [input, readTick()]));
    }
    box.append(column);
  });
  if (chips.length) applyQuery(chips[state.chip].query);
}

function renderSession(focus) {
  const session = current();
  const era = PLAN.eras[session.era];
  store.set("cbr-last", String(session.n));
  if (location.hash !== "#" + session.n) history.replaceState(null, "", "#" + session.n);
  $("meta").textContent = "Session " + session.n + " · Era " + (session.era + 1) + " of 7 · " + era.name;
  $("title").textContent = session.refs.map((ref) => ref.label).join(" · ");
  const note = $("note");
  note.replaceChildren();
  if (session.note) {
    note.append(el("span", { class: "note-label", text: "In this reading" }));
    note.append(document.createTextNode(readingReminder(session.note)));
  }
  const reads = $("reads");
  reads.replaceChildren();
  session.refs.forEach((ref) => {
    reads.append(el("div", { class: "read" }, [
      el("a", { href: ref.href, target: "_blank", rel: "noopener", text: "Read " + ref.label }),
      el("a", {
        href: ref.href.replace("/nwt/", "/nwtsty/"),
        target: "_blank",
        rel: "noopener",
        text: "Study notes",
      }),
    ]));
  });
  const books = $("bookList");
  books.replaceChildren();
  guidesFor(session).forEach((item) => {
    books.append(el("a", {
      class: "shelf",
      href: item.href,
      target: "_blank",
      rel: "noopener",
      "data-track": item.title,
    }, [
      el("span", { class: "shelf-name", text: item.title }),
      el("span", { class: "why", text: item.why }),
      el("span", { class: "open", text: "Open" }),
    ]));
  });
  renderChips(session);
  refreshStatus();
  if (focus) $("title").focus({ preventScroll: true });
}

function renderTrail() {
  const items = readTrail();
  const list = $("trailList");
  list.replaceChildren();
  items.forEach((item) => {
    list.append(el("a", { href: item.href, target: "_blank", rel: "noopener", text: item.label }));
  });
  $("trailEmpty").hidden = items.length > 0;
}

function setMenu(open) {
  const button = $("menuButton");
  button.setAttribute("aria-expanded", open ? "true" : "false");
  button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  $("menuPanel").hidden = !open;
}

function setView(n, opts) {
  opts = opts || {};
  state.view = n;
  state.chip = 0;
  renderSession(opts.focus);
  if (opts.scroll !== false) window.scrollTo(0, 0);
}

function saveOverrides() {
  const diff = {};
  state.done.forEach((n) => { diff[String(n)] = true; });
  if (Object.keys(diff).length) store.set(OVERRIDES, JSON.stringify(diff));
  else store.remove(OVERRIDES);
}

function loadOverrides() {
  try {
    const saved = JSON.parse(store.get(OVERRIDES) || "{}") || {};
    Object.entries(saved).forEach(([key, value]) => {
      if (value) state.done.add(Number(key));
    });
  } catch (e) { /* keep an empty set */ }
}

function applyServer(doneList, chapterList) {
  state.server = true;
  state.done = new Set((doneList || []).map(Number).filter((n) => n >= 1 && n <= TOTAL));
  store.remove(OVERRIDES);
  if (Array.isArray(chapterList)) {
    const upload = chaptersToUpload(chapterList.filter(chapterKeyOk), state.done);
    state.chapters = new Set(chapterList.filter(chapterKeyOk));
    fillChaptersForDoneSessions();
    upload.forEach((key) => state.chapters.add(key));
    saveChapters();
    refreshStatus();
    publishLocalChapters(upload);
    return;
  }
  fillChaptersForDoneSessions();
  dropFullChaptersForOpenSessions();
  saveChapters();
  refreshStatus();
}

function refreshFromServer() {
  const opts = typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? { signal: AbortSignal.timeout(8000) }
    : {};
  return fetch(API, opts).then((response) => response.json()).then((data) => {
    if (data && data.ok) {
      applyServer(data.done || [], data.chapters);
      setSync("Shared progress · in sync");
      return true;
    }
    return false;
  });
}

function buildShelves() {
  const root = $("shelves");
  let group = "";
  SHELVES.forEach(([groupName, id, name, why]) => {
    if (groupName !== group) {
      group = groupName;
      root.append(el("h3", { class: "group", text: groupName }));
    }
    root.append(el("a", {
      class: "shelf",
      "data-shelf": id,
      target: "_blank",
      rel: "noopener",
    }, [
      el("span", { class: "shelf-name", text: name }),
      el("span", { class: "why", text: why }),
      el("span", { class: "open", text: "Open" }),
    ]));
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  $("themeSwitch").checked = theme === "dark";
}

function startingSession() {
  const hashed = Number(location.hash.replace("#", ""));
  if (hashed >= 1 && hashed <= TOTAL) return hashed;
  const saved = Number(store.get("cbr-last"));
  if (saved >= 1 && saved <= TOTAL) return saved;
  return nextUnread() || 1;
}

function init() {
  if (!window.PLAN || PLAN.sessions.length !== TOTAL) {
    $("title").textContent = "The reading plan did not load.";
    return;
  }
  let theme = store.get("cbr-theme");
  if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) theme = "dark";
  applyTheme(theme || "light");
  $("themeSwitch").addEventListener("change", () => {
    const next = $("themeSwitch").checked ? "dark" : "light";
    applyTheme(next);
    store.set("cbr-theme", next);
  });
  wireSyncKey();
  $("menuButton").addEventListener("click", () => {
    setMenu($("menuPanel").hidden);
  });
  document.addEventListener("click", (event) => {
    if ($("menuPanel").hidden) return;
    if (event.target.closest(".menu")) return;
    setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || $("menuPanel").hidden) return;
    setMenu(false);
    $("menuButton").focus();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === "cbr-trail") renderTrail();
  });
  $("title").setAttribute("tabindex", "-1");
  buildShelves();
  buildIndex();
  startJourney();
  loadOverrides();
  loadChapters();
  fillChaptersForDoneSessions();
  promoteFullSessions();
  saveChapters();
  renderTrail();
  const pinned = location.hash || store.get("cbr-last");
  state.view = startingSession();
  renderSession(false);
  $("prev").addEventListener("click", () => setView(state.view - 1, { focus: true }));
  $("next").addEventListener("click", () => setView(state.view + 1, { focus: true }));
  $("resume").addEventListener("click", () => {
    const n = nextUnread();
    if (n) setView(n, { focus: true });
  });
  window.addEventListener("hashchange", () => {
    const n = Number(location.hash.replace("#", ""));
    if (n >= 1 && n <= TOTAL && n !== state.view) setView(n, { scroll: false });
  });
  document.body.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-track]");
    if (!link) return;
    remember(link.dataset.track, link.href);
  });
  const releaseMark = () => {
    state.ready = true;
    paintChapterReads();
  };
  refreshFromServer().then((ok) => {
    if (!ok) setSync("Saved on this device");
    if (!pinned) setView(nextUnread() || 1, { scroll: false });
  }).catch(() => setSync("Saved on this device")).finally(releaseMark);
  setInterval(() => {
    if (state.server) refreshFromServer().catch(() => setSync("Showing the last shared record"));
  }, 60000);
}

init();
