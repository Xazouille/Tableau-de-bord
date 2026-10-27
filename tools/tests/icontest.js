const { chromium } = require('playwright');
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  const p = await ctx.newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8765/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('tdb2-demo', '1'); }); await p.reload(); await p.waitForTimeout(2500);
  for (let i = 0; i < 5 && await p.$('.overlay'); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(900); }
  const links = () => p.evaluate(() => ['icon', 'apple-touch-icon', 'manifest'].map(r => { const l = document.querySelector(`link[rel="${r}"]`); return r + '=' + (l.href.startsWith('data:') ? 'data:svg(' + l.href.length + ')' : l.getAttribute('href')); }).join(' | '));
  console.log('neon  ', await links());
  await act(p, 'lookSet', { kind: 'theme', id: 'gameboy' }); await p.waitForTimeout(500);
  console.log('gameb ', await links());
  const ok = await p.evaluate(async () => { const r = await Promise.all(['icons/t/gameboy-180.png', 'm/gameboy.webmanifest', 'icons/t/gameboy-192.png'].map(u => fetch(u).then(x => x.status))); const m = await (await fetch('m/gameboy.webmanifest')).json(); return r.join(',') + ' ' + new URL(m.icons[0].src, location.origin + '/m/gameboy.webmanifest').pathname + ' id=' + new URL(m.id, location.origin + '/m/x').pathname; });
  console.log('fetch ', ok);
  await act(p, 'tab', { tab: 'settings' }); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelector('.ui-icon').scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  await p.screenshot({ path: process.argv[2] + '/i-settings.png' });
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
