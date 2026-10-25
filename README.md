# Expense Tracker v2 (Firebase)

The same form as the lean Expense Tracker (v1, `..\expense tracker`), but it saves straight
to Firestore instead of Google Apps Script + Sheet1. Part of Finance v2: plan in
`..\Personal Finance\finance-v2-plan\PLAN.md` (phase 4).

Live: https://stefanoamato93-wq.github.io/expense-tracker-v2/ (sign in with Google).

## What changed vs v1

| | v1 (lean, v5) | v2 |
|---|---|---|
| Saves to | Apps Script → `Sheet1` | Firestore `users/{uid}/sandbox` (test mode) or `months` (after cutover) |
| Save time | 1–30 s (cold Apps Script) | instant; Firestore's offline cache sends it |
| Offline | hand-made outbox + backoff retries | built into Firestore (queued on the phone) |
| Edit / delete | row numbers, content matching, tombstones | by row id, instant, also offline |
| Extra columns (Type, Category 1…) | filled by sheet formulas | filled by the app on save (rules below) |
| Pick-lists | per device (`localStorage`) | shared: `meta/settings.listsj` (+ offline copy `et2-lists`) |
| Sign-in | none (public script URL) | Google, owner uid only (Firestore rules) |
| History | last 300 sheet rows | live listener on the last 3 months; "Older months" adds 3 |

Same as v1: roll pickers, category editor, Export categories, transfers write two rows
(mirror: other account, opposite value), and `resetForm()` scrolls back to the first roll
(`#rollAccountMinus`) after every save.

## Test mode (until cutover)

While `meta/settings.cutover` is not `true`, every save goes to `users/{uid}/sandbox/…`,
never to your real data (`months`, which sankey-v2 still re-imports from the sheet).
A yellow banner says so. On cutover day (phase 5) set `cutover: true`: the banner goes,
saves go to `months`, and sankey-v2 stops importing the sheet.

## Data model

One doc per month, `users/{uid}/<sandbox|months>/{YYYY-MM}`:
- `txj` — JSON string of the rows imported from the sheet (written only by sankey-v2).
- `tx.<id>` — one map field per row saved by this app. One field per row means a save or
  a delete is a single small write that also works offline.
- `del.<id>: true` — deleted ids (hides an imported row too).
- Rows shown = `txj` + `tx` − `del`. sankey-v2 `data.js` reads the same way.

A row (`Tx`): `d` date, `t` timestamp (`M/D/YYYY H:MM:SS`, as in Sheet1), `o` order,
`a` account, `v` value, `l` label, `dt` detail, `acdf` asset pick, plus the derived
`acd ac var liq av c3 ty c1 c2`. Transfers carry `pair` (the other row's id); the
primary row also has `pm: 1`. Ids are `a` + a random UUID (letters and digits only).

## Rules (the columns the sheet used to compute)

Learned from your real data in `months` (all imported sheet rows), rebuilt weekly or with
**Rebuild rules from your data**. Saved in `meta/settings.rulesj`.

| Column | Decided by |
|---|---|
| Asset class details | the account; for accounts whose value varies (DEGIRO, OBJECTS) your Asset Class pick |
| Asset class, Variable, Available, Category 3 | the account |
| Liquidity | the account, or account + label where they differ (e.g. FINECO TRANSFER = ILLIQUID) |
| Type, Category 2 | the label |
| Category 1 | label + detail (a new detail uses the label's usual value) |

Checked 25 Oct 2026: these rules reproduce 12,293 of 12,297 sheet rows. The 4 others are
old FINECO rows (RealEstate / TFR) kept as one-offs by decision: new non-cash income is
booked straight on the asset account (REALESTATE, TFR, PRIAMO), so no exception is needed.

A label or account the rules have never seen opens a small dialog once ("pick how it is
grouped"); the answer is saved in `meta/settings.ruleoverj` and always wins.

## Files

- `index.html` — the app (copied from v1; the Apps Script sync engine is replaced).
- `store.js` — every Firebase call (auth gate, settings, month listener, writes). ES module,
  Firebase JS SDK 13.1.0 from gstatic, no build step.
- `firebase-config.js` — web config (not a secret; security is sign-in + rules).
- `favicon.svg`, `icon-192/512/180.png`, `manifest.webmanifest` — blue € icon with a "2".
- `_verify_tracker.py` (not committed) — headless Edge check with a fake store seeded from
  the real sheet: rules parity, expense, transfer, edit, month move, delete, new-label dialog.

## Buttons

- **Export data (JSON backup)** downloads every month of the current collection.
- **Rebuild rules from your data** relearns the rules now.
- **Sign out** (under the buttons).
