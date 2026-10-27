// Apparence : thèmes, dispositions, aperçus
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const errors = [];
  for (const [mode, desk] of [['dark', false], ['light', false], ['dark', true]]) {
    const ctx = await b.newContext({ viewport: desk ? { width: 1280, height: 860 } : { width: 390, height: 844 }, deviceScaleFactor: desk ? 1 : 2, colorScheme: mode, ignoreHTTPSErrors: true });
    const p = await ctx.newPage(), tag = mode + (desk ? '-d' : '');
    p.on('pageerror', e => errors.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
    p.on('dialog', d => d.accept());
    await p.goto('http://localhost:8765/');
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem('tdb2-demo', '1'); });
    await p.reload(); await sleep(p, 2500);
    for (let i = 0; i < 5 && await p.$('.overlay'); i++) { await p.keyboard.press('Escape'); await sleep(p, 900); }
    await p.evaluate(() => { document.getElementById('banners') && document.getElementById('banners').remove(); });
    await act(p, 'tab', { tab: 'settings' }); await sleep(p, 500);
    await p.screenshot({ path: `${out}/u-${tag}-settings.png` });
    await act(p, 'uiOpen'); await sleep(p, 1200);
    await p.screenshot({ path: `${out}/u-${tag}-layouts.png` });
    await act(p, 'lookThemes'); await sleep(p, 1500);
    await p.screenshot({ path: `${out}/u-${tag}-themes.png` });
    await p.evaluate(() => document.querySelector('.sheet').scrollTo(0, 3000)); await sleep(p, 300);
    await p.screenshot({ path: `${out}/u-${tag}-themes2.png` });
    await act(p, 'closeSheet'); await sleep(p, 400);
    for (const [ui, lay] of [['ocean', 'liste'], ['foret', 'mosaique'], ['sakura', 'classique'], ['saiyan', 'liste'], ['lave', 'classique'], ['akatsuki', 'liste'], ['galaxie', 'mosaique'], ['glace', 'classique'], ['prisme', 'mosaique'], ['minuit', 'epuree'], ['papier', 'liste'], ['gameboy', 'mosaique'], ['neon', 'classique']]) {
      if (desk && !['ocean', 'gameboy'].includes(ui)) continue;
      await act(p, 'lookSet', { kind: 'theme', id: ui }); await act(p, 'layoutSet', { id: lay });
      await act(p, 'tab', { tab: 'today' }); await sleep(p, 900);
      await p.evaluate(() => { const b = document.getElementById('banners'); if (b) b.remove(); });
      await p.screenshot({ path: `${out}/u-${tag}-${ui}-${lay}.png` });
      await p.evaluate(() => document.querySelector('.tiles').scrollIntoView({ block: 'start' })); await sleep(p, 300);
      await p.screenshot({ path: `${out}/u-${tag}-${ui}-${lay}-tiles.png` });
      const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > (desk ? 1280 : 390)) errors.push(`overflow ${tag} ${ui} ${lay} ${w}`);
    }
    console.log(tag, await p.evaluate(async () => { const st = await import('/js/store.js'); return JSON.stringify({ ui: st.S.settings.look, layouts: st.S.settings.layouts, de: [document.documentElement.dataset.ui, document.documentElement.dataset.layout] }); }));
    await ctx.close();
  }
  { const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push('pageerror: ' + e.message)); p.on('dialog', d => d.accept());
    await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(p, 1500);
    for (let i = 0; i < 4 && await p.$('.overlay'); i++) { await p.keyboard.press('Escape'); await sleep(p, 900); }
    await act(p, 'lookThemes'); await sleep(p, 1200);
    console.log('fresh', await p.evaluate(() => JSON.stringify({ open: [...document.querySelectorAll('.th-grid .lk-theme:not(.locked) b')].map(x => x.textContent), locked: [...document.querySelectorAll('.th-grid .lk-theme.locked small')].map(x => x.textContent) })));
    await p.screenshot({ path: `${out}/u-fresh-themes.png` });
    await ctx.close(); }
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
