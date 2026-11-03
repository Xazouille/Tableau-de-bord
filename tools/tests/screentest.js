const { chromium } = require('playwright');
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8765/');
  // Anciennes données : case « Écran < 2h », 3 semaines d'historique
  await p.evaluate(() => {
    localStorage.clear();
    const K = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ws = new Date(); ws.setHours(0, 0, 0, 0); ws.setDate(ws.getDate() - ((ws.getDay() + 6) % 7));
    const days = {};
    // semaines -3 : 5 jours, -2 : 4 jours, -1 : 6 jours
    [[3, 5], [2, 4], [1, 6]].forEach(([w, n]) => { for (let i = 0; i < 7; i++) { const d = new Date(ws); d.setDate(d.getDate() - 7 * w + i); days[K(d)] = { c: i < n ? { ecran: 1, sport: 1 } : { sport: 1 }, x: i < n ? { ecran: 0 } : {}, note: '', u: 1 }; } });
    const doms = [{ id: 'ecran', name: 'Écran < 2h', emoji: '📵', color: '#ff4fa3', hint: 'Moins de 2 h sur le téléphone', archived: false, xp: 20, m: { kind: 'levels', q: '?', opts: [['1 h 30 – 2 h', 1], ['1 h – 1 h 30', 2], ['30 min – 1 h', 2.5], ['Moins de 30 min', 3]] } },
      { id: 'sport', name: 'Sport', emoji: '🏃', color: '#ff5a5f', hint: '', archived: false, xp: 20, m: { kind: 'none' } }];
    localStorage.setItem('tdb2-data', JSON.stringify({ v: 2, meta: { modified: 1 }, profile: { name: 'Aaron', start: K(new Date(2026, 8, 1)), u: 1 }, settings: { theme: 'auto', threshold: 0.5, u: 1 }, domains: { list: doms, added: ['pas', 'journal', 'competence', 'rangement', 'hygiene'], u: 1 }, days, goals: [], media: [], vision: { blocks: [], u: 1 }, game: { pulls: [], trades: [], visits: {}, badges: {}, jokerDays: {}, comp: [], rewards: [], u: 1 }, dead: {} }));
  });
  await p.reload(); await sleep(p, 1500);
  for (let i = 0; i < 5 && await p.$('.overlay'); i++) { await p.keyboard.press('Escape'); await sleep(p, 900); }
  const xpBefore = await p.evaluate(async () => (await import('/js/game/rules.js')).G().xp);
  console.log('migrated', await p.evaluate(async () => { const st = await import('/js/store.js'), sc = await import('/js/game/screen.js'); const d = st.S.domains.list.find(x => x.id === 'ecran'); return JSON.stringify({ name: d.name, adapt: d.adapt, limit: sc.screenLimit(), opts: sc.screenOpts().map(o => o[0]) }); }));
  // Le suivi commence 3 semaines plus tôt : 5 jours ✓, 4 jours ✗, 6 jours ✓ → 4 h − 30 min
  await p.evaluate(async () => { const st = await import('/js/store.js'); const d = st.S.domains.list.find(x => x.id === 'ecran'), ws = new Date(); ws.setDate(ws.getDate() - 21); d.adapt.from = `${ws.getFullYear()}-${String(ws.getMonth() + 1).padStart(2, '0')}-${String(ws.getDate()).padStart(2, '0')}`; st.touch(st.S.domains); st.save(); });
  await sleep(p, 800);
  console.log('after weeks', await p.evaluate(async () => { const sc = await import('/js/game/screen.js'), r = await import('/js/game/rules.js'); return JSON.stringify({ limit: sc.screenLimit(), opts: sc.screenOpts().map(o => o[0]), week: sc.screenWeek(), xp: r.G().xp }); }), 'xp avant', xpBefore);
  await p.click('.tile[data-id="ecran"]'); await sleep(p, 600);
  await p.screenshot({ path: 'shots-screen-sheet.png' });
  console.log('sheet', await p.evaluate(() => document.querySelector('.sheet .plan-line').textContent + ' | ' + [...document.querySelectorAll('.sheet .opt span')].map(x => x.textContent).join(', ')));
  await p.click('.sheet [data-act=measureSet][data-v="1"]'); await sleep(p, 900);
  console.log('tile', await p.evaluate(() => document.querySelector('.tile[data-id="ecran"] .t-hint').textContent), 'banners', await p.evaluate(() => [...document.querySelectorAll('.ban b')].map(x => x.textContent).join(' / ')));
  console.log('timer doms', await p.evaluate(async () => (await import('/js/timer.js')).timedDomains().map(d => d.id).join(',')));
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
