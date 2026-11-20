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
  $("yearNow").textContent = "Session " + state.view + " of " + TOTAL + ". " + state.done.size + " read. A filled mark is a finished session.";
}

function paintJourney() {
  renderHorizon();
  paintYear();
}

function syncIndexFold() {
  const open = $("sessionIndex").open;
  $("indexSub").textContent = open ? "Hide the list" : "Open the full list";
}

function startJourney() {
  buildHorizon();
  buildYear();
  const index = $("sessionIndex");
  index.addEventListener("toggle", syncIndexFold);
  index.querySelector("summary").addEventListener("click", () => {
    requestAnimationFrame(syncIndexFold);
  });
  syncIndexFold();
}
