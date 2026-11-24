"use client";

import { useRef } from "react";
import { PLAN } from "../src/lib/reading";

export function Horizon({ eraIndex, menuOpen, onToggleMenu, onEra, theme, onTheme, trail }) {
  const era = PLAN.eras[eraIndex];
  const start = useRef(null);
  const swiped = useRef(false);

  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) return;
    if (event.target.closest(".menu")) return;
    start.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event) {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    swiped.current = true;
    onEra(eraIndex + (dx < 0 ? 1 : -1));
  }

  function chooseEra(index) {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onEra(index);
  }

  return (
    <section
      className="horizon"
      id="horizon"
      aria-label="Era"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { start.current = null; }}
    >
      <div className="menu">
        <button
          type="button"
          id="menuButton"
          className="menu-button"
          aria-expanded={menuOpen}
          aria-controls="menuPanel"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={onToggleMenu}
        >
          <svg className="icon-menu" viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
            <path d="M3 5.5h14M3 10h14M3 14.5h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <svg className="icon-close" viewBox="0 0 20 20" width="22" height="22" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <div id="menuPanel" className="menu-panel" hidden={!menuOpen}>
          <div className="appearance">
            <p className="menu-label" id="themeLabel">Appearance</p>
            <label className="switch">
              <span className="switch-name is-light">Light</span>
              <input
                type="checkbox"
                id="themeSwitch"
                role="switch"
                aria-labelledby="themeLabel"
                checked={theme === "dark"}
                onChange={(event) => onTheme(event.target.checked ? "dark" : "light")}
              />
              <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
              <span className="switch-name is-dark">Dark</span>
            </label>
          </div>
          <h2 className="menu-heading" id="trailHeading">Recent lookups</h2>
          <p className="menu-note">Saved in this browser, so you can reopen a search.</p>
          <div id="trailList" aria-labelledby="trailHeading">
            {trail.map((item) => (
              <a key={item.href} href={item.href} target="_blank" rel="noopener">{item.label}</a>
            ))}
          </div>
          <p className="menu-note" id="trailEmpty" hidden={trail.length > 0}>None yet.</p>
        </div>
      </div>
      <p className="horizon-kicker" id="horizonKicker">Era {eraIndex + 1} of {PLAN.eras.length}</p>
      <p className="horizon-name" id="horizonName">{era.name}</p>
      <div className="dots" id="eraDots" role="group" aria-label="Eras">
        {PLAN.eras.map((item, index) => (
          <button
            type="button"
            key={item.name}
            className={index === eraIndex ? "era-dot is-current" : "era-dot"}
            aria-current={index === eraIndex ? "true" : undefined}
            aria-label={`Era ${index + 1}, ${item.name}`}
            onClick={() => chooseEra(index)}
          />
        ))}
      </div>
    </section>
  );
}
