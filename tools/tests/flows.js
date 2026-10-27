// Parcours des nouveautés : boss vaincu, fusion, brillante, bilan du dimanche, records, maîtrise.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2], NB = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const sleep = (p, ms) => p.waitForTimeout(ms);
const shot = (p, n) => p.screenshot({ path: `${out}/f-${n}.png` });
const G = p => p.evaluate(async () => { const g = (await import('/js/game/rules.js')).G(); return { boss: g.boss.current && { n: g.boss.current.n, name: g.boss.current.name, hp: g.boss.current.hp, dmg: g.boss.current.dmg }, hist: g.boss.history.map(b => `${b.name}:${b.won ? 'won' : 'lost'}`), boxes: g.boxes, dups: g.dups, awaken: g.awaken, shinies: g.shinies, frags: g.frags }; });
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  await ctx.route('https://arosare.github.io/naruto-blazing-revival/**', r => { const f = path.join(NB, r.request().url().split('/naruto-blazing-revival/')[1]); fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort(); });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  // Dimanche 19 h : le bilan doit s'ouvrir
  await p.clock.install({ time: new Date('2026-11-01T19:05:00') });
  await p.goto('http://localhost:8765/');
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await sleep(p, 1200);
  console.log('start', JSON.stringify(await G(p)));
  // Le boss a commencé il y a 3 jours, et 3 grosses journées sont faites : il doit tomber
  await p.evaluate(async () => {
    const st = await import('/js/store.js'), u = await import('/js/util.js');
    st.S.game.since = u.key(u.addDays(u.today(), -3));
    const ids = st.activeDomains().map(d => d.id);
    for (let i = 3; i >= 1; i--) { const k = u.key(u.addDays(u.today(), -i)); ids.forEach(id => st.setDone(k, id, true)); st.setMood(k, 4); }
    st.save();
  });
  await sleep(p, 2200);
  await shot(p, '01-after-data');
  console.log('after data', JSON.stringify(await G(p)));
  // Écrans en file : niveau, boss vaincu, bilan
  for (let i = 0; i < 6; i++) {
    const kind = await p.evaluate(() => { const o = document.querySelector('.overlay'); return o ? o.className : ''; });
    if (!kind) break;
    await sleep(p, 1600);
    await shot(p, `02-overlay-${i}`);
    console.log('overlay', i, kind);
    const c = await p.$('.overlay [data-ov=close]');
    if (c) await c.click({ force: true }); else await p.keyboard.press('Escape');
    await sleep(p, 1200);
  }
  await act(p, 'tab', { tab: 'today' }); await sleep(p, 800);
  await shot(p, '03-today');
  // Fusion : 4 copies de Kakashi, puis fusion depuis la fiche
  await p.evaluate(async () => {
    const st = await import('/js/store.js');
    for (let i = 0; i < 5; i++) st.S.game.pulls.push({ id: 'k' + i, b: 'kk', k: 'p', l: 'na-kakashi', r: 4, t: Date.now() + i });
    st.save();
  });
  await sleep(p, 1200);
  for (let i = 0; i < 4 && await p.$('.overlay'); i++) { const c = await p.$('.overlay [data-ov=close]'); if (c) await c.click({ force: true }); else await p.keyboard.press('Escape'); await sleep(p, 1000); }
  await act(p, 'cardOpen', { id: 'na-kakashi' }); await sleep(p, 700);
  await shot(p, '04-card-sheet');
  await p.click('[data-act="fuse"]'); await sleep(p, 2400);
  await shot(p, '05-fusion');
  await p.keyboard.press('Escape'); await sleep(p, 800);
  console.log('after fusion', JSON.stringify((await G(p)).awaken), 'dups', (await G(p)).dups['na-kakashi']);
  // Brillante forcée dans une petite box
  const bx = await G(p);
  console.log('boxes', JSON.stringify(bx.boxes));
  if (bx.boxes.total) {
    await p.evaluate(async () => { const m = await import('/js/game/gacha.js'); m.SHINY_ODDS.p = m.SHINY_ODDS.c = m.SHINY_ODDS.g = 1; });
    await act(p, 'openBox', { k: bx.boxes.p ? 'p' : bx.boxes.c ? 'c' : 'g' }); await sleep(p, 900);
    if (await p.$('.altar')) { await p.click('.alt-item:not(.empty)'); await sleep(p, 900); }
    for (let i = 0; i < 3; i++) { await p.click('.sm-chest', { force: true }); await sleep(p, 500); }
    await p.waitForSelector('.spread .fcard', { timeout: 6000 }); await sleep(p, 1200);
    await shot(p, '06-spread');
    console.log('cards', await p.evaluate(() => [...document.querySelectorAll('.fcard')].map(f => f.className).join(' | ')));
    await p.click('.fcard[data-i="0"]', { force: true }); await sleep(p, 1600);
    await shot(p, '07-reveal');
    const sc = await p.$('.showcase:not([hidden]) .sc'); if (sc) { await sc.click({ force: true }); await sleep(p, 600); }
    const fa = await p.$('[data-ov=flipAll]'); if (fa) { await fa.click(); }
    for (let k = 0; k < 40 && !(await p.$('.sp-foot.done')); k++) { await sleep(p, 250); const s2 = await p.$('.showcase:not([hidden]) .sc'); if (s2) { await sleep(p, 500); await s2.click({ force: true }); } }
    await sleep(p, 600);
    await shot(p, '08-summary');
    await p.click('.sp-foot [data-ov=close]'); await sleep(p, 1000);
  }
  console.log('final', JSON.stringify({ shinies: (await G(p)).shinies }));
  await act(p, 'tab', { tab: 'game' }); await act(p, 'gameTab', { t: 'mastery' }); await sleep(p, 700);
  await shot(p, '09-mastery');
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
