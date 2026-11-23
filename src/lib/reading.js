import plan from "../../data/plan.json";

export const PLAN = plan;
export const TOTAL = plan.sessions.length;

const BOOKS = [
  "",
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
  "Ezra", "Nehemiah", "Esther", "Job", "Psalm",
  "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
  "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
  "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
  "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
  "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
  "James", "1 Peter", "2 Peter", "1 John", "2 John",
  "3 John", "Jude", "Revelation",
];

function passageChapters(ref) {
  const match = ref.label.match(/^(.*?)(?:\s+)(\d+(?:\s*[–-]\s*\d+)?(?:\s*,\s*\d+(?:\s*[–-]\s*\d+)?)*)\s*$/);
  if (!match || !match[1].trim()) return [ref.chapter];
  const chapters = [];
  match[2].split(",").forEach((part) => {
    const range = part.trim().match(/^(\d+)(?:\s*[–-]\s*(\d+))?$/);
    if (!range) return;
    const start = Number(range[1]);
    const end = Number(range[2] || start);
    for (let chapter = start; chapter <= end; chapter += 1) chapters.push(chapter);
  });
  return chapters.length ? chapters : [ref.chapter];
}

export function sessionChapters(session) {
  const chips = [];
  (session.refs || []).forEach((ref) => {
    const name = BOOKS[ref.book] || ref.label;
    const abbrev = (ref.label.match(/^(.*?)\s+\d/) || [, ref.label])[1].trim();
    passageChapters(ref).forEach((chapter) => {
      const key = `${ref.book}:${chapter}`;
      if (chips.some((chip) => chip.key === key)) return;
      chips.push({
        key,
        label: `${abbrev} ${chapter}`,
        query: `${name} ${chapter}`,
        href: `https://wol.jw.org/en/wol/b/r1/lp-e/nwt/${ref.book}/${chapter}`,
      });
    });
  });
  return chips;
}

export function sessionByNumber(n) {
  return PLAN.sessions[n - 1] || PLAN.sessions[0];
}
