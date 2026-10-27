// Parcours complet : box de bienvenue, invocation en 3 touches, cartes, autel, boutique, taux, retour arrière.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2], NB = process.argv[3];
const W = process.argv[4] === 'desktop' ? { width: 1280, height: 820 } : { width: 390, height: 844 };
const tag = process.argv[4] === 'desktop' ? 'd' : 'm';
fs.mkdirSync(out, { recursive: true });
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const G = p => p.evaluate(async () => { const r = await import('/js/game/rules.js'); const g = r.G(); return { boxes: g.boxes, earned: g.boxesEarned, level: g.lvl.level, pulls: (await import('/js/store.js')).S.game.pulls.length, frags: g.frags }; });
const shot = (p, n) => p.screenshot({ path: `${out}/${tag}-${n}.png` });
const sleep = (p, ms) => p.waitForTimeout(ms);

async function summonFlow(p, name) {
  await p.waitForSelector('.summon .sm-chest');
  await sleep(p, 750);
  await shot(p, `${name}-1-chest`);
  for (let i = 1; i <= 3; i++) {
    await p.click('.sm-chest', { force: true });
    await sleep(p, i < 3 ? 650 : 250);
    if (i === 1 || i === 3) await shot(p, `${name}-2-tap${i}`);
  }
  await sleep(p, 450);
  await shot(p, `${name}-3-boom`);
  await p.waitForSelector('.spread .fcard', { timeout: 5000 });
  await sleep(p, 1100);
  await shot(p, `${name}-4-spread`);
  // Première carte à la main, puis « Tout retourner »
  await p.click('.fcard[data-i="0"]', { force: true });
  let showcased = 0;
  for (let k = 0; k < 60; k++) {
    await sleep(p, 300);
    const sc = await p.$('.showcase:not([hidden]) .sc');
    if (sc) {
      await sleep(p, 900);
      if (!showcased++) await shot(p, `${name}-6-showcase`);
      await sc.click({ force: true });
      continue;
    }
    if (k === 3) await shot(p, `${name}-5-flipped`);
    const all = await p.$('[data-ov=flipAll]');
    if (all) { await all.click({ force: true }); continue; }
    if (await p.$('.sp-foot.done')) break;
  }
  await sleep(p, 700);
  await shot(p, `${name}-7-summary`);
}

(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: W, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true, hasTouch: tag === 'm' });
  await ctx.route('https://arosare.github.io/naruto-blazing-revival/**', r => { const f = path.join(NB, r.request().url().split('/naruto-blazing-revival/')[1]); fs.existsSync(f) ? r.fulfill({ path: f }) : r.abort(); });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/');
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await sleep(p, 900);
  console.log('start', JSON.stringify(await G(p)));
  await shot(p, '01-today');

  // A. Box de bienvenue (grande box, 5 cartes)
  await p.click('.box-banner');
  await summonFlow(p, 'A-grande');
  console.log('after A', JSON.stringify(await G(p)));
  const comp = await p.$('[data-ov=companion]');
  if (comp) await comp.click(); else await p.click('.sp-foot [data-ov=close]');
  await sleep(p, 600);
  const histA = await p.evaluate(() => history.length);

  // B. Des journées remplies : petite box (5 cases), box classique (journée parfaite), et sans doute un niveau
  await p.evaluate(async () => {
    const st = await import('/js/store.js'), u = await import('/js/util.js');
    const ids = st.activeDomains().map(d => d.id);
    const k1 = u.key(u.addDays(u.today(), -1)), k2 = u.key(u.addDays(u.today(), -2));
    ids.forEach(id => st.setDone(k1, id, true));
    ids.slice(0, 5).forEach(id => st.setDone(k2, id, true));
    st.save();
  });
  await sleep(p, 1500);
  console.log('after B data', JSON.stringify(await G(p)));
  await shot(p, '02-after-days');
  if (await p.$('.ov-level')) {
    await sleep(p, 1200);
    await shot(p, '03-levelup');
    await p.click('.ov-level [data-ov=altar]');
  } else {
    await p.click('.box-banner');
  }
  await sleep(p, 900);
  if (await p.$('.altar')) await shot(p, '04-altar');
  const pick = async k => { const el = await p.$(`.alt-item.t-${k}:not(.empty)`); if (el) { await el.click(); return true; } return false; };
  if (await pick('p')) await summonFlow(p, 'B-petite');
  console.log('after petite', JSON.stringify(await G(p)));
  const other = await p.$('.sp-foot [data-ov=altar]');
  if (other) { await other.click(); await sleep(p, 700); if (await p.$('.altar')) { await shot(p, '05-altar2'); await pick('c'); } await summonFlow(p, 'C-next'); }
  await p.click('.sp-foot [data-ov=close]');
  await sleep(p, 900);
  await shot(p, '06-banners');
  const histB = await p.evaluate(() => history.length);
  console.log('history', histA, histB, 'after', JSON.stringify(await G(p)));

  // C. Écran Jeu, taux, boutique, badges
  await act(p, 'tab', { tab: 'game' }); await sleep(p, 900);
  await shot(p, '07-game');
  await p.screenshot({ path: `${out}/${tag}-07-game-full.png`, fullPage: true });
  await act(p, 'oddsOpen'); await sleep(p, 600);
  await shot(p, '08-odds');
  // Bouton retour du téléphone : ferme la fenêtre sans quitter l'appli
  await p.goBack(); await sleep(p, 600);
  console.log('after back: sheet open =', await p.evaluate(() => !document.getElementById('sheet').hidden), 'url', p.url());
  await act(p, 'shopOpen'); await sleep(p, 600);
  await shot(p, '09-shop');
  await act(p, 'closeSheet'); await sleep(p, 400);
  await act(p, 'gameTab', { t: 'badges' }); await sleep(p, 600);
  await shot(p, '10-badges');

  // D. Retour arrière pendant une invocation
  await p.evaluate(async () => { const st = await import('/js/store.js'), u = await import('/js/util.js'); const ids = st.activeDomains().map(d => d.id); const k3 = u.key(u.addDays(u.today(), -3)); ids.slice(0, 6).forEach(id => st.setDone(k3, id, true)); st.save(); });
  await sleep(p, 800);
  const ovl = await p.$('.overlay'); if (ovl) { await p.keyboard.press('Escape'); await sleep(p, 500); }
  await act(p, 'openBox'); await sleep(p, 700);
  console.log('overlay open before back:', !!(await p.$('.overlay')));
  await p.goBack(); await sleep(p, 700);
  console.log('overlay open after back:', !!(await p.$('.overlay')), 'url', p.url());
  await act(p, 'tab', { tab: 'today' }); await sleep(p, 700);
  await shot(p, '11-today-end');
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
