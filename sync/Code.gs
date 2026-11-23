const SHEET_ID = '1YVEDD6MVBbVD_GKp-grBtjZG3Voo9_6sRsG8N19MmHc';
const CHAPTER_SHEET = 'Chapter marks';

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

function setChapter_(key, read) {
  const sh = chapterSheet_(true);
  const last = sh.getLastRow();
  const rows = [];
  if (last >= 2) {
    const vals = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
    for (let i = 0; i < vals.length; i++) {
      if (String(vals[i][0] || '').trim() === key) rows.push(i + 2);
    }
  }
  if (read) {
    if (!rows.length) {
      const cell = sh.getRange(Math.max(last, 1) + 1, 1);
      cell.setNumberFormat('@');
      cell.setValue(key);
    }
    return;
  }
  for (let i = rows.length - 1; i >= 0; i--) sh.deleteRow(rows[i]);
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
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const body = JSON.parse(e.postData.contents);
    const hasChapter = body.chapter != null && body.chapter !== '';
    const hasSession = body.n != null && body.n !== '';
    const keep = Array.isArray(body.keep) ? body.keep.map(function (key) { return String(key); }) : [];
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
    if (hasChapter) setChapter_(chapter, body.read === true);
    for (let i = 0; i < keep.length; i++) setChapter_(keep[i], true);
    if (hasSession) setSession_(n, body.done === true);
    return out_({ ok: true, done: state_(), chapters: chapters_() });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
