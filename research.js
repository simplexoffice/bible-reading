/* Publication shelves and the books that match a Bible reading. */
const PUB = "https://wol.jw.org/en/wol/publication/r1/lp-e/";
const SCRIPTURE = "https://wol.jw.org/en/wol/library/r1/lp-e/all-publications/books/all-scripture-si";

const SHELVES = [
  ["Reference works", "it", "Insight", "Encyclopedia entries for people, places, and words."],
  ["Reference works", "dx", "Index", "Where this subject is treated across the publications."],
  ["Reference works", "gloss", "Glossary", "Short definitions used in the publications."],
  ["Publications", "bk", "Books", "Book-length studies on the Books shelf."],
  ["Publications", "w", "Watchtower", "Magazine and study articles that discuss it."],
  ["Publications", "g", "Awake!", "Background written for a general reader."],
  ["Publications", "mwb", "Meeting Workbook", "Congregation lessons that mention it."],
];

const GUIDE = {
  ce: ["Life—How Did It Get Here? By Evolution or by Creation?", "A library book on the origin of life in the creation account."],
  ct: ["Is There a Creator Who Cares About You?", "Reads the creation account as evidence of a Creator."],
  ia: ["Imitate Their Faith", "Character studies of faithful people from this era."],
  "ip-1": ["Isaiah’s Prophecy—Light for All Mankind I", "Verse-by-verse study of the first part of Isaiah."],
  "ip-2": ["Isaiah’s Prophecy—Light for All Mankind II", "Verse-by-verse study of the rest of Isaiah."],
  jr: ["God’s Word for Us Through Jeremiah", "Book-length study of Jeremiah."],
  rr: ["Pure Worship of Jehovah—Restored At Last!", "Study of Ezekiel, including the restored worship."],
  dp: ["Pay Attention to Daniel’s Prophecy!", "Book-length study of Daniel."],
  pm: ["Paradise Restored to Mankind—By Theocracy!", "The return from exile and the restored nation."],
  jy: ["Jesus—The Way, the Truth, the Life", "The four Gospels arranged in the order of Jesus’ life."],
  gt: ["The Greatest Man Who Ever Lived", "Short readings through the life of Jesus."],
  bt: ["“Bearing Thorough Witness” About God’s Kingdom", "Book-length study of Acts."],
  re: ["Revelation—Its Grand Climax At Hand!", "Book-length study of Revelation."],
  si: ["“All Scripture Is Inspired of God and Beneficial”", "Chapter-level outline of the Bible book in this session."],
  rsg: ["Research Guide for Jehovah’s Witnesses", "An index from a scripture to publications that discuss it."],
  it: ["Insight on the Scriptures", "Encyclopedia of people, places, and words in the Bible."],
};

function searchUrl(query, shelf) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.append("fc[]", shelf);
  params.set("p", "par");
  params.set("r", "occ");
  params.set("st", "e");
  return "https://wol.jw.org/en/wol/s/r1/lp-e?" + params.toString();
}

function guide(code) {
  const [title, why] = GUIDE[code];
  const href = code === "si" ? SCRIPTURE : PUB + code;
  return { href, title, why };
}

function guidesFor(session) {
  const found = [];
  const push = (code) => {
    const item = guide(code);
    if (!found.some((entry) => entry.href === item.href)) found.push(item);
  };
  session.refs.forEach((ref) => {
    const book = ref.book;
    const chapter = ref.chapter;
    if (book === 1 && chapter <= 11) { push("ce"); push("ct"); }
    else if (book === 1 || book === 18 || (book >= 6 && book <= 14)) push("ia");
    else if (book === 23) { push("ip-1"); push("ip-2"); }
    else if (book === 24 || book === 25) push("jr");
    else if (book === 26) push("rr");
    else if (book === 27) push("dp");
    else if (book >= 15 && book <= 17) push("pm");
    else if (book >= 40 && book <= 43) { push("jy"); push("gt"); }
    else if (book === 44) push("bt");
    else if (book === 66) push("re");
  });
  const out = found.slice(0, 2);
  [guide("rsg"), guide("si"), guide("it")].forEach((item) => {
    if (out.length >= 3) return;
    if (!out.some((entry) => entry.href === item.href)) out.push(item);
  });
  return out;
}
