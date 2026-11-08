// AMEX page: are the AMEX Platinum benefits worth the card's cost?
//   Benefits = rows in users/{uid}/amex/benefits (added here)
//            + membership points: INCOME rows on the MEMBERSHIP account in `months` (automatic)
//   Costs    = CreditCardCosts rows on the AMEXPLATINUM account in `months`
//   Net      = benefits - costs. Filters: category (Cash discount / Value Equivalent / ...)
//              and kind (Baseline / Lifestyle); costs never change with the filters.
// Classic script, loaded after the main one: uses its globals STORE, esc, showView, showToast.
(function () {
  const START = '2026-03';            // first month of the Platinum card
  const CARD = 'AMEXPLATINUM', COST_DT = 'CreditCardCosts', POINTS_ACCT = 'MEMBERSHIP';
  const POINTS = { ds: 'Membership points', c: 'Cash discount', k: 'Baseline' };
  const CATS0 = ['Cash discount', 'Value Equivalent'];
  const KINDS = ['Baseline', 'Lifestyle'];

  // First load: the list Stefano gave on 7 Nov 2026. Fixed ids, so seeding twice changes nothing.
  const SEED = `2026	10	1	50	Ticketone Jova	Cash discount	Baseline
2026	8	1	50	Ticketone Pinguini	Cash discount	Baseline
2026	3	1	75	Canavacciuolo	Cash discount	Lifestyle
2026	5	1	140	Punti Bonus post Italo punti missing	Cash discount	Baseline
2026	3	1	10	FreeNow	Cash discount	Lifestyle
2026	4	1	10	FreeNow	Cash discount	Lifestyle
2026	5	1	10	FreeNow	Cash discount	Lifestyle
2026	6	1	10	FreeNow	Cash discount	Lifestyle
2026	3	1	150	Travel Voucher Patagonia	Cash discount	Baseline
2026	3	1	200	Bonus Welcome	Cash discount	Baseline
2026	6	1	100	Auto Sardegna assicurazione	Value Equivalent	Baseline
2026	3	1	15	Lounge	Value Equivalent	Lifestyle
2026	3	1	15	Lounge	Value Equivalent	Lifestyle
2026	3	1	15	Lounge	Value Equivalent	Lifestyle
2026	3	1	15	Lounge	Value Equivalent	Lifestyle
2026	4	1	15	Lounge	Value Equivalent	Lifestyle
2026	4	1	15	Lounge	Value Equivalent	Lifestyle
2026	4	1	15	Lounge	Value Equivalent	Lifestyle
2026	4	1	15	Lounge	Value Equivalent	Lifestyle
2026	4	1	15	Lounge	Value Equivalent	Lifestyle
2026	5	1	15	Lounge	Value Equivalent	Lifestyle
2026	5	1	15	Lounge	Value Equivalent	Lifestyle
2026	5	1	15	Lounge	Value Equivalent	Lifestyle
2026	5	1	10	Lounge	Value Equivalent	Baseline
2026	5	1	10	Lounge	Value Equivalent	Baseline
2026	5	1	10	Lounge	Value Equivalent	Baseline
2026	5	1	10	Lounge	Value Equivalent	Baseline
2026	5	1	10	Lounge	Value Equivalent	Baseline
2026	6	1	10	Lounge	Value Equivalent	Baseline
2026	6	1	10	Lounge	Value Equivalent	Baseline
2026	6	1	10	Lounge	Value Equivalent	Baseline
2026	6	1	10	Lounge	Value Equivalent	Baseline
2026	7	1	10	Lounge	Value Equivalent	Baseline
2026	7	1	10	Lounge	Value Equivalent	Baseline
2026	7	1	10	Lounge	Value Equivalent	Baseline
2026	3	1	8	Fast Track	Value Equivalent	Lifestyle
2026	3	1	8	Fast Track	Value Equivalent	Lifestyle
2026	3	1	8	Fast Track	Value Equivalent	Lifestyle
2026	4	1	8	Fast Track	Value Equivalent	Lifestyle
2026	4	1	8	Fast Track	Value Equivalent	Lifestyle
2026	4	1	8	Fast Track	Value Equivalent	Lifestyle
2026	5	1	8	Fast Track	Value Equivalent	Lifestyle
2026	5	1	8	Fast Track	Value Equivalent	Lifestyle
2026	5	1	8	Fast Track	Value Equivalent	Lifestyle
2026	6	1	8	Fast Track	Value Equivalent	Lifestyle
2026	6	1	8	Fast Track	Value Equivalent	Lifestyle
2026	6	1	8	Fast Track	Value Equivalent	Lifestyle
2026	7	1	8	Fast Track	Value Equivalent	Lifestyle
2026	3	1	90	Assicurazione Patagonia	Value Equivalent	Baseline
2026	3	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	4	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	5	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	6	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	7	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	8	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	3	1	8	Fast Track	Value Equivalent	Lifestyle
2026	8	1	10	FreeNow	Cash discount	Lifestyle
2026	8	1	25	Lounge	Value Equivalent	Lifestyle
2026	8	1	8	Fast Track	Value Equivalent	Lifestyle
2026	8	1	10	Lounge	Value Equivalent	Baseline
2026	8	1	15	Lounge	Value Equivalent	Lifestyle
2026	8	1	10	Lounge	Value Equivalent	Baseline
2026	8	1	15	Lounge	Value Equivalent	Lifestyle
2026	8	1	10	FreeNow	Cash discount	Lifestyle
2026	8	1	10	Lounge	Value Equivalent	Baseline
2026	8	1	15	Lounge	Value Equivalent	Lifestyle
2026	9	1	8	Fast Track	Value Equivalent	Lifestyle
2026	9	1	8	Fast Track	Value Equivalent	Lifestyle
2026	9	1	10	Lounge	Value Equivalent	Baseline
2026	9	1	15	Lounge	Value Equivalent	Lifestyle
2026	9	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	9	1	5	Lounge	Value Equivalent	Baseline
2026	9	1	20	Lounge	Value Equivalent	Lifestyle
2026	9	1	8	Fast Track	Value Equivalent	Lifestyle
2026	9	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	10	1	10	FreeNow	Cash discount	Lifestyle
2026	10	1	25	Lounge	Value Equivalent	Lifestyle
2026	10	1	8	Fast Track	Value Equivalent	Lifestyle
2026	10	1	10	Lounge	Value Equivalent	Baseline
2026	10	1	15	Lounge	Value Equivalent	Lifestyle
2026	10	1	8	Fast Track	Value Equivalent	Lifestyle
2026	10	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	10	1	20	Biglietto Italo	Value Equivalent	Baseline
2026	11	1	20	Biglietto Italo	Value Equivalent	Baseline`;
  const p2 = n => String(n).padStart(2, '0');
  function seedRows() {
    const out = {};
    SEED.split('\n').forEach((line, i) => {
      const [y, m, d, v, ds, c, k] = line.split('\t');
      out['seed' + p2(i + 1).padStart(3, '0')] = { d: `${y}-${p2(m)}-${p2(d)}`, v: Number(v), ds, c, k, o: i + 1 };
    });
    return out;
  }

  let BEN = {}, MON = [], started = false, seeding = false;
  const F = { c: '', k: '', m: '' };          // '' = all; m = 'YYYY-MM'
  const FORM = { c: 'Value Equivalent', k: 'Baseline' };
  const $ = id => document.getElementById(id);
  const eur = n => (n < 0 ? '−' : '') + '€' + Math.abs(Math.round(n)).toLocaleString('it-IT');
  const ymOf = d => String(d || '').slice(0, 7);
  const ymName = ym => { const [y, m] = ym.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1] + ' ' + y.slice(2); };

  function start() {
    if (started || !STORE || !STORE.watchAmex) return;
    started = true;
    STORE.watchAmex(s => {
      if (!s) { $('amexStatus').textContent = 'Could not load benefits.'; return; }
      BEN = s.rows;
      if (!s.seeded && !s.fromCache && !seeding) {     // first time ever: load the starting list
        seeding = true;
        STORE.putAmex(seedRows(), { seeded: true }).catch(e => showToast('Seed failed: ' + (e.code || e.message)));
      }
      render();
    });
    STORE.watchMonths('months', START, list => { if (list) { MON = list; render(); } });
  }

  // Benefit rows (manual + automatic points) and cost rows, from START on.
  function allBenefits() {
    const out = [];
    for (const id in BEN) { const r = BEN[id]; if (ymOf(r.d) >= START) out.push({ id, ...r, ym: ymOf(r.d) }); }
    MON.forEach(m => {
      for (const id in m.rows) {
        const t = m.rows[id];
        if (t.a === POINTS_ACCT && t.ty === 'INCOME' && Number(t.v)) out.push({ id, auto: true, d: t.d, ym: m.month, v: Number(t.v), ...POINTS });
      }
    });
    return out;
  }
  function allCosts() {
    const out = [];
    MON.forEach(m => {
      for (const id in m.rows) {
        const t = m.rows[id];
        if (t.a === CARD && t.dt === COST_DT && Number(t.v)) out.push({ ym: m.month, v: -Number(t.v) });
      }
    });
    return out;
  }
  const passM = r => !F.m || r.ym === F.m;    // month filter: benefits AND costs
  const pass = r => (!F.c || r.c === F.c) && (!F.k || r.k === F.k) && passM(r);
  function catList() {
    const s = new Set(CATS0.concat(FORM.c));
    Object.values(BEN).forEach(r => r.c && s.add(r.c));
    return [...s];
  }

  function chips(group, list, cur, withAll) {
    const items = (withAll ? [['', 'All']] : []).concat(list.map(x => [x, x]));
    return items.map(([v, t]) => `<button type="button" class="pk-chip${v === cur ? ' on' : ''}" data-g="${group}" data-v="${esc(v)}">${esc(t)}</button>`).join('');
  }

  function render() {
    if (!$('viewAmex')) return;
    const ben = allBenefits(), allC = allCosts();
    const monthList = [...new Set([...ben.map(r => r.ym), ...allC.map(r => r.ym)])].sort().reverse();
    if (F.m && !monthList.includes(F.m)) F.m = '';
    const costs = allC.filter(passM);
    const shown = ben.filter(pass);
    const B = shown.reduce((s, r) => s + r.v, 0), C = costs.reduce((s, r) => s + r.v, 0), N = B - C;
    $('amexB').textContent = eur(B);
    $('amexC').textContent = eur(C);
    $('amexN').textContent = (N > 0 ? '+' : '') + eur(N);
    $('amexN').className = 'ax-big ' + (N >= 0 ? 'pos' : 'neg');
    $('amexStatus').textContent = (N >= 0 ? 'The card pays for itself' : 'The card costs more than it gives') +
      (F.m ? ` · ${ymName(F.m)}` : ` · since ${ymName(START)}`) +
      (F.c || F.k ? ' · filtered: ' + [F.c, F.k].filter(Boolean).join(', ') : '');
    $('amexFc').innerHTML = chips('fc', catList(), F.c, true);
    $('amexFk').innerHTML = chips('fk', KINDS, F.k, true);
    $('amexFm').innerHTML = [['', 'All']].concat(monthList.map(ym => [ym, ymName(ym)])).map(([v, t]) =>
      `<button type="button" class="pk-chip${v === F.m ? ' on' : ''}" data-g="fm" data-v="${esc(v)}">${esc(t)}</button>`).join('');
    $('amexAc').innerHTML = chips('ac', catList(), FORM.c, false) + '<button type="button" class="pk-chip add" data-g="acnew">+ New</button>';
    $('amexAk').innerHTML = chips('ak', KINDS, FORM.k, false);

    // usual descriptions: tap one to fill the form
    const used = new Map();
    Object.values(BEN).sort((a, b) => (a.o || 0) - (b.o || 0)).forEach(r => {
      const u = used.get(r.ds) || { n: 0, r }; u.n++; u.r = r; used.set(r.ds, u);
    });
    $('amexUsual').innerHTML = [...used.values()].sort((a, b) => b.n - a.n).slice(0, 8)
      .map(u => `<button type="button" class="pk-chip" data-g="use" data-v="${esc(u.r.ds)}">${esc(u.r.ds)} ${u.r.v}</button>`).join('');

    // by benefit
    const by = new Map();
    shown.forEach(r => { const x = by.get(r.ds) || { n: 0, v: 0, c: r.c, k: r.k, auto: r.auto }; x.n++; x.v += r.v; by.set(r.ds, x); });
    $('amexBy').innerHTML = [...by.entries()].sort((a, b) => b[1].v - a[1].v).map(([ds, x]) =>
      `<div class="ax-row"><div><div>${esc(ds)}${x.auto ? ' <span class="ax-tag">auto</span>' : ''}</div>
       <div class="ax-sub">${esc(x.c)} · ${esc(x.k)} · ${x.n}×</div></div><div class="ax-v">${eur(x.v)}</div></div>`).join('')
      || '<p class="ax-sub">Nothing with this filter.</p>';

    // by month
    const months = new Set([...shown.map(r => r.ym), ...costs.map(r => r.ym)]);
    let run = 0;
    const rows = [...months].sort().map(ym => {
      const b = shown.filter(r => r.ym === ym).reduce((s, r) => s + r.v, 0);
      const c = costs.filter(r => r.ym === ym).reduce((s, r) => s + r.v, 0);
      run += b - c;
      return `<tr><td>${ymName(ym)}</td><td>${eur(b)}</td><td>${eur(c)}</td><td class="${b - c >= 0 ? 'pos' : 'neg'}">${eur(b - c)}</td><td class="${run >= 0 ? 'pos' : 'neg'}">${eur(run)}</td></tr>`;
    });
    $('amexMonths').innerHTML = `<table class="ax-tbl"><tr><th>Month</th><th>Benefit</th><th>Cost</th><th>Net</th><th>Total</th></tr>${rows.reverse().join('')}</table>`;

    // entries, newest first
    const list = shown.slice().sort((a, b) => (b.d || '').localeCompare(a.d || '') || ((b.o || 0) - (a.o || 0)));
    $('amexList').innerHTML = list.map(r =>
      `<div class="ax-row"><div><div>${esc(r.ds)}</div><div class="ax-sub">${ymName(r.ym)} · ${esc(r.c)} · ${esc(r.k)}</div></div>
       <div class="ax-v">${eur(r.v)}${r.auto ? ' <span class="ax-tag">auto</span>' : ` <button type="button" class="ax-del" data-id="${esc(r.id)}" aria-label="Delete">✕</button>`}</div></div>`).join('');
  }

  function add() {
    const ds = $('amexDs').value.trim();
    const v = Number(String($('amexV').value).replace(',', '.'));
    const d = $('amexD').value;
    if (!ds) { showToast('Add a description'); return; }
    if (!(v > 0)) { showToast('Add a value'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { showToast('Pick a date'); return; }
    const id = 'a' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(36) + Math.random().toString(36).slice(2));
    STORE.putAmex({ [id]: { d, v, ds, c: FORM.c, k: FORM.k, o: Date.now() } }).catch(e => showToast('Save failed: ' + (e.code || e.message)));
    $('amexDs').value = ''; $('amexV').value = '';
    showToast('Added ' + ds + ' ' + eur(v));
  }

  function today() { const n = new Date(); return `${n.getFullYear()}-${p2(n.getMonth() + 1)}-${p2(n.getDate())}`; }

  document.addEventListener('DOMContentLoaded', () => {
    $('amexD').value = today();
    $('btnAmex').addEventListener('click', () => { showView('viewAmex'); start(); render(); });
    $('amexAdd').addEventListener('click', add);
    $('viewAmex').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const g = b.dataset.g, v = b.dataset.v;
      if (b.classList.contains('ax-del')) {
        const r = BEN[b.dataset.id];
        if (r && confirm(`Delete ${r.ds} ${eur(r.v)}?`)) STORE.delAmex([b.dataset.id]).catch(err => showToast('Delete failed: ' + (err.code || err.message)));
        return;
      }
      if (g === 'fc') F.c = v; else if (g === 'fk') F.k = v; else if (g === 'fm') F.m = v;
      else if (g === 'ac') FORM.c = v; else if (g === 'ak') FORM.k = v;
      else if (g === 'acnew') { const n = (prompt('New category') || '').trim(); if (n) FORM.c = n; else return; }
      else if (g === 'use') {
        const r = Object.values(BEN).filter(x => x.ds === v).sort((a, b) => (b.o || 0) - (a.o || 0))[0];
        if (r) { $('amexDs').value = r.ds; $('amexV').value = r.v; FORM.c = r.c; FORM.k = r.k; }
      } else return;
      render();
    });
  });
})();
