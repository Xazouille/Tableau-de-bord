// Test de fumée : appli vide puis compte démo, tous les écrans, fiches et nouveautés.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2], NB = process.argv[3], desk = process.argv[4] === 'desktop';
fs.mkdirSync(out, { recursive: true });
const tag = desk ? 'd' : 'm';
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const sleep = (p, ms) => p.waitForTimeout(ms);
const shot = (p, n, full) => p.screenshot({ path: `${out}/${tag}-${n}.png`, fullPage: !!full });
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: desk ? { width: 1280, height: 860 } : { width: 390, height: 844 }, deviceScaleFactor: desk ? 1 : 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  await ctx.route('https://arosare.github.io/naruto-blazing-revival/**', r => { const f = path.join(NB, r.request().url().split('/naruto-blazing-revival/')[1]); fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort(); });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  await p.goto('http://localhost:8765/');
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await sleep(p, 1200);
  await shot(p, 's01-today-fresh');
  console.log('fresh G', await p.evaluate(async () => { const g = (await import('/js/game/rules.js')).G(); return JSON.stringify({ boss: g.boss.current && { name: g.boss.current.name, hp: g.boss.current.hp, weak: g.boss.current.weak }, hist: g.boss.history.length, mastery: Object.keys(g.mastery).length, albums: g.albums.length, boxes: g.boxes }); }));
  // Démo
  await p.evaluate(() => { localStorage.setItem('tdb2-demo', '1'); });
  await p.reload(); await sleep(p, 2500);
  for (let i = 0; i < 4 && await p.$('.overlay'); i++) { await shot(p, `s02-overlay${i}`); await p.keyboard.press('Escape'); await sleep(p, 900); }
  await sleep(p, 500);
  console.log('demo G', await p.evaluate(async () => { const g = (await import('/js/game/rules.js')).G(); return JSON.stringify({ lvl: g.lvl.level, boss: g.boss.current && { name: g.boss.current.name, hp: g.boss.current.hp, dmg: g.boss.current.dmg, day: g.boss.current.dayNo }, won: g.boss.history.filter(b => b.won).length, lost: g.boss.history.filter(b => !b.won).length, mastery: Object.fromEntries(Object.entries(g.mastery).map(([k, m]) => [k, m.level])), albumsDone: g.albums.filter(a => a.done).length, dups: Object.keys(g.dups).length, shinies: g.shinies, awaken: g.awaken, frags: g.frags, boxes: g.boxes, recaps: g.recaps.map(r => r.grade.g).join('') }); }));
  await act(p, 'tab', { tab: 'today' }); await sleep(p, 900);
  await shot(p, 's03-today-demo');
  await shot(p, 's03-today-demo-full', true);
  // Toucher le compagnon
  await p.click('.lv-card .lv-avatar'); await sleep(p, 400);
  await shot(p, 's04-pet');
  // Cocher une case : dégâts au boss
  const tile = await p.$('.tile:not(.on)');
  if (tile) { await tile.click(); await sleep(p, 300); if (await p.$('.sheet-root.open')) { const o = await p.$('.sheet .opt'); if (o) await o.click(); else await p.keyboard.press('Escape'); } await sleep(p, 250); await shot(p, 's05-check'); }
  await sleep(p, 1500);
  for (let i = 0; i < 3 && await p.$('.overlay'); i++) { await shot(p, `s05-overlay${i}`); await p.keyboard.press('Escape'); await sleep(p, 900); }
  // Humeur
  await p.click('.mood[data-v="4"]'); await sleep(p, 400);
  // Jeu
  await act(p, 'tab', { tab: 'game' }); await act(p, 'gameTab', { t: 'profil' }); await sleep(p, 900);
  await shot(p, 's06-game', true);
  await act(p, 'bossOpen'); await sleep(p, 600); await shot(p, 's07-boss-sheet'); await act(p, 'closeSheet'); await sleep(p, 400);
  await act(p, 'lookOpen'); await sleep(p, 600); await shot(p, 's08-look-titles');
  await act(p, 'lookTab', { t: 'frame' }); await sleep(p, 400); await shot(p, 's08-look-frames');
  await act(p, 'lookTab', { t: 'theme' }); await sleep(p, 400); await shot(p, 's08-look-themes');
  const th = await p.$('.lk-theme:not(.locked):not(.on)'); if (th) { await th.click(); await sleep(p, 500); }
  const fr = await p.evaluate(() => { const b = [...document.querySelectorAll('.lk-frame:not(.locked)')].pop(); if (b) b.click(); return !!b; });
  await sleep(p, 400); await act(p, 'closeSheet'); await sleep(p, 400);
  await shot(p, 's09-game-themed');
  await act(p, 'shopOpen'); await sleep(p, 600); await shot(p, 's10-shop'); await act(p, 'closeSheet'); await sleep(p, 400);
  // Cartes
  await act(p, 'gameTab', { t: 'collection' }); await sleep(p, 1200);
  await shot(p, 's11-cards');
  await p.fill('.coll-search', 'goku'); await sleep(p, 600); await shot(p, 's12-search');
  await p.fill('.coll-search', ''); await sleep(p, 300);
  await act(p, 'collFilter', { f: 'dups' }); await act(p, 'collSort', { s: 'dups' }); await sleep(p, 800); await shot(p, 's13-dups');
  const first = await p.$('.coll-item'); if (first) { await first.click(); await sleep(p, 600); await shot(p, 's14-card-sheet'); }
  const fuseBtn = await p.$('[data-act="fuse"]');
  if (fuseBtn) { await fuseBtn.click(); await sleep(p, 2300); await shot(p, 's15-fusion'); await p.keyboard.press('Escape'); await sleep(p, 700); }
  else await act(p, 'closeSheet');
  await act(p, 'collFilter', { f: 'shiny' }); await sleep(p, 800); await shot(p, 's16-shiny');
  await act(p, 'collMode', { m: 'albums' }); await sleep(p, 800); await shot(p, 's17-albums');
  await act(p, 'gameTab', { t: 'mastery' }); await sleep(p, 600); await shot(p, 's18-mastery', true);
  await act(p, 'gameTab', { t: 'badges' }); await sleep(p, 600);
  await act(p, 'tab', { tab: 'stats' }); await sleep(p, 900); await shot(p, 's19-stats', true);
  await act(p, 'recapOpen'); await sleep(p, 1600); await shot(p, 's20-recap'); await p.keyboard.press('Escape'); await sleep(p, 600);
  for (const t of ['goals', 'media', 'vision', 'settings']) { await act(p, 'tab', { tab: t }); await sleep(p, 400); }
  const w = await p.evaluate(() => document.documentElement.scrollWidth);
  if (w > (desk ? 1280 : 390)) errors.push('horizontal overflow ' + w);
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
