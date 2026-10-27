// Fermer en pleine invocation : les cartes sont révélées au lieu d'être perdues de vue ; le retour ne quitte jamais l'appli.
const { chromium } = require('playwright');
const out = process.argv[2];
const sleep = (p, ms) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  await p.goto('http://localhost:8765/');
  await p.evaluate(() => localStorage.clear());
  await p.reload(); await sleep(p, 900);
  const state = () => p.evaluate(() => ({ url: location.href, overlay: !!document.querySelector('.overlay'), view: (document.querySelector('.overlay > :not(.ov-sky)') || {}).className, flipped: document.querySelectorAll('.fcard.flipped').length, done: !!document.querySelector('.sp-foot.done') }));
  // 1. ✕ après une touche
  await p.click('.box-banner'); await p.waitForSelector('.sm-chest'); await sleep(p, 700);
  await p.click('.sm-chest', { force: true }); await sleep(p, 300);
  await p.click('.summon [data-ov=close]'); await sleep(p, 900);
  console.log('after ✕ mid-summon', JSON.stringify(await state()));
  await p.screenshot({ path: `${out}/mid-1-revealed.png` });
  // Les minuteries de l'ancienne animation ne doivent rien réafficher
  await sleep(p, 1500);
  console.log('1.5 s later', JSON.stringify(await state()));
  await p.click('.sp-foot [data-ov=close]'); await sleep(p, 700);
  console.log('after second close', JSON.stringify(await state()));
  // 2. Retour arrière pendant l'explosion, avec de nouvelles box
  await p.evaluate(async () => { const st = await import('/js/store.js'), u = await import('/js/util.js'); const ids = st.activeDomains().map(d => d.id); const k = u.key(u.addDays(u.today(), -1)); ids.slice(0, 6).forEach(id => st.setDone(k, id, true)); st.save(); });
  await sleep(p, 800);
  await p.click('.box-banner'); await p.waitForSelector('.sm-chest'); await sleep(p, 700);
  for (let i = 0; i < 3; i++) { await p.click('.sm-chest', { force: true }); await sleep(p, 150); }
  await p.goBack(); await sleep(p, 900);
  console.log('after back during boom', JSON.stringify(await state()));
  await p.goBack(); await sleep(p, 900);
  console.log('after 2nd back', JSON.stringify(await state()));
  await p.goBack(); await sleep(p, 900);
  console.log('after 3rd back (nothing open: leaves the page, that is normal)', JSON.stringify(await p.evaluate(() => location.href)));
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
