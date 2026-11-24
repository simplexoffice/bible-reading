export function FoldIcon() {
  return (
    <span className="fold" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="18" height="18">
        <path d="M3 6 L8 11 L13 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function ReadFlag() {
  return (
    <span className="flag">
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M3.2 8.2 L6.4 11.3 L12.8 4.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Read</span>
    </span>
  );
}

export function Tick() {
  return (
    <span className="tick" aria-hidden="true">
      <svg viewBox="0 0 18 18" width="18" height="18">
        <path d="M4.2 9.2 L7.3 12.2 L13.8 5.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
