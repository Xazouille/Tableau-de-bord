const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2], NB = process.argv[3];
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  await ctx.route('https://arosare.github.io/naruto-blazing-revival/**', r => { const f = path.join(NB, r.request().url().split('/naruto-blazing-revival/')[1]); fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort(); });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(500);
  // Vraies données de départ
  await p.locator('.tile').first().click(); await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const realBefore = await p.evaluate(() => localStorage.getItem('tdb2-data'));
  await act(p, 'tab', { tab: 'settings' }); await p.waitForTimeout(300);
  await p.click('[data-act=demoOn]'); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/demo-start.png` });
  const ov = await p.$('.overlay [data-ov=close]'); if (ov) { await ov.click(); await p.waitForTimeout(500); }
  await act(p, 'tab', { tab: 'today' }); await p.waitForTimeout(500);
  await p.screenshot({ path: `${out}/demo-today.png` });
  await act(p, 'tab', { tab: 'game' }); await p.waitForTimeout(1000);
  await p.screenshot({ path: `${out}/demo-game.png`, fullPage: true });
  await act(p, 'gameTab', { t: 'collection' }); await act(p, 'collSeries', { s: 'onepiece' }); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${out}/demo-coll-op.png` });
  const info = await p.evaluate(async () => { const r = await import('/js/game/rules.js'); const g = r.G(); return { lvl: g.lvl.level, boxes: g.boxes, forms: g.forms.size, comp: g.companion && g.companion.form.name, badges: Object.keys(JSON.parse(localStorage.getItem('tdb2-demo-data')).game.badges).length }; });
  console.log(JSON.stringify(info));
  await p.click('.demo-bar'); await p.waitForTimeout(1500);
  const realAfter = await p.evaluate(() => localStorage.getItem('tdb2-data'));
  const left = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('tdb2-demo')));
  console.log(left.join(','));console.log('vraies données intactes :', realBefore === realAfter, '· clés démo restantes :', left.length, '· bandeau :', !!(await p.$('.demo-bar')));
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
