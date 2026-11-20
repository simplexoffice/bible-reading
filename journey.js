/* Era band at the top, and the year of session marks at the bottom. */

function firstInEra(index) {
  return PLAN.sessions.find((session) => session.era === index);
}

function goToEra(index) {
  if (index < 0 || index >= PLAN.eras.length) return;
  if (current().era === index) return;
  const session = firstInEra(index);
  if (session) setView(session.n, { focus: true });
}

function buildHorizon() {
  const dots = $("eraDots");
  PLAN.eras.forEach((era, index) => {
    const button = el("button", {
      type: "button",
      class: "era-dot",
      "aria-label": "Era " + (index + 1) + ", " + era.name,
    });
    button.addEventListener("click", () => {
      if (dots.dataset.swiped === "1") {
        dots.dataset.swiped = "0";
        return;
      }
      goToEra(index);
    });
    dots.append(button);
  });
  const band = $("horizon");
  let startX = 0;
  let startY = 0;
  let tracking = false;
  band.addEventListener("pointerdown", (event) => {
    if (event.button != null && event.button !== 0) return;
    if (event.target.closest(".menu")) return;
    tracking = true;
    startX = event.clientX;
    startY = event.clientY;
  });
  band.addEventListener("pointerup", (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    $("eraDots").dataset.swiped = "1";
    goToEra(current().era + (dx < 0 ? 1 : -1));
  });
  band.addEventListener("pointercancel", () => { tracking = false; });
}

function renderHorizon() {
  const session = current();
  const era = PLAN.eras[session.era];
  $("horizonKicker").textContent = "Era " + (session.era + 1) + " of " + PLAN.eras.length;
  $("horizonName").textContent = era.name;
  document.querySelectorAll(".era-dot").forEach((dot, index) => {
    const on = index === session.era;
    dot.classList.toggle("is-current", on);
    if (on) dot.setAttribute("aria-current", "true");
    else dot.removeAttribute("aria-current");
  });
}

function buildYear() {
  const root = $("year");
  for (let n = 1; n <= TOTAL; n += 1) {
    const mark = el("button", {
      type: "button",
      class: "year-mark",
      "data-n": String(n),
      "aria-label": "Session " + n,
    });
    mark.addEventListener("click", () => setView(n, { focus: true }));
    root.append(mark);
  }
}

function paintYear() {
  document.querySelectorAll(".year-mark").forEach((mark) => {
    const n = Number(mark.dataset.n);
    const done = state.done.has(n);
    const here = n === state.view;
    mark.classList.toggle("is-done", done);
    mark.classList.toggle("is-current", here);
    let label = "Session " + n;
    if (here) label += ", this reading";
    if (done) label += ", read";
    mark.setAttribute("aria-label", label);
  });
  const done = state.done.size;
  const percent = completionPercent(done);
  $("yearNow").textContent = "Session " + state.view + " of " + TOTAL + ". " + done + " read. A filled mark is a finished session.";
  $("yearPercent").textContent = percent;
  $("yearKpi").setAttribute("aria-label", done + " of " + TOTAL + " sessions complete, " + percent);
}

function completionPercent(done) {
  if (!done) return "0%";
  const raw = done / TOTAL * 100;
  if (raw < 1) return "<1%";
  if (done < TOTAL && raw > 99) return "99%";
  return Math.round(raw) + "%";
}

function paintJourney() {
  renderHorizon();
  paintYear();
}

function foldIcon() {
  const span = el("span", { class: "fold", "aria-hidden": "true" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3 6 L8 11 L13 6");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  span.append(svg);
  return span;
}

function motionOff() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function slideDetails(details, body, open) {
  details.classList.toggle("is-open", open);
  if (details.id === "sessionIndex") syncIndexFold();
  if (motionOff()) {
    details.open = open;
    body.style.height = "";
    body.style.overflow = "";
    body.style.transition = "";
    return;
  }
  const token = String(Date.now() + Math.random());
  body.dataset.anim = token;
  body.style.overflow = "hidden";
  body.style.transition = "height 280ms ease";
  const finish = (event) => {
    if (body.dataset.anim !== token) return;
    if (event && event.target !== body) return;
    if (event && event.propertyName !== "height") return;
    body.dataset.anim = "";
    body.removeEventListener("transitionend", finish);
    if (open) body.style.height = "auto";
    else {
      details.open = false;
      body.style.height = "";
    }
    body.style.overflow = "";
  };
  if (open) {
    const from = details.open ? body.getBoundingClientRect().height : 0;
    details.open = true;
    body.style.height = from + "px";
    const end = body.scrollHeight;
    requestAnimationFrame(() => {
      if (body.dataset.anim !== token) return;
      body.style.height = end + "px";
    });
  } else {
    body.style.height = body.getBoundingClientRect().height + "px";
    requestAnimationFrame(() => {
      if (body.dataset.anim !== token) return;
      body.style.height = "0px";
    });
  }
  body.addEventListener("transitionend", finish);
  setTimeout(finish, 520);
}

function closeOtherEras(except) {
  document.querySelectorAll(".era.is-open").forEach((era) => {
    if (era === except) return;
    slideDetails(era, era.querySelector(".era-panel"), false);
  });
}

function bindDisclosure(details, body) {
  details.querySelector("summary").addEventListener("click", (event) => {
    event.preventDefault();
    const opening = !details.classList.contains("is-open");
    if (opening && details.classList.contains("era")) closeOtherEras(details);
    slideDetails(details, body, opening);
  });
}

function readFlag() {
  const flag = el("span", { class: "flag" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M3.2 8.2 L6.4 11.3 L12.8 4.7");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  flag.append(svg, el("span", { text: "Read" }));
  return flag;
}

function setEraQuiet(era, open) {
  const body = era.querySelector(".era-panel");
  era.open = open;
  era.classList.toggle("is-open", open);
  if (!body) return;
  body.style.height = "";
  body.style.overflow = "";
  body.style.transition = "";
  body.dataset.anim = "";
}

function closeSessionIndex() {
  const details = $("sessionIndex");
  if (!details.classList.contains("is-open")) return;
  slideDetails(details, details.querySelector(".index-body"), false);
}

function syncIndexFold() {
  const open = $("sessionIndex").classList.contains("is-open");
  $("indexSub").textContent = open ? "Hide the list" : "Open the full list";
}

function buildIndex() {
  const root = $("eras");
  PLAN.eras.forEach((era, index) => {
    const section = el("details", {
      class: "era",
      "data-search": era.name.toLowerCase(),
    });
    const summary = el("summary", {}, [
      el("span", { class: "era-name", text: "Era " + (index + 1) + " · " + era.name }),
      el("span", { class: "era-side" }, [
        el("span", { class: "era-count", id: "eraCount-" + index, text: "0 of " + era.count }),
        foldIcon(),
      ]),
    ]);
    const panel = el("div", { class: "era-panel" }, [
      el("p", { class: "blurb", text: era.blurb }),
    ]);
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
        readFlag(),
      ]);
      button.dataset.search = search;
      button.addEventListener("click", () => {
        setView(session.n, { focus: true });
        if (window.matchMedia("(max-width: 640px)").matches) closeSessionIndex();
      });
      panel.append(button);
    });
    section.append(summary, panel);
    bindDisclosure(section, panel);
    root.append(section);
  });
}

function bindFilter() {
  $("filter").addEventListener("input", () => {
    const query = $("filter").value.trim().toLowerCase();
    let shown = 0;
    let opened = false;
    document.querySelectorAll(".era").forEach((era) => {
      let any = false;
      const eraHit = !query || era.dataset.search.includes(query);
      era.querySelectorAll(".row").forEach((row) => {
        const show = !query || eraHit || row.dataset.search.includes(query);
        row.hidden = !show;
        if (show) { any = true; shown += 1; }
      });
      era.hidden = Boolean(query) && !any;
      const keepOpen = Boolean(query) && any && !opened;
      setEraQuiet(era, keepOpen);
      if (keepOpen) opened = true;
    });
    $("filterEmpty").hidden = shown !== 0;
  });
}

function startJourney() {
  buildHorizon();
  buildYear();
  const index = $("sessionIndex");
  bindDisclosure(index, index.querySelector(".index-body"));
  bindFilter();
  syncIndexFold();
}
