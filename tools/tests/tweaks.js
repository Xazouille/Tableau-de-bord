const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8765/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(p, 1200);
  for (let i = 0; i < 4 && await p.$('.overlay'); i++) { await p.keyboard.press('Escape'); await sleep(p, 900); }
  // 11 cases puis 12
  const r = await p.evaluate(async () => {
    const st = await import('/js/store.js'), s = await import('/js/stats.js'), u = await import('/js/util.js'), k = u.todayKey();
    const ids = st.S.domains.list.map(d => d.id);
    ids.slice(0, 11).forEach(id => st.setDone(k, id, true)); st.save();
    const a = s.isPerfect(k); st.setDone(k, ids[11], true); st.save();
    st.S.habits.push({ id: 'h1', name: 'Sucre', emoji: '🍬', start: u.key(u.addDays(u.today(), -12)), resets: [], u: 1 }, { id: 'h2', name: 'Réseaux le soir', emoji: '📱', start: u.key(u.addDays(u.today(), -3)), resets: [], u: 1 }); st.save();
    const idm = await import('/js/game/identity.js');
    return JSON.stringify({ n: ids.length, at11: a, at12: s.isPerfect(k), need: s.perfectNeed(ids.length), names: st.S.domains.list.map(d => idm.identNames(d).length).join('') });
  });
  console.log(r);
  await sleep(p, 800);
  for (let i = 0; i < 4 && await p.$('.overlay'); i++) { await p.keyboard.press('Escape'); await sleep(p, 900); }
  await p.screenshot({ path: `${out}/t-today.png` });
  console.log('hero', await p.evaluate(() => document.querySelector('.h-msg').textContent + ' | ' + [...document.querySelectorAll('.hb-chip')].map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' / ')));
  await p.click('.hb-chip'); await sleep(p, 600);
  console.log('tab', await p.evaluate(() => document.querySelector('.growth-segs .seg.on').textContent));
  await act(p, 'tab', { tab: 'settings' }); await sleep(p, 500);
  console.log('setting', await p.evaluate(() => [...document.querySelectorAll('label.f')].map(x => x.textContent.trim().replace(/\s+/g, ' ')).find(t => t.startsWith('Journée parfaite'))));
  await p.evaluate(() => { const i = document.querySelector('[data-input=perfectAt]'); i.value = 13; i.dispatchEvent(new Event('input', { bubbles: true })); });
  console.log('after 13', await p.evaluate(async () => { const st = await import('/js/store.js'), s = await import('/js/stats.js'), u = await import('/js/util.js'); return JSON.stringify({ p: st.S.settings.perfect, need: s.perfectNeed(15), perfect: s.isPerfect(u.todayKey()) }); }));
  await act(p, 'tab', { tab: 'growth' }); await act(p, 'growthTab', { t: 'ident' }); await sleep(p, 500);
  await p.click('.idc'); await sleep(p, 400); await p.screenshot({ path: `${out}/t-ident.png` });
  console.log('cards', await p.evaluate(async () => { const r = await import('/js/game/roster.js'); return [1, 6, 25, 150, 384, 493].map(n => r.FORMS['pk' + n].card).join(' '); }));
  const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 390) errors.push('overflow ' + w);
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
