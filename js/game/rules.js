// Règles du jeu : XP, niveaux, box, collection, compagnon, défis de la semaine, jokers et badges.
// Presque tout est recalculé à partir de l'historique : décocher une case retire l'XP correspondante,
// et deux appareils synchronisés arrivent toujours au même résultat.
import { S, isDone, valOf, activeDomains } from '../store.js';
import { key, parseKey, today, todayKey, addDays, weekStart, dayDiff, seeded } from '../util.js';
import { caseXP, SLEEP_OK_FROM } from '../measures.js';
import { isPerfect, isGoodDay, bestOf, globalBest, periodScore } from '../stats.js';
import { LINES, FORMS } from './roster.js';

export const PERFECT_BONUS = 50, NOTE_XP = 5, VISIT_XP = 10, MEDIA_XP = 50, STEP_XP = 15, CHALLENGE_XP = 100;
export const FRAG_PER_BOX = 50, FRAG = { 1: 3, 2: 6, 3: 12, 4: 25, 5: 50 };
export const JOKER_MAX = 3;

/* ---------- Niveaux ---------- */
export const xpNeed = L => Math.round(300 + 40 * Math.pow(L - 1, 1.2));
export function levelOf(xp) {
  let L = 1, rest = Math.max(0, xp);
  while (rest >= xpNeed(L)) { rest -= xpNeed(L); L++; }
  return { level: L, into: rest, need: xpNeed(L) };
}
const TITLES = [[1, 'Débutant'], [3, 'Apprenti'], [5, 'Motivé'], [8, 'Régulier'], [12, 'Discipliné'], [16, 'Guerrier'], [20, 'Machine'], [25, 'Élite'], [30, 'Maître'], [40, 'Légende'], [50, 'Mythique'], [75, 'Divin']];
export const titleOf = L => TITLES.filter(t => L >= t[0]).pop()[1];

/* ---------- Objectifs ---------- */
const HORIZON_DAYS = { semaine: 7, mois: 30, trimestre: 90, annee: 365, libre: 30 };
export function goalProgress(g) {
  if (g.type === 'count') return g.target > 0 ? Math.min(1, (g.value || 0) / g.target) : 0;
  if (g.type === 'steps') return g.steps && g.steps.length ? g.steps.filter(s => s.done).length / g.steps.length : 0;
  return g.done ? 1 : 0;
}
// Plus on se donne de temps, plus l'objectif rapporte : ~110 XP pour une semaine, ~3 000 pour un an
export function goalXP(g) {
  const days = g.due && g.created ? Math.max(1, dayDiff(g.created, g.due)) : HORIZON_DAYS[g.horizon || 'libre'] || 30;
  return Math.round(Math.min(3000, 60 + days * 8));
}

/* ---------- Compagnon ---------- */
export const compThreshold = lineId => 700 + 250 * ((LINES[lineId] && LINES[lineId].rarity) || 1);
// Jour « sans » : pas de révision, moins de 7 h de sommeil et rien en alimentation (les trois à la fois)
export function isBadDay(k) {
  const sv = valOf(k, 'sommeil');
  const sleepOK = isDone(k, 'sommeil') && !(typeof sv === 'number' && sv < SLEEP_OK_FROM);
  return !isDone(k, 'ecole') && !sleepOK && !isDone(k, 'alim');
}

/* ---------- Défis de la semaine ---------- */
const LONG_EXCLUDED = new Set(['sommeil', 'ecran']);
const CHALLENGES = {
  perfect: () => ({ emoji: '🏆', text: '2 journées parfaites', goal: 2, prog: w => w.days.filter(isPerfect).length }),
  pct: () => ({ emoji: '📈', text: 'Semaine à 70 % ou plus', goal: 70, unit: ' %', prog: w => w.pct }),
  notes: () => ({ emoji: '✍️', text: 'Ta phrase du jour 5 fois', goal: 5, prog: w => w.days.filter(k => S.days[k] && S.days[k].note && S.days[k].note.trim()).length }),
  xp: () => ({ emoji: '⚡', text: 'Gagner 900 XP', goal: 900, unit: ' XP', prog: w => w.xp }),
  long: () => ({ emoji: '⏱️', text: '3 activités longues (1 h et +)', goal: 3, prog: w => {
    let n = 0;
    for (const k of w.days) for (const d of activeDomains()) {
      const v = valOf(k, d.id);
      if (!LONG_EXCLUDED.has(d.id) && isDone(k, d.id) && d.m && d.m.kind === 'levels' && v != null && d.m.opts[v] && d.m.opts[v][1] >= 2) n++;
    }
    return n;
  } }),
  good: () => ({ emoji: '🔥', text: '6 journées réussies', goal: 6, prog: w => w.days.filter(isGoodDay).length }),
};
function weekChallenges(ws, dayXP) {
  const rnd = seeded('defis' + key(ws));
  const doms = activeDomains();
  const list = [];
  if (doms.length) {
    const d = doms[Math.floor(rnd() * doms.length)], n = 4 + Math.floor(rnd() * 2);
    list.push({ id: 'dom', emoji: d.emoji, text: `${d.name} : ${n} jours`, goal: n, prog: w => w.days.filter(k => isDone(k, d.id)).length });
  }
  const ids = Object.keys(CHALLENGES);
  while (list.length < 3 && ids.length) list.push({ id: ids[0], ...CHALLENGES[ids.splice(Math.floor(rnd() * ids.length), 1)[0]]() });
  const t = today(), days = [];
  for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d <= t) days.push(key(d)); }
  const w = { days, pct: periodScore(ws, addDays(ws, 6)).pct, xp: days.reduce((a, k) => a + (dayXP[k] || 0), 0) };
  return list.map(c => { const v = c.prog(w); return { emoji: c.emoji, text: c.text, goal: c.goal, unit: c.unit || '', value: v, done: v >= c.goal }; });
}

/* ---------- Calcul complet (mis en cache tant que rien ne change) ---------- */
let memo = { s: null, mod: -1, day: '', v: null };
export function G() {
  const tk = todayKey();
  if (memo.s !== S || memo.mod !== S.meta.modified || memo.day !== tk) memo = { s: S, mod: S.meta.modified, day: tk, v: compute() };
  return memo.v;
}
export const invalidate = () => { memo.mod = -1; };

function compute() {
  const tk = todayKey(), t = today();
  const doms = S.domains.list;
  const moneyDom = doms.find(d => d.m && d.m.kind === 'money');
  const dayKeys = Object.keys(S.days).sort();

  // XP de chaque jour : cases (selon le détail saisi) + journée parfaite + phrase du jour + ouverture de l'appli
  const dayXP = {}, caseXPs = {}, money = [];
  let xpCases = 0, xpBonus = 0, lastMoney;
  for (const k of dayKeys) {
    const day = S.days[k];
    let x = 0;
    const per = {};
    for (const d of doms) {
      if (!(day.c && day.c[d.id])) continue;
      const v = day.x ? day.x[d.id] : undefined;
      per[d.id] = caseXP(d, v, lastMoney);
      x += per[d.id];
    }
    if (moneyDom && day.c && day.c[moneyDom.id] && day.x && typeof day.x[moneyDom.id] === 'number') { lastMoney = day.x[moneyDom.id]; money.push([k, lastMoney]); }
    let b = 0;
    if (isPerfect(k)) b += PERFECT_BONUS;
    if (day.note && day.note.trim()) b += NOTE_XP;
    caseXPs[k] = per; dayXP[k] = x + b; xpCases += x; xpBonus += b;
  }
  for (const k of Object.keys(S.game.visits)) { dayXP[k] = (dayXP[k] || 0) + VISIT_XP; xpBonus += VISIT_XP; }

  let xpGoals = 0;
  for (const g of S.goals) {
    if (g.done) xpGoals += goalXP(g);
    if (g.type === 'steps') xpGoals += (g.steps || []).filter(s => s.done).length * STEP_XP;
  }
  const mediaDone = S.media.filter(m => m.status === 'done');
  const xpMedia = mediaDone.length * MEDIA_XP;
  let xpBadges = 0, badgeBoxes = 0;
  const defs = badgeDefs();
  for (const id of Object.keys(S.game.badges)) { const b = defs.find(x => x.id === id); if (b) { xpBadges += b.xp; if (b.box) badgeBoxes++; } }

  // Défis : toutes les semaines depuis le début
  const allKeys = [...dayKeys, ...Object.keys(S.game.visits)].sort();
  let xpChallenges = 0, challengeBoxes = 0;
  if (allKeys.length) {
    for (let ws = weekStart(parseKey(allKeys[0])); ws <= t; ws = addDays(ws, 7)) {
      const ch = weekChallenges(ws, dayXP);
      const n = ch.filter(c => c.done).length;
      xpChallenges += n * CHALLENGE_XP;
      if (n === ch.length && n) challengeBoxes++;
    }
  }
  const challenges = weekChallenges(weekStart(t), dayXP);

  const xp = xpCases + xpBonus + xpGoals + xpMedia + xpBadges + xpChallenges;
  const lvl = levelOf(xp);

  // Collection : chaque box ouverte donne une famille (au premier stade) ; les doublons donnent des fragments
  const pulls = [...S.game.pulls].sort((a, b) => a.t - b.t);
  const owned = {};
  let frags = 0, since4 = 0, since5 = 0;
  for (const p of pulls) {
    if (owned[p.l]) { owned[p.l].count++; frags += FRAG[p.r] || 0; }
    else owned[p.l] = { count: 1, t: p.t };
    since4 = p.r >= 4 ? 0 : since4 + 1;
    since5 = p.r >= 5 ? 0 : since5 + 1;
  }
  frags -= S.game.trades.length * FRAG_PER_BOX;
  // 1 box de bienvenue + 1 par niveau gagné + défis réussis + badges + échanges de fragments
  const boxesEarned = lvl.level + challengeBoxes + badgeBoxes + S.game.trades.length;
  const boxes = Math.max(0, boxesEarned - pulls.length);

  // Compagnon : grandit avec l'XP des jours où il est actif, redescend après 2 jours « sans » d'affilée
  const forms = new Set(Object.keys(owned).map(l => LINES[l] ? LINES[l].base : l));
  const comp = [...S.game.comp].filter(c => owned[c.line] && LINES[c.line]).sort((a, b) => a.from < b.from ? -1 : a.from > b.from ? 1 : a.t - b.t);
  const lineState = {};
  let bad = 0, regressions = 0, evolutions = 0;
  if (comp.length) {
    let ci = -1;
    for (let d = parseKey(comp[0].from); d <= t; d = addDays(d, 1)) {
      const k = key(d);
      while (ci + 1 < comp.length && comp[ci + 1].from <= k) ci++;
      const line = comp[ci].line, L = LINES[line], thr = compThreshold(line);
      const st = lineState[line] || (lineState[line] = { xp: 0, path: [L.base] });
      st.xp += dayXP[k] || 0;
      for (;;) {
        const cur = FORMS[st.path[st.path.length - 1]];
        if (!cur.next.length || st.xp < thr * st.path.length) break;
        const nxt = cur.next[Math.floor(seeded(line + k + st.path.length)() * cur.next.length)];
        st.path.push(nxt); forms.add(nxt); evolutions++;
      }
      if (k < tk) {
        bad = isBadDay(k) ? bad + 1 : 0;
        if (bad >= 2) {
          bad = 0;
          if (st.path.length > 1) { st.path.pop(); regressions++; }
          st.xp = thr * (st.path.length - 1);
        }
      }
    }
  }
  let companion = null;
  if (comp.length) {
    const line = comp[comp.length - 1].line, st = lineState[line] || { xp: 0, path: [LINES[line].base] };
    const thr = compThreshold(line), stage = st.path.length - 1, form = FORMS[st.path[stage]];
    companion = { line, form, stage, path: st.path, maxed: !form.next.length, into: st.xp - thr * stage, need: thr, badStreak: bad };
  }

  // Jokers : 1 gagné par semaine entière réussie (3 au maximum), 1 au départ
  const events = [];
  if (dayKeys.length) {
    for (let ws = weekStart(parseKey(dayKeys[0])); addDays(ws, 6) < t; ws = addDays(ws, 7)) {
      let ok = true;
      for (let i = 0; i < 7 && ok; i++) ok = isGoodDay(key(addDays(ws, i)));
      if (ok) events.push([key(addDays(ws, 7)), 1]);
    }
  }
  for (const k of Object.keys(S.game.jokerDays)) events.push([k, -1]);
  events.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : b[1] - a[1]);
  let jokers = 1;
  for (const [, n] of events) jokers = Math.max(0, Math.min(JOKER_MAX, jokers + n));

  return {
    dayXP, caseXPs, money, xp, lvl, title: titleOf(lvl.level),
    breakdown: { cases: xpCases, bonus: xpBonus, goals: xpGoals, media: xpMedia, badges: xpBadges, challenges: xpChallenges },
    challenges, owned, frags, since4, since5, boxes, boxesEarned, forms, companion, jokers, regressions, evolutions,
    mediaDone,
  };
}

/* ---------- Badges ---------- */
const MONEY_STEPS = [1000, 5000, 10000, 25000, 50000, 100000];
let defsCache = null, defsKey = '';
export function badgeDefs() {
  const doms = activeDomains();
  const k = doms.map(d => d.id + d.name + d.emoji).join();
  if (defsCache && defsKey === k) return defsCache;
  const list = [];
  const add = (cat, id, emoji, name, desc, xp, test, box = false) => list.push({ cat, id, emoji, name, desc, xp, test, box });
  [[3, 50], [7, 100, true], [14, 200], [30, 400, true], [60, 600], [100, 1000, true], [200, 1500], [365, 3000, true]].forEach(([n, xp, box]) =>
    add('Séries', 'serie' + n, '🔥', `Série de ${n} jours`, `Tenir ta série ${n} jours d’affilée`, xp, c => c.best >= n, !!box));
  [[1, 50], [5, 100], [10, 200], [25, 400, true], [50, 700], [100, 1500, true]].forEach(([n, xp, box]) =>
    add('Journées parfaites', 'parfait' + n, '🏆', n === 1 ? 'Première journée parfaite' : `${n} journées parfaites`, `Tout cocher en une journée${n > 1 ? `, ${n} fois` : ''}`, xp, c => c.perfect >= n, !!box));
  for (const d of doms) {
    add('Domaines', `dom7-${d.id}`, d.emoji, `${d.name} · 7 jours`, `${d.name} 7 jours d’affilée`, 80, c => c.domBest(d.id) >= 7);
    add('Domaines', `dom30-${d.id}`, d.emoji, `${d.name} · 30 jours`, `${d.name} 30 jours d’affilée`, 300, c => c.domBest(d.id) >= 30);
  }
  add('Domaines', 'ecran7', '📵', 'Détox', 'Moins de 30 min d’écran 7 jours d’affilée', 300, c => c.ecranLow7);
  add('Domaines', 'sommeil7', '😴', 'Gros dormeur', '8 h de sommeil ou plus 7 nuits d’affilée', 200, c => c.sleep7);
  add('Domaines', 'alim7', '🥗', 'Assiette parfaite', 'Les 4 objectifs d’alimentation 7 jours d’affilée', 250, c => c.alim7);
  [[7, 50], [30, 200], [100, 600], [365, 2000]].forEach(([n, xp]) =>
    add('Connexion', 'visite' + n, '📅', `${n} jours de connexion`, `Ouvrir l’appli ${n} jours différents`, xp, c => c.visits >= n));
  [[7, 50], [30, 200], [100, 500]].forEach(([n, xp]) =>
    add('Connexion', 'note' + n, '✍️', `${n} phrases du jour`, `Écrire ta phrase du jour ${n} fois`, xp, c => c.notes >= n));
  add('Connexion', 'vision', '🌅', 'Visionnaire', 'Écrire ta vision', 100, c => c.vision);
  add('Épargne', 'argent-point', '💰', 'Premier point', 'Noter le total de tes comptes', 30, c => c.moneyPoints >= 1);
  add('Épargne', 'argent-30', '📒', 'Bon gestionnaire', 'Faire le point sur ton argent 30 fois', 250, c => c.moneyPoints >= 30);
  MONEY_STEPS.forEach((n, i) => add('Épargne', 'epargne' + n, i < 2 ? '💵' : i < 4 ? '💰' : '🏦', `${n.toLocaleString('fr-FR')} € d’épargne`, `Atteindre ${n.toLocaleString('fr-FR')} € au total`, 100 + i * 150, c => c.moneyMax >= n, i >= 2));
  add('Épargne', 'hausse', '📈', 'Ça monte !', 'Un total plus haut qu’il y a 30 jours', 150, c => c.moneyUp30);
  [[1, 30], [10, 150], [25, 300], [50, 600], [100, 1200]].forEach(([n, xp]) =>
    add('Médiathèque', 'media' + n, '🍿', n === 1 ? 'Premier terminé' : `${n} œuvres terminées`, `Terminer ${n} film${n > 1 ? 's' : ''}, livre${n > 1 ? 's' : ''}, manga${n > 1 ? 's' : ''}…`, xp, c => c.media.all >= n));
  [['film', '🎬', 'Cinéphile', 10, 'films'], ['livre', '📖', 'Rat de bibliothèque', 5, 'livres'], ['manga', '📕', 'Otaku', 10, 'mangas'], ['anime', '🍥', 'Fan d’animés', 10, 'animés'], ['serie', '📺', 'Sériephile', 5, 'séries']].forEach(([t, e, n, c, lab]) =>
    add('Médiathèque', 'm-' + t, e, n, `Terminer ${c} ${lab}`, 200, x => (x.media[t] || 0) >= c));
  [[1, 50], [5, 200], [10, 400], [25, 1000]].forEach(([n, xp]) =>
    add('Objectifs', 'obj' + n, '🎯', n === 1 ? 'Premier objectif atteint' : `${n} objectifs atteints`, `Atteindre ${n} objectif${n > 1 ? 's' : ''}`, xp, c => c.goalsDone >= n));
  add('Objectifs', 'obj-an', '👑', 'Objectif de l’année', 'Atteindre un objectif d’un an', 800, c => c.yearGoal, true);
  [[10, 100], [50, 300], [100, 600, true], [200, 1200, true]].forEach(([n, xp, box]) =>
    add('Collection', 'coll' + n, '🎴', `${n} cartes`, `Posséder ${n} cartes différentes`, xp, c => c.forms >= n, !!box));
  add('Collection', 'first4', '💜', 'Épique !', 'Obtenir une carte 4★', 100, c => c.maxRarity >= 4);
  add('Collection', 'first5', '🌟', 'Légendaire !', 'Obtenir une carte 5★', 300, c => c.maxRarity >= 5);
  add('Collection', 'evo1', '✨', 'Première évolution', 'Faire évoluer ton compagnon', 150, c => c.evolutions >= 1);
  add('Collection', 'evo10', '🧬', 'Éleveur', 'Faire évoluer tes compagnons 10 fois', 500, c => c.evolutions >= 10);
  [5, 10, 20, 30, 50].forEach((n, i) => add('Niveaux', 'niv' + n, '⭐', `Niveau ${n}`, `Atteindre le niveau ${n}`, 100 + i * 150, c => c.level >= n));
  defsCache = list; defsKey = k;
  return list;
}

function badgeCtx() {
  const g = G();
  const domBestCache = {};
  const media = { all: g.mediaDone.length };
  for (const m of g.mediaDone) media[m.type] = (media[m.type] || 0) + 1;
  const goalsDone = S.goals.filter(x => x.done);
  const money = g.money, last = money.length ? money[money.length - 1] : null;
  const ago = key(addDays(today(), -30));
  const before = money.filter(([k]) => k <= ago).pop();
  let maxRarity = 0;
  for (const l of Object.keys(g.owned)) if (LINES[l]) maxRarity = Math.max(maxRarity, LINES[l].rarity);
  const alim = activeDomains().find(d => d.id === 'alim');
  return {
    best: globalBest(),
    perfect: Object.keys(S.days).filter(isPerfect).length,
    domBest: id => domBestCache[id] ?? (domBestCache[id] = bestOf(k => isDone(k, id))),
    ecranLow7: bestOf(k => isDone(k, 'ecran') && valOf(k, 'ecran') === 3) >= 7,
    sleep7: bestOf(k => isDone(k, 'sommeil') && valOf(k, 'sommeil') === 3) >= 7,
    alim7: !!alim && bestOf(k => isDone(k, 'alim') && Array.isArray(valOf(k, 'alim')) && valOf(k, 'alim').length >= alim.m.items.length) >= 7,
    visits: Object.keys(S.game.visits).length,
    notes: Object.values(S.days).filter(d => d.note && d.note.trim()).length,
    vision: S.vision.blocks.some(b => b.text.trim().length > 20),
    moneyPoints: money.length,
    moneyMax: money.reduce((a, [, v]) => Math.max(a, v), 0),
    moneyUp30: !!(last && before && last[1] > before[1]),
    media, goalsDone: goalsDone.length,
    yearGoal: goalsDone.some(x => x.horizon === 'annee' || goalXP(x) >= 2500),
    forms: g.forms.size, maxRarity, evolutions: g.evolutions, level: g.lvl.level,
  };
}

// Débloque les nouveaux badges (définitifs une fois gagnés) ; renvoie ceux qui viennent d'être obtenus
export function awardBadges() {
  const fresh = [];
  for (let i = 0; i < 4; i++) {
    const ctx = badgeCtx();
    const now = badgeDefs().filter(b => !S.game.badges[b.id] && b.test(ctx));
    if (!now.length) break;
    for (const b of now) { S.game.badges[b.id] = todayKey(); fresh.push(b); }
    invalidate();
  }
  return fresh;
}
