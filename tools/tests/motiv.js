// Plans si… alors…, défis à choisir, identités, mur des victoires, série cassée, pourquoi, bilan du mois, sommeil régulier.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const out = process.argv[2];
fs.mkdirSync(out, { recursive: true });
const OLD = fs.readFileSync(path.join(__dirname, 'rules_old.js'), 'utf8');
const act = (p, a, data = {}) => p.evaluate(([a, data]) => { const b = document.createElement('button'); b.dataset.act = a; Object.assign(b.dataset, data); document.body.appendChild(b); b.click(); b.remove(); }, [a, data]);
const sleep = (p, ms) => p.waitForTimeout(ms);
const shot = (p, n, full) => p.screenshot({ path: `${out}/v-${n}.png`, fullPage: !!full });
const closeOv = async p => { for (let i = 0; i < 6 && await p.$('.overlay'); i++) { const c = await p.$('.overlay [data-ov=close]'); if (c) await c.click({ force: true }); else await p.keyboard.press('Escape'); await sleep(p, 900); } };
const ev = (p, fn) => p.evaluate(fn);
(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark', ignoreHTTPSErrors: true });
  await ctx.route('**/js/game/rules_old.js', r => r.fulfill({ body: OLD, contentType: 'application/javascript' }));
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + e.stack));
  p.on('console', m => { if (m.type() === 'error' && !/vibrate|Failed to load resource|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  p.on('dialog', d => d.accept());
  // Lundi 26 octobre 2026, 9 h
  await p.clock.setFixedTime(new Date('2026-10-26T09:00:00'));
  await p.goto('http://localhost:8765/');
  // 40 jours d'historique : culture tous les jours, une série de 6 jours qui s'arrête avant-hier, hier raté
  await p.evaluate(() => {
    localStorage.clear();
    const K = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ids = ['ecole', 'echecs', 'sport', 'argent', 'culture', 'alim', 'medit', 'sommeil', 'ecran', 'scroll'];
    const days = {};
    for (let i = 2; i <= 40; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const c = { culture: 1 }, x = {};
      if (i <= 7) for (const id of ids) c[id] = 1;          // 6 jours réussis (2 à 7 jours avant)
      else if (i % 3 === 0) { c.ecole = 1; c.sport = 1; x.ecole = i % 2 ? 2 : 0; x.sport = 1; }
      if (c.sommeil) x.sleepreg = 1;
      days[K(d)] = { c, x, note: i === 3 ? 'Super séance de sport' : '', u: 1 };
    }
    // Hier : une seule case (journée ratée)
    const y = new Date(); y.setDate(y.getDate() - 1); days[K(y)] = { c: { culture: 1 }, note: '', u: 1 };
    const doms = ids.map(id => ({ id, name: id === 'culture' ? 'Culture & Lecture' : id, emoji: '⭐', color: '#4f8cff', hint: '', archived: false, xp: 10, m: ['ecole', 'sport'].includes(id) ? { kind: 'levels', q: '?', opts: [['15 min', 1, 15], ['30 min', 1.5, 30], ['1 h', 2, 60], ['2 h et +', 3, 120]] } : id === 'sommeil' ? { kind: 'levels', q: '?', opts: [['Moins de 6 h', 0.5], ['6 h – 7 h', 1], ['7 h – 8 h', 1.5], ['8 h et +', 2]] } : { kind: 'none' } }));
    const old = new Date(); old.setDate(old.getDate() - 60);
    localStorage.setItem('tdb2-data', JSON.stringify({ v: 2, meta: { modified: 1 }, profile: { name: 'Aaron', start: K(old), u: 1 }, settings: { theme: 'auto', threshold: 0.5, u: 1 }, domains: { list: doms, u: 1 }, days, goals: [], media: [], vision: { blocks: [{ id: 'devenir', title: 'Qui je veux devenir', text: 'Je veux devenir quelqu’un de régulier et fier de lui.' }], u: 1 }, game: { pulls: [], trades: [], visits: {}, badges: {}, jokerDays: { [K(old)]: 1 }, comp: [], rewards: [], since: K(old), u: 1 }, dead: {} }));
  });
  await p.reload(); await sleep(p, 1500);
  await closeOv(p);
  // Les défis par défaut sont exactement ceux d'avant (aucune box ne bouge)
  console.log('compat', await ev(p, async () => {
    const n = await import('/js/game/rules.js'), o = await import('/js/game/rules_old.js');
    const a = n.G(), b = o.G();
    return JSON.stringify({ same: JSON.stringify(a.challenges) === JSON.stringify(b.challenges), chalXP: [a.breakdown.challenges, b.breakdown.challenges], boxes: [a.boxesEarned, b.boxesEarned], opts: a.chalOptions.map(o => o.map(c => c.text)) });
  }));
  console.log('identity', await ev(p, async () => { const g = (await import('/js/game/rules.js')).G(); return JSON.stringify(Object.values(g.identity).filter(x => x.stage).map(x => [x.id, x.n, x.stage, x.name, x.next])); }));
  await shot(p, '01-today', true);
  await p.evaluate(() => document.querySelector('.kind-card').scrollIntoView({ block: 'center' })); await sleep(p, 300);
  await shot(p, '01b-kind');
  console.log('today cards', await ev(p, () => JSON.stringify({ kind: !!document.querySelector('.kind-card'), joker: !!document.querySelector('.joker-offer'), chal: !!document.querySelector('.chal-prompt'), chip: (document.querySelector('[data-act=plansOpen]') || {}).textContent, streak: document.querySelector('.h-chips .chip-glass').textContent })));
  // Série cassée → « C'est reparti »
  await p.click('.kind-card [data-act=kindOk]'); await sleep(p, 400);
  console.log('kind after ok', !!(await p.$('.kind-card')));
  // Défis : choisir le 3e défi du niveau moyen
  await p.click('.chal-prompt'); await sleep(p, 600);
  await shot(p, '02-chal-sheet');
  await p.click('.chs-opt[data-lv="1"][data-i="2"]'); await sleep(p, 400);
  console.log('chal pick', await ev(p, async () => { const st = await import('/js/store.js'), g = (await import('/js/game/rules.js')).G(); return JSON.stringify({ chal: st.S.game.chal, cur: g.challenges.map(c => c.text), want: g.chalOptions[1][2].text }); }));
  await p.click('[data-act=chalConfirm]'); await sleep(p, 500);
  console.log('prompt gone', !(await p.$('.chal-prompt')));
  // Plans si… alors…
  await p.click('[data-act=plansOpen]'); await sleep(p, 600);
  await shot(p, '03-plans-sheet');
  await p.fill('input[name=w_ecole]', 'après le dîner'); await p.fill('input[name=t_ecole]', '15 min de DCG');
  await p.fill('input[name=w_sport]', 'en rentrant'); await p.click('.plans-sheet .btn.primary'); await sleep(p, 700);
  console.log('plans', await ev(p, () => JSON.stringify({ hint: document.querySelector('.tile[data-id=ecole] .t-hint').textContent, card: [...document.querySelectorAll('.plans-card .plan-row')].map(x => x.textContent) })));
  await shot(p, '04-today-plans', true);
  await p.evaluate(() => document.querySelector('.plans-card').scrollIntoView({ block: 'center' })); await sleep(p, 300);
  await shot(p, '04b-plans');
  // Rappeler le pourquoi : 10e jour d'école → message
  console.log('sport days', await ev(p, async () => { const st = await import('/js/store.js'); const ks = Object.keys(st.S.days).sort(); let n = ks.filter(k => st.isDone(k, 'sport')).length; for (const k of ks) if (n < 19 && !st.isDone(k, 'sport') && k < '2026-10-25') { st.setDone(k, 'sport', true); n++; } st.save(); return n; }));
  await p.click('.tile[data-id=sport]'); await sleep(p, 500);
  await shot(p, '05-sport-sheet');
  await p.click('.sheet [data-act=measureSet][data-v="2"]'); await sleep(p, 1100);
  console.log('why toast', await ev(p, () => document.getElementById('toast').textContent));
  // Sommeil : couché à mon heure
  await p.click('.tile[data-id=sommeil]'); await sleep(p, 500);
  await p.fill('.sheet input[type=time]', '23:00'); await sleep(p, 200);
  await p.click('.sheet [data-act=sleepReg][data-v="1"]'); await sleep(p, 300);
  await shot(p, '06-sleep-sheet');
  await p.click('.sheet [data-act=measureSet][data-v="2"]'); await sleep(p, 900);
  console.log('sleep', await ev(p, async () => { const st = await import('/js/store.js'), u = await import('/js/util.js'), g = (await import('/js/game/rules.js')).G(); return JSON.stringify({ reg: st.valOf(u.todayKey(), 'sleepreg'), bt: st.S.settings.bedtime, xp: g.caseXPs[u.todayKey()].sommeil, label: document.querySelector('.tile[data-id=sommeil] .t-hint').textContent }); }));
  // Phrase du jour → victoire
  await p.fill('#note', 'J’ai fini mon chapitre de fiscalité'); await sleep(p, 300);
  await p.click('[data-act=noteWin]'); await sleep(p, 400);
  console.log('note win', await ev(p, () => (document.querySelector('.note-head') || {}).textContent));
  await closeOv(p);
  // Progrès : identité, victoires
  await act(p, 'tab', { tab: 'growth' }); await sleep(p, 700);
  await shot(p, '07-identity', true);
  await p.click('.idc[data-id=culture]'); await sleep(p, 400);
  await shot(p, '08-identity-open');
  await act(p, 'growthTab', { t: 'wins' }); await sleep(p, 500);
  await p.fill('input[name=text]', '10 min d’anglais à l’oral'); await p.keyboard.press('Enter'); await sleep(p, 600);
  await shot(p, '09-wins', true);
  console.log('wins', await ev(p, async () => { const w = await import('/js/game/wins.js'), g = (await import('/js/game/rules.js')).G(); const v = w.victories(g); return JSON.stringify({ n: v.length, kinds: [...new Set(v.map(x => x.kind))], top: v.slice(0, 6).map(x => x.k + ' ' + x.txt) }); }));
  await act(p, 'winKind', { k: 'me' }); await sleep(p, 300);
  console.log('mine', await ev(p, () => [...document.querySelectorAll('.wn-txt')].map(x => x.textContent).join(' | ')));
  await p.click('.wn [data-act=winDel]'); await sleep(p, 300);
  console.log('after del', await ev(p, async () => (await import('/js/store.js')).S.wins.length));
  // Bilan du mois (septembre) : question « pour toi ou pour le jeu ? »
  await act(p, 'growthTab', { t: 'reviews' }); await sleep(p, 300);
  await act(p, 'monthOpen'); await sleep(p, 1200);
  await p.fill('#mr-good', 'La lecture tous les jours'); await p.fill('#mr-bad', 'Le sport irrégulier'); await p.fill('#mr-focus', 'Sport 3 fois par semaine');
  await p.click('.mr-why label:nth-child(2)'); await sleep(p, 200);
  await shot(p, '10-month', true);
  await p.click('[data-ov=saveReview]'); await sleep(p, 1200);
  await closeOv(p);
  console.log('review', await ev(p, async () => JSON.stringify((await import('/js/store.js')).S.reviews)));
  await shot(p, '11-reviews');
  // Bilan de la semaine : les victoires
  await act(p, 'tab', { tab: 'stats' }); await sleep(p, 500);
  await act(p, 'recapOpen'); await sleep(p, 1500);
  await shot(p, '12-recap');
  console.log('recap lines', await ev(p, () => [...document.querySelectorAll('.rc-lines li')].map(x => x.textContent).join(' | ')));
  await closeOv(p);
  // Titres d'identité, réglage du plan dans la fiche d'une case, rappel du coucher
  console.log('titles', await ev(p, async () => (await import('/js/game/cosmetics.js')).titleList().filter(t => t.id.startsWith('id-')).map(t => t.name).join(', ')));
  await act(p, 'domEdit', { id: 'ecole' }); await sleep(p, 400);
  console.log('dom plan', await ev(p, () => document.querySelector('.sheet input[name=pwhen]').value));
  await act(p, 'closeSheet'); await sleep(p, 300);
  await ev(p, async () => { const st = await import('/js/store.js'); st.S.settings.bedtime = '09:30'; st.save(); });
  console.log('bed nudge', await ev(p, async () => JSON.stringify((await import('/js/nudges.js')).nudges().filter(n => n.key === 'bed'))));
  console.log('badges', await ev(p, async () => Object.keys((await import('/js/store.js')).S.game.badges).join(',')));
  await act(p, 'tab', { tab: 'vision' }); await sleep(p, 500);
  await shot(p, '13-vision');
  await act(p, 'tab', { tab: 'game' }); await sleep(p, 600);
  await shot(p, '14-game', true);
  for (const t of ['today', 'stats', 'game', 'growth', 'vision', 'settings']) { await act(p, 'tab', { tab: t }); await sleep(p, 300); const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 390) errors.push('overflow ' + t + ' ' + w); }
  for (const t of ['ident', 'wins', 'skills', 'habits', 'reviews']) { await act(p, 'tab', { tab: 'growth' }); await act(p, 'growthTab', { t }); await sleep(p, 300); const w = await p.evaluate(() => document.documentElement.scrollWidth); if (w > 390) errors.push('overflow growth ' + t + ' ' + w); }
  // Mercredi : le choix des défis est fermé
  await p.clock.setFixedTime(new Date('2026-10-28T10:00:00'));
  await act(p, 'tab', { tab: 'today' }); await sleep(p, 500);
  console.log('wednesday', await ev(p, async () => { const r = await import('/js/game/rules.js'); return JSON.stringify({ open: r.chalOpen(), prompt: !!document.querySelector('.chal-prompt'), plans: !!document.querySelector('.plans-card') }); }));
  console.log(errors.length ? errors.join('\n') : 'OK no errors');
  await b.close();
})();
