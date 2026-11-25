"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { TOTAL } from "../src/lib/reading";
import { Tick } from "./icons";
import { studyHref } from "../src/lib/research";

function reminder(note) {
  if (!note) return "";
  return note.charAt(0).toUpperCase() + note.slice(1);
}

function px(value) {
  return `${Math.round(value * 100) / 100}px`;
}

export function ReadingPanel({ session, era, chips, chipIndex, chapterSet, onChip, onToggleChapter, onPrev, onNext, resume, onResume }) {
  const title = (session.refs || []).map((ref) => ref.label).join(" · ") || era.name;
  const selected = Math.min(chipIndex, Math.max(chips.length - 1, 0));
  const chipsRef = useRef(null);
  const glideRef = useRef(null);
  const glideReady = useRef(false);
  const glideTarget = useRef("");
  const chipSignature = chips.map((chip) => chip.key).join("\n");
  const signatureRef = useRef(chipSignature);

  useLayoutEffect(() => {
    const root = chipsRef.current;
    const glide = glideRef.current;
    if (!root || !glide) return undefined;

    const signatureChanged = signatureRef.current !== chipSignature;
    signatureRef.current = chipSignature;

    function moveGlide(animate) {
      const button = root.querySelector('.chip[aria-checked="true"]');
      if (!button) return;
      const rootBox = root.getBoundingClientRect();
      const box = button.getBoundingClientRect();
      const next = `translate(${px(box.left - rootBox.left)}, ${px(box.top - rootBox.top)})`;
      const width = px(box.width);
      const height = px(box.height);
      const key = `${next}|${width}|${height}`;
      if (glide.classList.contains("is-ready") && glideTarget.current === key) return;
      glideTarget.current = key;
      if (!animate) glide.style.transition = "none";
      glide.style.width = width;
      glide.style.height = height;
      glide.style.transform = next;
      glide.classList.add("is-ready");
      if (!animate) {
        glide.getBoundingClientRect();
        glide.style.transition = "";
      }
    }

    moveGlide(glideReady.current && !signatureChanged);
    glideReady.current = true;
    const observer = new ResizeObserver(() => moveGlide(false));
    observer.observe(root);
    return () => observer.disconnect();
  }, [selected, chipSignature]);

  useEffect(() => {
    const node = document.getElementById(`chip-${selected}`);
    if (node && document.activeElement?.classList.contains("chip") && document.activeElement !== node) node.focus();
  }, [selected]);

  useEffect(() => {
    const root = document.getElementById("chips");
    if (!root) return undefined;
    function markLines() {
      const cols = [...root.querySelectorAll(".chip-col")];
      const rows = new Map();
      cols.forEach((col) => {
        const top = col.offsetTop;
        const key = [...rows.keys()].find((value) => Math.abs(value - top) < 2);
        const line = key == null ? top : key;
        if (!rows.has(line)) rows.set(line, []);
        rows.get(line).push(col);
      });
      cols.forEach((col) => col.classList.remove("is-line-start", "is-line-end"));
      rows.forEach((line) => {
        line[0].classList.add("is-line-start");
        line[line.length - 1].classList.add("is-line-end");
      });
    }
    markLines();
    const observer = new ResizeObserver(markLines);
    observer.observe(root);
    return () => observer.disconnect();
  }, [chips]);

  function onChipKey(event, index) {
    const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
    const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
    if (!forward && !back) return;
    event.preventDefault();
    const count = chips.length;
    onChip((index + (forward ? 1 : -1) + count) % count);
  }

  return (
    <article id="reading">
      <p className="meta" id="meta">Session {session.n} · Era {session.era + 1} of 7 · {era.name}</p>
      <h2 id="title" tabIndex={-1}>{title}</h2>
      {session.note ? (
        <p className="note" id="note">
          <span className="note-label">In this reading</span>
          {reminder(session.note)}
        </p>
      ) : <p className="note" id="note" />}
      <div id="reads">
        {(session.refs || []).map((ref) => (
          <div className="read" key={ref.href}>
            <a href={ref.href} target="_blank" rel="noopener">Read {ref.label}</a>
            <a href={studyHref(ref.href)} target="_blank" rel="noopener">Study notes</a>
          </div>
        ))}
      </div>
      <div className="nav">
        <button type="button" id="prev" aria-label="Previous" onClick={onPrev} disabled={session.n <= 1}>
          <span className="chev" aria-hidden="true">{"<<"}</span>
        </button>
        <div className="chapter-pick" id="chapterPick" hidden={chips.length === 0}>
          <div className="chips" id="chips" role="radiogroup" aria-label="Chapter to look up" ref={chipsRef}>
            <span className="chip-glide" ref={glideRef} aria-hidden="true" />
            {chips.map((chip, index) => {
              const on = index === selected;
              return (
                <div className="chip-col" key={chip.key}>
                  <button
                    type="button"
                    id={`chip-${index}`}
                    className="chip"
                    role="radio"
                    aria-checked={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => onChip(index)}
                    onKeyDown={(event) => onChipKey(event, index)}
                  >
                    {chip.label}
                  </button>
                  <label className="chapter-read">
                    <input
                      type="checkbox"
                      aria-label={`${chip.label} read`}
                      checked={chapterSet.has(chip.key)}
                      onChange={() => onToggleChapter(chip)}
                    />
                    <Tick />
                  </label>
                </div>
              );
            })}
          </div>
        </div>
        <button type="button" id="next" aria-label="Next" onClick={onNext} disabled={session.n >= TOTAL}>
          <span className="chev" aria-hidden="true">{">>"}</span>
        </button>
      </div>
      {resume ? (
        <p className="resume-wrap">
          <button type="button" id="resume" onClick={onResume}>Resume session {resume}</button>
        </p>
      ) : null}
    </article>
  );
}
