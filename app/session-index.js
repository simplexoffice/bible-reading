"use client";

import { useMemo, useRef, useState } from "react";
import { PLAN } from "../src/lib/reading";
import { FoldIcon, ReadFlag } from "./icons";

function searchText(session) {
  const labels = (session.refs || []).map((ref) => ref.label).join(" ");
  return [session.n, labels, session.note, (session.subjects || []).join(" "), (session.queries || []).join(" ")].join(" ").toLowerCase();
}

export function SessionIndex({ view, eraIndex, doneSet, onPick }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const needle = query.trim().toLowerCase();
  const eras = useMemo(() => PLAN.eras.map((era, index) => {
    const sessions = PLAN.sessions.filter((session) => session.era === index).map((session) => ({
      session,
      text: searchText(session),
      labels: (session.refs || []).map((ref) => ref.label).join(" · "),
    }));
    return { era, index, sessions };
  }), []);

  let shown = 0;
  let firstMatch = -1;
  const blocks = eras.map(({ era, index, sessions }) => {
    const eraHit = !needle || era.name.toLowerCase().includes(needle);
    const rows = sessions.filter((item) => !needle || eraHit || item.text.includes(needle));
    if (!rows.length && needle) return null;
    if (rows.length && firstMatch < 0) firstMatch = index;
    shown += rows.length;
    const readCount = sessions.filter((item) => doneSet.has(item.session.n)).length;
    const initiallyOpen = needle ? index === firstMatch : index === eraIndex;
    return (
      <details
        key={`${needle}-${index}`}
        className={index === eraIndex ? "era is-current" : "era"}
        ref={(node) => {
          if (!node || node.dataset.ready === "1") return;
          node.dataset.ready = "1";
          node.open = initiallyOpen;
        }}
      >
        <summary>
          <span className="era-name">Era {index + 1} · {era.name}</span>
          <span className="era-side">
            <span className="era-count">{readCount} of {era.count}</span>
            <FoldIcon />
          </span>
        </summary>
        <div className="era-panel">
          <p className="blurb">{era.blurb}</p>
          {rows.map(({ session, labels }) => (
            <button
              type="button"
              key={session.n}
              className={`row${doneSet.has(session.n) ? " is-done" : ""}${session.n === view ? " is-current" : ""}`}
              aria-current={session.n === view ? "true" : undefined}
              onClick={() => {
                onPick(session.n);
                if (window.matchMedia("(max-width: 640px)").matches) document.getElementById("sessionIndex")?.removeAttribute("open");
              }}
            >
              <span className="sn">{session.n}</span>
              <span>
                <span className="sl">{labels}</span>
                {session.note ? <span className="sd">{session.note}</span> : null}
              </span>
              <ReadFlag />
            </button>
          ))}
        </div>
      </details>
    );
  });

  return (
    <details id="sessionIndex" onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="index-copy">
          <span className="index-title">All 365 sessions</span>
          <span className="index-sub" id="indexSub">{open ? "Hide the list" : "Open the full list"}</span>
        </span>
        <FoldIcon />
      </summary>
      <div className="index-body">
        <div className="filter-wrap">
          <label htmlFor="filter">Find a session</label>
          <input id="filter" type="search" placeholder="Name, book, or number" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <p id="filterEmpty" hidden={shown !== 0}>No session matches.</p>
        <div id="eras">{blocks}</div>
      </div>
    </details>
  );
}
