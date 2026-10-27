// Expense Tracker v2 data layer: every Firebase call lives here, so the page (and the
// headless tests, which use a fake with the same interface) never touches the SDK.
// Loaded by index.html as an ES module; skipped in fake mode. Publishes window.ET2Store.
//
// Data model (finance-v2-plan/PLAN.md 4.1), per month doc users/{uid}/<col>/{YYYY-MM}:
//   txj  : JSON string {id: Tx}   rows imported from the sheet by sankey-v2 (never written here)
//   tx   : map {id: Tx}           rows written by this app (one field per row, so a save or a
//                                 delete is a single-field write that works OFFLINE)
//   del  : map {id: true}         deleted ids (hides an imported txj row, or an app row)
//   effective rows = txj + tx (tx wins on the same id) - del
// <col> is "sandbox" (test mode, before cutover) or "months" (real data, after cutover).
//
// Interface:
//   signIn(), signOut(), onUser(cb), checkAccess()
//   getSettings(), setSettings(partial)                 users/{uid}/meta/settings (merge)
//   watchMonths(col, fromYm, cb) -> unsubscribe          cb([{month, rows, pending}], {fromCache, pending})
//   loadAllMonths(col) -> [{month, rows}]
//   putRows(col, ym, {id: Tx})         add / overwrite rows        (promise resolves on server ack)
//   delRows(col, ym, [ids])            delete rows
//   moveRows(col, fromYm, toYm, ids, {id: Tx})   one batch: delete in old month, write in new

const SDK = "https://www.gstatic.com/firebasejs/13.1.0";   // same pinned version as sankey-v2

const { initializeApp } = await import(`${SDK}/firebase-app.js`);
const {
  getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signInWithRedirect, getRedirectResult, signOut: fbSignOut
} = await import(`${SDK}/firebase-auth.js`);
const {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, getDoc, getDocs, setDoc, writeBatch, query, where, onSnapshot,
  documentId, deleteField, serverTimestamp, FieldPath
} = await import(`${SDK}/firebase-firestore.js`);
const { firebaseConfig } = await import("./firebase-config.js");

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Persistent offline cache: saves made offline are queued on the phone and sent later.
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

let user = null;
const uidOrThrow = () => { if (!user) throw new Error("not signed in"); return user.uid; };
const COLS = new Set(["months", "sandbox"]);
const colRef = c => { if (!COLS.has(c)) throw new Error("bad collection " + c); return collection(db, "users", uidOrThrow(), c); };
const monthRef = (c, ym) => {
  if (!/^\d{4}-\d{2}$/.test(ym)) throw new Error("bad month id " + ym);
  return doc(colRef(c), ym);
};
const settingsRef = () => doc(db, "users", uidOrThrow(), "meta", "settings");

// ---- auth -------------------------------------------------------------------------
export async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try { return await signInWithPopup(auth, provider); }
  catch (err) {
    const code = err && err.code || "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      return signInWithRedirect(auth, provider);
    }
    throw err;
  }
}
export function signOut() { return fbSignOut(auth); }
export function onUser(cb) { return onAuthStateChanged(auth, u => { user = u; cb(u); }); }
export async function checkAccess() {
  try { await getDoc(settingsRef()); return "ok"; }
  catch (err) {
    if (err && err.code === "permission-denied") return "locked";
    if (err && err.code === "unavailable") return "ok";   // offline: the cache answers later
    return "error: " + (err && (err.code || err.message) || err);
  }
}

// ---- settings -----------------------------------------------------------------------
export async function getSettings() {
  const s = await getDoc(settingsRef());
  return s.exists() ? s.data() : {};
}
export function setSettings(partial) { return setDoc(settingsRef(), partial, { merge: true }); }

// ---- months -------------------------------------------------------------------------
function rowsOf(x) {
  let rows = {};
  if (typeof x.txj === "string") { try { rows = JSON.parse(x.txj) || {}; } catch (e) { rows = {}; } }
  Object.assign(rows, x.tx || {});
  for (const id in (x.del || {})) delete rows[id];
  return rows;
}
export function watchMonths(col, fromYm, cb) {
  const q = query(colRef(col), where(documentId(), ">=", fromYm));
  return onSnapshot(q, { includeMetadataChanges: true }, snap => {
    const list = snap.docs.map(d => ({ month: d.id, rows: rowsOf(d.data()), pending: d.metadata.hasPendingWrites }));
    cb(list, { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites });
  }, err => cb(null, { error: err && (err.code || err.message) || String(err) }));
}
export async function loadAllMonths(col) {
  const snap = await getDocs(colRef(col));
  return snap.docs.map(d => ({ month: d.id, rows: rowsOf(d.data()) }));
}

// One field per row: FieldPath("tx", id). mergeFields REPLACES that row as a whole (a plain
// merge would deep-merge and keep fields an edit removed, e.g. a transfer's pair).
const okId = id => { if (!/^[A-Za-z0-9_]+$/.test(id)) throw new Error("bad row id " + id); return id; };
function putPart(rows) {
  const data = { tx: {}, del: {}, updatedAt: serverTimestamp(), source: "app" };
  const fields = ["updatedAt", "source"];
  for (const id in rows) {
    okId(id);
    data.tx[id] = rows[id]; data.del[id] = deleteField();
    fields.push(new FieldPath("tx", id), new FieldPath("del", id));
  }
  return { data, fields };
}
function delPart(ids) {
  const data = { tx: {}, del: {}, updatedAt: serverTimestamp(), source: "app" };
  const fields = ["updatedAt", "source"];
  for (const id of ids) {
    okId(id);
    data.tx[id] = deleteField(); data.del[id] = true;
    fields.push(new FieldPath("tx", id), new FieldPath("del", id));
  }
  return { data, fields };
}
export function putRows(col, ym, rows) {
  const p = putPart(rows);
  return setDoc(monthRef(col, ym), p.data, { mergeFields: p.fields });
}
export function delRows(col, ym, ids) {
  const p = delPart(ids);
  return setDoc(monthRef(col, ym), p.data, { mergeFields: p.fields });
}
export function moveRows(col, fromYm, toYm, ids, rows) {
  const b = writeBatch(db), d = delPart(ids), p = putPart(rows);
  b.set(monthRef(col, fromYm), d.data, { mergeFields: d.fields });
  b.set(monthRef(col, toYm), p.data, { mergeFields: p.fields });
  return b.commit();
}

const api = { signIn, signOut, onUser, checkAccess, getSettings, setSettings,
              watchMonths, loadAllMonths, putRows, delRows, moveRows, rowsOf };
window.ET2Store = api;

// ---- sign-in gate (UI) ----------------------------------------------------------------
export function initGate() {
  const $ = id => document.getElementById(id);
  const gate = $("gate"), msg = $("gateMsg"), btn = $("gateBtn"), err = $("gateErr");
  getRedirectResult(auth).catch(e => { err.textContent = friendly(e); });
  btn.addEventListener("click", async () => {
    err.textContent = ""; btn.disabled = true;
    try { await signIn(); } catch (e) { err.textContent = friendly(e); }
    finally { btn.disabled = false; }
  });
  $("acctOut").addEventListener("click", async () => { await signOut(); location.reload(); });
  // Fast open: once signed in, the uid is remembered on this device, so the app starts at
  // once without waiting for Firebase to confirm the user or for a server access check.
  // Firestore itself waits for auth before it talks to the server, so reads stay private.
  let started = false;
  const go = u => {
    if (started) return; started = true;
    gate.hidden = true;
    $("acctEmail").textContent = u.email || "";
    window.ET2.start(api);
  };
  const hint = readHint(HINT_KEY);
  if (hint) { user = { uid: hint.uid, email: hint.email }; go(hint); }

  let first = true;
  onUser(async u => {
    if (!u) {
      localStorage.removeItem(HINT_KEY);
      if (!first || started) { location.reload(); return; }
      first = false;
      gate.hidden = false; btn.hidden = false;
      msg.textContent = "Sign in with your Google account to save entries.";
      return;
    }
    first = false;
    if (started && hint && hint.uid !== u.uid) { writeHint(HINT_KEY, u); location.reload(); return; }
    writeHint(HINT_KEY, u);
    go(u);
    const a = await checkAccess();   // background check; blocks only if access is really gone
    if (a !== "ok") {
      localStorage.removeItem(HINT_KEY);
      gate.hidden = false; btn.hidden = true;
      msg.textContent = a === "locked"
        ? "This Google account has no access to the database (rules not set for this uid: " + u.uid + ")."
        : "Database error: " + a;
      $("acctOutGate").hidden = false;
    }
  });
  $("acctOutGate").addEventListener("click", async () => { await signOut(); location.reload(); });
}

const HINT_KEY = "et2.user";
function readHint(k) {
  try { const h = JSON.parse(localStorage.getItem(k) || "null"); return h && h.uid ? h : null; }
  catch (e) { return null; }
}
function writeHint(k, u) {
  try { localStorage.setItem(k, JSON.stringify({ uid: u.uid, email: u.email || "" })); } catch (e) {}
}

function friendly(e) {
  const c = e && e.code || "";
  if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "Sign-in window closed. Try again.";
  if (c === "auth/unauthorized-domain") return "This site is not on the Firebase authorized domains list.";
  if (c === "auth/network-request-failed") return "No connection. Check the network and try again.";
  return "Sign-in failed: " + (c || (e && e.message) || e);
}
