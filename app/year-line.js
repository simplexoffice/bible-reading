"use client";

import { TOTAL } from "../src/lib/reading";

function completionPercent(done) {
  if (!done) return "0%";
  const raw = (done / TOTAL) * 100;
  if (raw < 1) return "<1%";
  if (done < TOTAL && raw > 99) return "99%";
  return `${Math.round(raw)}%`;
}

export function YearLine({ view, doneSet, onPick }) {
  const done = doneSet.size;
  const percent = completionPercent(done);
  const marks = [];
  for (let n = 1; n <= TOTAL; n += 1) {
    const here = n === view;
    const read = doneSet.has(n);
    let label = `Session ${n}`;
    if (here) label += ", this reading";
    if (read) label += ", read";
    const classes = ["year-mark"];
    if (read) classes.push("is-done");
    if (here) classes.push("is-current");
    marks.push(
      <button type="button" key={n} className={classes.join(" ")} aria-label={label} onClick={() => onPick(n)} />,
    );
  }
  return (
    <section id="yearLine" aria-labelledby="yearHeading">
      <div className="year-head">
        <h2 id="yearHeading">The year</h2>
        <p className="kpi" id="yearKpi" aria-label={`${done} of ${TOTAL} sessions complete, ${percent}`}>
          <span className="kpi-num" id="yearPercent">{percent}</span>
          <span className="kpi-cap">complete</span>
        </p>
      </div>
      <p className="help" id="yearNow">Session {view} of {TOTAL}. {done} read. A filled mark is a finished session.</p>
      <p className="year-key">
        <span><span className="swatch is-current" /> This reading</span>
        <span><span className="swatch is-done" /> Read</span>
        <span><span className="swatch" /> Ahead</span>
      </p>
      <div className="year" id="year">{marks}</div>
    </section>
  );
}
