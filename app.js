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

const state = { done: new Set(), server: false, view: 1, chip: 0 };

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
  });
}

function refreshStatus() {
  const n = state.view;
  const isDone = state.done.has(n);
  $("mark").checked = isDone;
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
}

function applyQuery(query) {
  $("queryLine").textContent = "Library search: " + query;
  document.querySelectorAll("[data-shelf]").forEach((link) => {
    const name = link.querySelector(".shelf-name").textContent;
    link.href = searchUrl(query, link.dataset.shelf);
    link.dataset.track = query + " · " + name;
  });
}

function renderChips(session) {
  const chips = chipsFor(session);
  const box = $("chips");
  box.replaceChildren();
  const several = chips.length > 1;
  box.hidden = !several;
  state.chip = Math.min(state.chip, chips.length - 1);
  if (several) {
    chips.forEach((chip, index) => {
      const button = el("button", {
        type: "button",
        class: "chip",
        "aria-pressed": index === state.chip ? "true" : "false",
        text: chip.label,
      });
      button.addEventListener("click", () => {
        state.chip = index;
        box.querySelectorAll(".chip").forEach((item, itemIndex) => {
          item.setAttribute("aria-pressed", itemIndex === index ? "true" : "false");
        });
        applyQuery(chip.query);
      });
      box.append(button);
    });
  }
  applyQuery(chips[state.chip].query);
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
  $("trail").hidden = items.length === 0;
  const list = $("trailList");
  list.replaceChildren();
  items.forEach((item) => {
    list.append(el("a", { href: item.href, target: "_blank", rel: "noopener", text: item.label }));
  });
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

function applyServer(doneList) {
  state.server = true;
  state.done = new Set(doneList.map(Number));
  store.remove(OVERRIDES);
  refreshStatus();
}

function refreshFromServer() {
  const opts = typeof AbortSignal !== "undefined" && AbortSignal.timeout
    ? { signal: AbortSignal.timeout(8000) }
    : {};
  return fetch(API, opts).then((response) => response.json()).then((data) => {
    if (data && data.ok) {
      applyServer(data.done || []);
      setSync("Shared progress · in sync");
      return true;
    }
    return false;
  });
}

function toggleDone() {
  const n = state.view;
  const isDone = !state.done.has(n);
  if (isDone) state.done.add(n);
  else state.done.delete(n);
  refreshStatus();
  if (state.server) {
    setSync("Saving…");
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ n, done: isDone }),
    }).then((response) => response.json()).then((data) => {
      if (data && data.ok) {
        applyServer(data.done || []);
        setSync("Shared progress · saved");
      } else setSync("Could not save — try again in a moment");
    }).catch(() => setSync("Could not save — check the connection and try again"));
  } else {
    saveOverrides();
    setSync("Saved on this device");
  }
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

function buildIndex() {
  const root = $("eras");
  PLAN.eras.forEach((era, index) => {
    const section = el("section", {
      class: "era",
      "data-search": era.name.toLowerCase(),
    });
    section.append(el("h3", {}, [
      el("span", { text: "Era " + (index + 1) + " · " + era.name }),
      el("span", { class: "era-count", id: "eraCount-" + index, text: "0 of " + era.count }),
    ]));
    section.append(el("p", { class: "blurb", text: era.blurb }));
    PLAN.sessions.filter((session) => session.era === index).forEach((session) => {
      const labels = session.refs.map((ref) => ref.label).join(" · ");
      const search = [session.n, labels, session.note, session.subjects.join(" "), session.queries.join(" ")]
        .join(" ").toLowerCase();
      const button = el("button", { type: "button", class: "row", "data-n": String(session.n) }, [
        el("span", { class: "sn", text: String(session.n) }),
        el("span", { class: "sbody" }, [
          el("span", { class: "sl", text: labels }),
          session.note ? el("span", { class: "sd", text: session.note }) : el("span"),
        ]),
        el("span", { class: "flag", text: "Read" }),
      ]);
      button.dataset.search = search;
      button.addEventListener("click", () => {
        setView(session.n, { focus: true });
        if (window.matchMedia("(max-width: 640px)").matches) $("sessionIndex").open = false;
      });
      section.append(button);
    });
    root.append(section);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const button = $("themeToggle");
  const toLight = theme === "dark";
  button.textContent = toLight ? "Light" : "Dark";
  button.setAttribute("aria-label", toLight ? "Switch to light appearance" : "Switch to dark appearance");
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
  $("themeToggle").addEventListener("click", () => {
    theme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(theme);
    store.set("cbr-theme", theme);
  });
  $("title").setAttribute("tabindex", "-1");
  buildShelves();
  buildIndex();
  loadOverrides();
  renderTrail();
  const pinned = location.hash || store.get("cbr-last");
  state.view = startingSession();
  $("mark").disabled = true;
  renderSession(false);
  $("prev").addEventListener("click", () => setView(state.view - 1, { focus: true }));
  $("next").addEventListener("click", () => setView(state.view + 1, { focus: true }));
  $("mark").addEventListener("change", toggleDone);
  $("resume").addEventListener("click", () => {
    const n = nextUnread();
    if (n) setView(n, { focus: true });
  });
  $("filter").addEventListener("input", () => {
    const query = $("filter").value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll(".era").forEach((era) => {
      let any = false;
      const eraHit = !query || era.dataset.search.includes(query);
      era.querySelectorAll(".row").forEach((row) => {
        const show = !query || eraHit || row.dataset.search.includes(query);
        row.hidden = !show;
        if (show) { any = true; shown += 1; }
      });
      era.hidden = Boolean(query) && !any;
    });
    $("filterEmpty").hidden = shown !== 0;
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
  const releaseMark = () => { $("mark").disabled = false; };
  refreshFromServer().then((ok) => {
    if (!ok) setSync("Saved on this device");
    if (!pinned) setView(nextUnread() || 1, { scroll: false });
  }).catch(() => setSync("Saved on this device")).finally(releaseMark);
  setInterval(() => {
    if (state.server) refreshFromServer().catch(() => setSync("Showing the last shared record"));
  }, 60000);
}

init();
