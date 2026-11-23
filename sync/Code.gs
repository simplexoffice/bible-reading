const SHEET_ID = '1YVEDD6MVBbVD_GKp-grBtjZG3Voo9_6sRsG8N19MmHc';
const CHAPTER_SHEET = 'Chapter marks';
const MAX_BODY = 4096;
const MAX_KEEP = 16;

function tokenOk_(given) {
  const expected = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN') || '';
  const provided = typeof given === 'string' ? given : '';
  if (expected.length < 16 || provided.length !== expected.length || provided.length > 128) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return mismatch === 0;
}

function spreadsheet_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function getSheet_() {
  return spreadsheet_().getSheets()[0];
}

function state_() {
  const sh = getSheet_();
  const vals = sh.getRange(1, 1, sh.getLastRow(), 2).getValues();
  const done = [];
  for (let i = 0; i < vals.length; i++) {
    const n = vals[i][1];
    if (typeof n === 'number' && n >= 1 && vals[i][0] === true) done.push(n);
  }
  return done;
}

function chapterKeyOk_(key) {
  return /^\d{1,3}:\d{1,3}$/.test(key);
}

function chapterSheet_(create) {
  const ss = spreadsheet_();
  let sh = ss.getSheetByName(CHAPTER_SHEET);
  if (!sh && create) {
    sh = ss.insertSheet(CHAPTER_SHEET);
    sh.getRange(1, 1).setValue('Key');
    sh.setFrozenRows(1);
  }
  return sh;
}

function chapters_() {
  const sh = chapterSheet_(false);
  if (!sh) return [];
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  const keys = [];
  for (let i = 0; i < vals.length; i++) {
    const key = String(vals[i][0] || '').trim();
    if (chapterKeyOk_(key) && keys.indexOf(key) < 0) keys.push(key);
  }
  return keys;
}

function applyChapters_(changes) {
  if (!changes.length) return;
  const sh = chapterSheet_(true);
  const last = Math.max(sh.getLastRow(), 1);
  const existing = [];
  if (last >= 2) {
    const vals = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (let i = 0; i < vals.length; i++) {
      const key = String(vals[i][0] || '').trim();
      if (chapterKeyOk_(key) && existing.indexOf(key) < 0) existing.push(key);
    }
  }
  for (let i = 0; i < changes.length; i++) {
    const at = existing.indexOf(changes[i].key);
    if (changes[i].read) {
      if (at < 0) existing.push(changes[i].key);
    } else if (at >= 0) existing.splice(at, 1);
  }
  if (last >= 2) sh.getRange(2, 1, last - 1, 1).clearContent();
  if (!existing.length) return;
  const range = sh.getRange(2, 1, existing.length, 1);
  range.setNumberFormat('@');
  range.setValues(existing.map(function (key) { return [key]; }));
}

function setSession_(n, done) {
  const sh = getSheet_();
  const vals = sh.getRange(1, 2, sh.getLastRow(), 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (vals[i][0] === n) {
      sh.getRange(i + 1, 1).setValue(done === true);
      break;
    }
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return out_({ ok: true, done: state_(), chapters: chapters_() });
}

function doPost(e) {
  const raw = e && e.postData && e.postData.contents ? String(e.postData.contents) : '';
  if (!raw || raw.length > MAX_BODY) return out_({ ok: false, error: 'bad request' });
  let body;
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return out_({ ok: false, error: 'bad request' });
  }
  if (!body || typeof body !== 'object' || !tokenOk_(body.token)) return out_({ ok: false, error: 'unauthorized' });
  const hasChapter = body.chapter != null && body.chapter !== '';
  const hasSession = body.n != null && body.n !== '';
  const keep = Array.isArray(body.keep) ? body.keep.map(function (key) { return String(key); }) : [];
  if (keep.length > MAX_KEEP) return out_({ ok: false, error: 'too many chapters' });
  if (!hasChapter && !hasSession && !keep.length) return out_({ ok: false, error: 'nothing to save' });
  const chapter = hasChapter ? String(body.chapter) : '';
  if (hasChapter && !chapterKeyOk_(chapter)) return out_({ ok: false, error: 'bad chapter' });
  for (let i = 0; i < keep.length; i++) {
    if (!chapterKeyOk_(keep[i])) return out_({ ok: false, error: 'bad chapter' });
  }
  let n = 0;
  if (hasSession) {
    n = Number(body.n);
    if (!(n >= 1 && n <= 365)) return out_({ ok: false, error: 'bad session number' });
  }
  const changes = [];
  if (hasChapter) changes.push({ key: chapter, read: body.read === true });
  for (let i = 0; i < keep.length; i++) changes.push({ key: keep[i], read: true });
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    applyChapters_(changes);
    if (hasSession) setSession_(n, body.done === true);
    return out_({ ok: true, done: state_(), chapters: chapters_() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
