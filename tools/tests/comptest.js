const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ ignoreHTTPSErrors: true })).newPage(), errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://localhost:8765/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('tdb2-demo', '1'); }); await p.reload(); await p.waitForTimeout(2500);
  console.log(await p.evaluate(async () => {
    const st = await import('/js/store.js'), r = await import('/js/game/rules.js'), u = await import('/js/util.js');
    const g0 = r.G(), lines = Object.keys(g0.owned).filter(l => l.startsWith('pk')).slice(0, 2), [A, B] = lines;
    const k = n => u.key(u.addDays(u.today(), -n));
    st.S.game.comp = [{ id: 'a1', line: A, from: k(40), t: 1 }, { id: 'b1', line: B, from: k(10), t: 2 }]; st.save();
    const g1 = r.G(), sA = g1.compStates[A];
    st.S.game.comp.push({ id: 'a2', line: A, from: u.todayKey(), t: 3 }); st.save();
    const g2 = r.G();
    return JSON.stringify({ A, beforeSwitchBack: { stage: sA.stage, form: sA.form.name }, afterSwitchBack: { stage: g2.companion.stage, form: g2.companion.form.name, into: g2.companion.into } });
  }));
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
