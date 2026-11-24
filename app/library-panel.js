"use client";

import { LIBRARY, SHELVES, guidesFor, searchUrl } from "../src/lib/research";

export function LibraryPanel({ session, query }) {
  const guides = (session.refs || []).length ? guidesFor(session) : [];
  let group = "";
  return (
    <>
      <section id="research" aria-labelledby="researchHeading">
        <h2 id="researchHeading">Research this chapter: <span id="queryLine">{query}</span></h2>
        <p className="help">
          Each shelf searches one chapter from this reading in the <a href={LIBRARY}>English publications library</a>. Insight, the Index, Books, the Watchtower, Awake!, the Glossary, and the Meeting Workbook. The articles stay on that site.
        </p>
        <div id="shelves">
          {SHELVES.map(([groupName, id, name, why]) => {
            const heading = groupName !== group;
            group = groupName;
            return (
              <div key={id}>
                {heading ? <h3 className="group">{groupName}</h3> : null}
                <a
                  className="shelf"
                  data-shelf={id}
                  data-track={`${query} · ${name}`}
                  href={searchUrl(query, id)}
                  target="_blank"
                  rel="noopener"
                >
                  <span className="shelf-name">{name}</span>
                  <span className="why">{why}</span>
                  <span className="open">Open</span>
                </a>
              </div>
            );
          })}
        </div>
        <p className="more"><a href={LIBRARY}>All publication shelves</a></p>
      </section>
      <section id="books" aria-labelledby="booksHeading">
        <h2 id="booksHeading">Books for this reading</h2>
        <p className="help">Publications from that library chosen for the Bible book in this session.</p>
        <div id="bookList">
          {guides.map((item) => (
            <a key={item.href} className="shelf" href={item.href} target="_blank" rel="noopener" data-track={item.title}>
              <span className="shelf-name">{item.title}</span>
              <span className="why">{item.why}</span>
              <span className="open">Open</span>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}
