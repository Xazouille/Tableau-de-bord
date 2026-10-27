const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const p = await (await b.newContext({ ignoreHTTPSErrors: true })).newPage();
  await p.goto('http://localhost:8765/'); await p.waitForTimeout(800);
  console.log(await p.evaluate(async () => {
    const st = await import('/js/store.js');
    const a = st.defaults(), c = st.defaults();
    a.game.chal = { '2026-10-26': { pick: [1, 0, 0], u: 5 } }; c.game.chal = { '2026-10-26': { pick: [2, 2, 2], u: 9 }, '2026-10-19': { pick: [0, 1, 0], u: 1 } };
    a.wins = [{ id: 'w1', k: '2026-10-26', text: 'A', u: 1 }]; c.wins = [{ id: 'w2', k: '2026-10-25', text: 'B', u: 1 }];
    c.dead = { w1: 2 };
    a.reviews = { '2026-09': { good: 'x', why: 'moi', u: 1 } }; c.reviews = { '2026-09': { good: 'y', why: 'jeu', u: 3 } };
    const m = st.merge(a, c);
    return JSON.stringify({ chal: m.game.chal, wins: m.wins.map(w => w.id), rev: m.reviews });
  }));
  await b.close();
})();
