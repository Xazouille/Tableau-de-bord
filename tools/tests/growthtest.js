// Nouvelles cases (migration), compétences, habitudes, minuteur, bilan du mois.
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const sleep = (p, ms) => p.waitForTimeout(ms);
const shot = (p, n, full) => p.screenshot({ path: `${out}/g-${n}.png`, fullPage: !!full });
const closeOv = async p => { for (let i = 0; i < 6 && await p.$('.overlay'); i++) { const c = await p.$('.overlay [data-ov=close]'); if (c) await c.click({ force: true }); else await p.keyboard.press('Escape'); await sleep(p, 900); } };
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8765/');
  // Données « anciennes » : 10 cases, 5 journées parfaites
  await p.evaluate(() => {
    localStorage.clear();
    const ids = ['ecole', 'echecs', 'sport', 'argent', 'culture', 'alim', 'medit', 'sommeil', 'ecran', 'scroll'];
    const days = {};
    for (let i = 1; i <= 5; i++) { const d = new Date(); d.setDate(d.getDate() - i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; days[k] = { c: Object.fromEntries(ids.map(x => [x, 1])), note: '', u: 1 }; }
    const doms = ids.map(id => ({ id, name: id, emoji: '⭐', color: '#4f8cff', hint: '', archived: false, xp: 10, m: id === 'ecole' ? { kind: 'levels', q: '?', opts: [['15 min', 1], ['30 min', 1.5], ['1 h', 2], ['2 h et +', 3]] } : { kind: 'none' } }));
    localStorage.setItem('tdb2-data', JSON.stringify({ v: 2, meta: { modified: 1 }, profile: { name: 'Aaron', start: '2026-10-01', u: 1 }, settings: { theme: 'auto', threshold: 0.5, u: 1 }, domains: { list: doms, u: 1 }, days, goals: [], media: [], vision: { blocks: [], u: 1 }, game: { pulls: [], trades: [], visits: {}, badges: {}, jokerDays: {}, comp: [], rewards: [], u: 1 }, dead: {} }));
  });
  await p.reload(); await sleep(p, 1500);
  await closeOv(p);
  console.log('migrated', await p.evaluate(async () => { const st = await import('/js/store.js'), s = await import('/js/stats.js'); const keys = Object.keys(st.S.days).sort(); return JSON.stringify({ doms: st.S.domains.list.map(d => d.id + (d.from ? '@' + d.from : '')).join(','), perfect: keys.filter(s.isPerfect).length, ecoleOpts: st.S.domains.list[0].m.opts.map(o => o.length).join('') }); }));
  await shot(p, '01-today', true);
  // Case Compétence : nouvelle compétence + temps
  await p.click('.tile[data-id="competence"]'); await sleep(p, 600);
  await shot(p, '02-skill-sheet');
  await p.fill('.sheet input[name=name]', 'Anglais'); await p.keyboard.press('Enter'); await sleep(p, 500);
  await shot(p, '03-skill-picked');
  await p.click('.sheet [data-act="measureSkill"][data-v="1"]'); await sleep(p, 1500);
  await closeOv(p);
  // Hygiène (liste), Rangement (niveaux)
  await p.click('.tile[data-id="rangement"]'); await sleep(p, 500); await p.click('.sheet .opt >> nth=2'); await sleep(p, 600);
  await p.click('.tile[data-id="hygiene"]'); await sleep(p, 500); await p.click('.sheet .chk >> nth=0'); await p.click('.sheet .chk >> nth=3'); await p.click('.sheet .btn.primary'); await sleep(p, 800);
  await closeOv(p);
  await shot(p, '04-tiles');
  // Progrès
  await act(p, 'tab', { tab: 'growth' }); await act(p, 'growthTab', { t: 'skills' }); await sleep(p, 700);
  await p.click('.sk-star[data-s="4"]'); await sleep(p, 500);
  await shot(p, '05-skills');
  await act(p, 'growthTab', { t: 'habits' }); await sleep(p, 400);
  await p.fill('input[name=name]', 'Sucre'); await p.keyboard.press('Enter'); await sleep(p, 500);
  await p.evaluate(async () => { const st = await import('/js/store.js'); const h = st.S.habits[0]; const d = new Date(); d.setDate(d.getDate() - 8); h.start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; h.u = Date.now(); st.save(); });
  await sleep(p, 900);
  await shot(p, '06-habits');
  console.log('growth', await p.evaluate(async () => { const g = (await import('/js/game/rules.js')).G(); return JSON.stringify({ skills: g.skills.map(s => [s.name, s.stars, s.validated, s.sessions, s.xp]), habits: g.habits.map(h => [h.name, h.cur, h.best, h.xp]), bd: g.breakdown.growth }); }));
  // Minuteur : Méditation 5 min, avance l'horloge de 6 min
  await act(p, 'tab', { tab: 'today' }); await sleep(p, 500);
  await p.click('.timer-chip'); await sleep(p, 500);
  await p.click('.sheet [data-act="timerDom"][data-id="ecole"]'); await sleep(p, 300);
  await p.click('.sheet [data-act="timerMins"][data-m="15"]'); await sleep(p, 300);
  await p.click('.sheet [data-act="timerGo"]'); await sleep(p, 1500);
  await shot(p, '07-timer');
  await act(p, 'closeSheet'); await sleep(p, 400);
  await shot(p, '08-timer-pill');
  await p.evaluate(() => { const k = 'tdb2-timer', t = JSON.parse(localStorage.getItem(k)); t.start -= 16 * 60000; localStorage.setItem(k, JSON.stringify(t)); });
  await sleep(p, 2200);
  console.log('medit after timer', await p.evaluate(async () => { const st = await import('/js/store.js'), u = await import('/js/util.js'); return JSON.stringify({ done: st.isDone(u.todayKey(), 'ecole'), v: st.valOf(u.todayKey(), 'ecole'), timer: localStorage.getItem('tdb2-timer') }); }));
  await shot(p, '09-timer-done');
  // Bilan du mois
  await act(p, 'monthOpen'); await sleep(p, 1200);
  await shot(p, '10-month');
  await p.fill('#mr-good', 'Régulier sur le sport'); await p.fill('#mr-bad', 'Trop de téléphone le soir'); await p.fill('#mr-focus', 'Réviser le DCG chaque jour');
  await p.click('[data-ov=saveReview]'); await sleep(p, 1200);
  await shot(p, '11-month-saved');
  await closeOv(p);
  console.log('review', await p.evaluate(async () => { const g = (await import('/js/game/rules.js')).G(); return JSON.stringify({ rev: g.breakdown.reviews, c: g.boxes.c }); }));
  await act(p, 'tab', { tab: 'today' }); await sleep(p, 700);
  await shot(p, '12-today-focus');
  for (const t of ['stats', 'game', 'goals', 'media', 'vision', 'settings', 'more']) { await act(p, 'tab', { tab: t }); await sleep(p, 300); }
  await act(p, 'domEdit', { id: 'competence' }); await sleep(p, 400); await shot(p, '13-dom-edit'); await act(p, 'closeSheet');
  const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 390) errors.push('overflow ' + w);
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
