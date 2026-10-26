// Règles du jeu : XP, niveaux, box, collection, compagnon, défis de la semaine, jokers et badges.
// Presque tout est recalculé à partir de l'historique : décocher une case retire l'XP correspondante,
// et deux appareils synchronisés arrivent toujours au même résultat.
import { S, isDone, valOf, activeDomains } from '../store.js';
import { key, parseKey, today, todayKey, addDays, weekStart, dayDiff, seeded } from '../util.js';
import { caseXP, SLEEP_OK_FROM } from '../measures.js';
import { isPerfect, isGoodDay, bestOf, globalBest, periodScore, dayCount } from '../stats.js';
import { LINES, FORMS } from './roster.js';
import { TIERS, TIER_KEYS, kindOf, smallAt, levelRewards } from './tiers.js';
import { runBosses } from './boss.js';
import { runMastery } from './mastery.js';
import { albumState } from './albums.js';
import { recapWeeks, gradeOf, RECAP_HOUR } from './weekly.js';

export const PERFECT_BONUS = 50, NOTE_XP = 5, VISIT_XP = 10, MEDIA_XP = 50, STEP_XP = 15;
export const FRAG = { 1: 3, 2: 6, 3: 12, 4: 25, 5: 50 };
export const JOKER_MAX = 3;
// Boss battu : de l'XP en plus de sa grande box et de sa carte
export const BOSS_XP = 100, LEGEND_XP = 250;
// Fusion des doublons : 3 pour une carte éveillée, 5 de plus pour l'ultime ; un compagnon fusionné grandit plus vite
export const FUSE_COST = { 1: 3, 2: 5 };
export const AWAKEN = { 1: { name: 'Éveillée', mult: 1.25 }, 2: { name: 'Ultime', mult: 1.5 } };
// Une brillante obtenue une deuxième fois rapporte des fragments
export const SHINY_DUP = 30;

/* ---------- Niveaux ---------- */
export const xpNeed = L => Math.round(300 + 40 * Math.pow(L - 1, 1.2));
export function levelOf(xp) {
  let L = 1, rest = Math.max(0, xp);
  while (rest >= xpNeed(L)) { rest -= xpNeed(L); L++; }
  return { level: L, into: rest, need: xpNeed(L) };
}
export const LEVEL_TITLES = [[1, 'Débutant'], [3, 'Apprenti'], [5, 'Motivé'], [8, 'Régulier'], [12, 'Discipliné'], [16, 'Guerrier'], [20, 'Machine'], [25, 'Élite'], [30, 'Maître'], [40, 'Légende'], [50, 'Mythique'], [75, 'Divin']];
export const titleOf = L => LEVEL_TITLES.filter(t => L >= t[0]).pop()[1];

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
function longCount(w) {
  let n = 0;
  for (const k of w.days) for (const d of activeDomains()) {
    const v = valOf(k, d.id);
    if (!LONG_EXCLUDED.has(d.id) && isDone(k, d.id) && d.m && d.m.kind === 'levels' && v != null && d.m.opts[v] && d.m.opts[v][1] >= 2) n++;
  }
  return n;
}
// Chaque type de défi existe en 3 niveaux : facile (petite box), moyen (box classique), difficile (grande box)
const CH_LEVELS = [{ box: 'p', xp: 50, label: 'Facile' }, { box: 'c', xp: 100, label: 'Moyen' }, { box: 'g', xp: 200, label: 'Difficile' }];
const CH_KINDS = {
  perfect: lv => { const n = [1, 2, 4][lv]; return { emoji: '🏆', text: n === 1 ? 'Une journée parfaite' : `${n} journées parfaites`, goal: n, prog: w => w.days.filter(isPerfect).length }; },
  good: lv => { const n = [3, 5, 7][lv]; return { emoji: '🔥', text: n === 7 ? '7 journées réussies sur 7' : `${n} journées réussies`, goal: n, prog: w => w.days.filter(isGoodDay).length }; },
  notes: lv => { const n = [3, 5, 7][lv]; return { emoji: '✍️', text: `Ta phrase du jour ${n} fois`, goal: n, prog: w => w.days.filter(k => S.days[k] && S.days[k].note && S.days[k].note.trim()).length }; },
  xp: lv => { const n = [500, 1000, 1800][lv]; return { emoji: '⚡', text: `Gagner ${n.toLocaleString('fr-FR')} XP`, goal: n, unit: ' XP', prog: w => w.xp }; },
  long: lv => { const n = [2, 3, 6][lv]; return { emoji: '⏱️', text: `${n} activités longues (1 h et +)`, goal: n, prog: longCount }; },
  pct: lv => { const n = [50, 65, 80][lv]; return { emoji: '📈', text: `Semaine à ${n} % ou plus`, goal: n, unit: ' %', prog: w => w.pct }; },
  dom: (lv, rnd) => {
    const doms = activeDomains(), d = doms[Math.floor(rnd() * doms.length)], n = [3, 5, 7][lv];
    return d && { emoji: d.emoji, text: n === 7 ? `${d.name} 7 jours sur 7` : `${d.name} : ${n} jours`, goal: n, prog: w => w.days.filter(k => isDone(k, d.id)).length };
  },
};
function weekChallenges(ws, dayXP) {
  const rnd = seeded('defis2' + key(ws));
  const kinds = Object.keys(CH_KINDS);
  const list = CH_LEVELS.map((lvl, lv) => {
    let c = null;
    while (!c && kinds.length) c = CH_KINDS[kinds.splice(Math.floor(rnd() * kinds.length), 1)[0]](lv, rnd);
    return c && { ...c, ...lvl };
  }).filter(Boolean);
  const t = today(), days = [];
  for (let i = 0; i < 7; i++) { const d = addDays(ws, i); if (d <= t) days.push(key(d)); }
  const w = { days, pct: periodScore(ws, addDays(ws, 6)).pct, xp: days.reduce((a, k) => a + (dayXP[k] || 0), 0) };
  return list.map(c => { const v = c.prog(w); return { emoji: c.emoji, text: c.text, goal: c.goal, unit: c.unit || '', value: v, done: v >= c.goal, box: c.box, xp: c.xp, label: c.label }; });
}

/* ---------- Calcul complet (mis en cache tant que rien ne change) ---------- */
let memo = { s: null, mod: -1, day: '', v: null };
export function G() {
  // Le dimanche à 18 h, le bilan de la semaine s'ouvre : on recalcule
  const now = new Date(), tk = todayKey() + (now.getDay() === 0 && now.getHours() >= RECAP_HOUR ? '+' : '');
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
  // Box gagnées, recalculées à partir de l'historique : petite à 5 cases, classique pour une journée parfaite…
  const earned = { p: 0, c: 0, g: 0 };
  const nDom = activeDomains().length, sAt = smallAt(nDom);
  for (const k of dayKeys) {
    if (nDom && dayCount(k) >= sAt) earned.p++;
    if (isPerfect(k)) earned.c++;
  }
  let xpBadges = 0;
  const defs = badgeDefs();
  for (const id of Object.keys(S.game.badges)) { const b = defs.find(x => x.id === id); if (b) { xpBadges += b.xp; if (b.box) earned[b.box]++; } }

  // Défis : toutes les semaines depuis le début
  const allKeys = [...dayKeys, ...Object.keys(S.game.visits)].sort();
  let xpChallenges = 0;
  if (allKeys.length) {
    for (let ws = weekStart(parseKey(allKeys[0])); ws <= t; ws = addDays(ws, 7)) {
      for (const c of weekChallenges(ws, dayXP)) if (c.done) { xpChallenges += c.xp; earned[c.box]++; }
    }
  }
  const challenges = weekChallenges(weekStart(t), dayXP);

  // Boss : grande box (deux pour un légendaire), sa carte et de l'XP à chaque victoire
  const since = S.game.since;
  const boss = runBosses(caseXPs, tk);
  let xpBoss = 0;
  for (const b of boss.history) if (b.won) { earned.g += b.legendary ? 2 : 1; xpBoss += b.legendary ? LEGEND_XP : BOSS_XP; }
  // Maîtrise : une grande box à chaque nouveau rang d'un domaine (depuis l'arrivée de la maîtrise)
  const mastery = runMastery(activeDomains(), dayKeys, caseXPs);
  for (const m of Object.values(mastery)) for (const r of m.rankUps) if (r.day >= since) earned.g++;
  // Bilan de la semaine : grande box pour un S, classique pour un A, petite pour un B
  const recaps = recapWeeks(since).map(ws => ({ ws: key(ws), grade: gradeOf(periodScore(ws, addDays(ws, 6)).pct) }));
  for (const r of recaps) if (r.grade.box) earned[r.grade.box]++;

  const xp = xpCases + xpBonus + xpGoals + xpMedia + xpBadges + xpChallenges + xpBoss;
  const lvl = levelOf(xp);

  // Collection : chaque box ouverte donne une famille (au premier stade). Les doublons restent sur la carte,
  // à fusionner ou à échanger ; ceux d'avant cette version sont devenus des fragments tout seuls.
  const dupFrom = S.game.dupFrom || 0;
  const bossPulls = boss.history.filter(b => b.won).map(b => ({ id: 'boss' + b.n, b: 'boss' + b.n, l: b.line, r: LINES[b.line].rarity, t: b.t, v: 1 }));
  const pulls = [...S.game.pulls, ...bossPulls].sort((a, b) => a.t - b.t);
  const owned = {}, opened = { p: new Set(), c: new Set(), g: new Set() };
  let frags = 0, since4 = 0, since5 = 0;
  for (const p of pulls) {
    const o = owned[p.l];
    if (!o) owned[p.l] = { count: 1, t: p.t, auto: 0, shiny: !!p.s };
    else {
      o.count++;
      if (p.t < dupFrom) { o.auto++; frags += FRAG[p.r] || 0; }
      if (p.s) { if (o.shiny) frags += SHINY_DUP; else o.shiny = true; }
    }
    if (p.v) continue;   // carte d'un boss : pas une box
    // Une box ouverte = un booster (les anciennes box d'une seule carte comptent pour une)
    opened[kindOf(p)].add(p.b || p.id);
    if (TIERS[kindOf(p)].pity) { since4 = p.r >= 4 ? 0 : since4 + 1; since5 = p.r >= 5 ? 0 : since5 + 1; }
  }
  // Fusions et échanges de doublons, dans l'ordre où ils ont été faits
  const used = {}, awaken = {}, awakenAt = {};
  const avail = l => owned[l] ? owned[l].count - 1 - owned[l].auto - (used[l] || 0) : 0;
  const acts = [...S.game.fusions.map(f => ({ ...f, fuse: true })), ...S.game.recycles].sort((a, b) => a.t - b.t);
  let fusionCount = 0;
  for (const e of acts) {
    if (!owned[e.l] || !LINES[e.l]) continue;
    if (e.fuse) {
      const lv = (awaken[e.l] || 0) + 1;
      if (e.lv !== lv || !FUSE_COST[lv] || avail(e.l) < FUSE_COST[lv]) continue;
      used[e.l] = (used[e.l] || 0) + FUSE_COST[lv]; awaken[e.l] = lv; fusionCount++;
      (awakenAt[e.l] = awakenAt[e.l] || [])[lv] = key(new Date(e.t));
    } else {
      const n = Math.min(e.n || 0, avail(e.l));
      if (n > 0) { used[e.l] = (used[e.l] || 0) + n; frags += n * (FRAG[LINES[e.l].rarity] || 0); }
    }
  }
  const dups = {};
  for (const l of Object.keys(owned)) { const a = avail(l); if (a > 0) dups[l] = a; }
  const shinies = Object.values(owned).filter(o => o.shiny).length;
  // Albums complets : une grande box chacun
  const albums = albumState(owned);
  for (const a of albums) if (a.done) earned.g++;
  // Niveaux : une grande box de bienvenue, une par niveau gagné, et des bonus tous les 5 niveaux
  for (let L = 1; L <= lvl.level; L++) for (const tier of levelRewards(L)) earned[tier]++;
  // Échanges de fragments
  for (const tr of S.game.trades) { earned[kindOf(tr)]++; frags -= TIERS[kindOf(tr)].cost; }
  const boxes = { total: 0 };
  for (const k of TIER_KEYS) { boxes[k] = Math.max(0, earned[k] - opened[k].size); boxes.total += boxes[k]; }
  const boxesEarned = earned;

  // Compagnon : grandit avec l'XP des jours où il est actif, redescend après 2 jours « sans » d'affilée
  const forms = new Set(Object.keys(owned).map(l => LINES[l] ? LINES[l].base : l));
  if (S.game.unlockAll) for (const id of Object.keys(FORMS)) forms.add(id);
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
      // Un compagnon éveillé (fusion) grandit plus vite
      const aw = awakenAt[line], lvAw = aw && aw[2] && aw[2] <= k ? 2 : aw && aw[1] && aw[1] <= k ? 1 : 0;
      st.xp += Math.round((dayXP[k] || 0) * (lvAw ? AWAKEN[lvAw].mult : 1));
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
    breakdown: { cases: xpCases, bonus: xpBonus, goals: xpGoals, media: xpMedia, badges: xpBadges, challenges: xpChallenges, boss: xpBoss },
    challenges, owned, frags, since4, since5, boxes, boxesEarned, forms, companion, jokers, regressions, evolutions,
    mediaDone, smallAt: sAt, boss, mastery, recaps, albums, dups, awaken, shinies, fusionCount,
    rarityOf: l => (LINES[l] ? LINES[l].rarity : 0),
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
  [[3, 50], [7, 100, 'c'], [14, 200, 'c'], [30, 400, 'g'], [60, 600, 'g'], [100, 1000, 'g'], [200, 1500, 'g'], [365, 3000, 'g']].forEach(([n, xp, box]) =>
    add('Séries', 'serie' + n, '🔥', `Série de ${n} jours`, `Tenir ta série ${n} jours d’affilée`, xp, c => c.best >= n, box));
  [[1, 50], [5, 100, 'c'], [10, 200, 'c'], [25, 400, 'g'], [50, 700, 'g'], [100, 1500, 'g']].forEach(([n, xp, box]) =>
    add('Journées parfaites', 'parfait' + n, '🏆', n === 1 ? 'Première journée parfaite' : `${n} journées parfaites`, `Tout cocher en une journée${n > 1 ? `, ${n} fois` : ''}`, xp, c => c.perfect >= n, box));
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
  MONEY_STEPS.forEach((n, i) => add('Épargne', 'epargne' + n, i < 2 ? '💵' : i < 4 ? '💰' : '🏦', `${n.toLocaleString('fr-FR')} € d’épargne`, `Atteindre ${n.toLocaleString('fr-FR')} € au total`, 100 + i * 150, c => c.moneyMax >= n, i >= 4 ? 'g' : i >= 2 ? 'c' : false));
  add('Épargne', 'hausse', '📈', 'Ça monte !', 'Un total plus haut qu’il y a 30 jours', 150, c => c.moneyUp30);
  [[1, 30], [10, 150], [25, 300], [50, 600], [100, 1200]].forEach(([n, xp]) =>
    add('Médiathèque', 'media' + n, '🍿', n === 1 ? 'Premier terminé' : `${n} œuvres terminées`, `Terminer ${n} film${n > 1 ? 's' : ''}, livre${n > 1 ? 's' : ''}, manga${n > 1 ? 's' : ''}…`, xp, c => c.media.all >= n));
  [['film', '🎬', 'Cinéphile', 10, 'films'], ['livre', '📖', 'Rat de bibliothèque', 5, 'livres'], ['manga', '📕', 'Otaku', 10, 'mangas'], ['anime', '🍥', 'Fan d’animés', 10, 'animés'], ['serie', '📺', 'Sériephile', 5, 'séries']].forEach(([t, e, n, c, lab]) =>
    add('Médiathèque', 'm-' + t, e, n, `Terminer ${c} ${lab}`, 200, x => (x.media[t] || 0) >= c));
  [[1, 50], [5, 200, 'c'], [10, 400, 'c'], [25, 1000, 'g']].forEach(([n, xp, box]) =>
    add('Objectifs', 'obj' + n, '🎯', n === 1 ? 'Premier objectif atteint' : `${n} objectifs atteints`, `Atteindre ${n} objectif${n > 1 ? 's' : ''}`, xp, c => c.goalsDone >= n, box));
  add('Objectifs', 'obj-an', '👑', 'Objectif de l’année', 'Atteindre un objectif d’un an', 800, c => c.yearGoal, 'g');
  [[10, 100], [50, 300, 'c'], [100, 600, 'g'], [200, 1200, 'g'], [400, 2000, 'g']].forEach(([n, xp, box]) =>
    add('Collection', 'coll' + n, '🎴', `${n} cartes`, `Posséder ${n} cartes différentes`, xp, c => c.forms >= n, box));
  add('Collection', 'first4', '💜', 'Épique !', 'Obtenir une carte 4★', 100, c => c.maxRarity >= 4);
  add('Collection', 'first5', '🌟', 'Légendaire !', 'Obtenir une carte 5★', 300, c => c.maxRarity >= 5);
  add('Collection', 'evo1', '✨', 'Première évolution', 'Faire évoluer ton compagnon', 150, c => c.evolutions >= 1);
  add('Collection', 'evo10', '🧬', 'Éleveur', 'Faire évoluer tes compagnons 10 fois', 500, c => c.evolutions >= 10);
  add('Collection', 'shiny1', '✨', 'Ça brille !', 'Obtenir une carte brillante', 100, c => c.shinies >= 1);
  add('Collection', 'shiny10', '💫', 'Chasseur de brillantes', 'Obtenir 10 cartes brillantes', 500, c => c.shinies >= 10, 'g');
  add('Collection', 'fusion1', '🔮', 'Première fusion', 'Éveiller une carte avec ses doublons', 100, c => c.fusions >= 1);
  add('Collection', 'ultime1', '🌈', 'Carte ultime', 'Amener une carte au stade ultime', 300, c => c.ultime >= 1, 'c');
  add('Collection', 'album1', '📚', 'Premier album', 'Compléter un album', 200, c => c.albums >= 1);
  add('Collection', 'album5', '📖', 'Archiviste', 'Compléter 5 albums', 800, c => c.albums >= 5, 'g');
  add('Boss', 'boss1', '⚔️', 'Premier boss vaincu', 'Battre ton premier boss', 100, c => c.bosses >= 1);
  add('Boss', 'boss10', '🗡️', 'Chasseur de boss', 'Battre 10 boss', 500, c => c.bosses >= 10, 'c');
  add('Boss', 'boss-leg', '🐉', 'Tueur de légende', 'Battre un boss légendaire', 300, c => c.legends >= 1, 'g');
  add('Boss', 'boss50', '☠️', 'Fléau des méchants', 'Battre 50 boss', 1500, c => c.bosses >= 50, 'g');
  add('Maîtrise', 'm-confirme', '🔷', 'Confirmé', 'Rang Confirmé dans un domaine (niveau 31)', 300, c => c.rank >= 3);
  add('Maîtrise', 'm-maitre', '🔮', 'Maître', 'Rang Maître dans un domaine (niveau 51)', 800, c => c.rank >= 5, 'g');
  add('Maîtrise', 'm-legende', '👑', 'Légende vivante', 'Rang Légende dans un domaine (niveau 81)', 2000, c => c.rank >= 8, 'g');
  add('Bilans', 'recap-s', '💯', 'Semaine parfaite', 'Obtenir la note S à un bilan', 300, c => c.gradeS >= 1);
  add('Bilans', 'recap-a4', '📅', 'Régularité', 'Obtenir A ou S à 4 bilans', 400, c => c.gradeA >= 4, 'c');
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
    shinies: g.shinies, fusions: g.fusionCount, ultime: Object.values(g.awaken).filter(v => v >= 2).length, albums: g.albums.filter(a => a.done).length,
    bosses: g.boss.history.filter(b => b.won).length, legends: g.boss.history.filter(b => b.won && b.legendary).length,
    rank: Math.max(0, ...Object.values(g.mastery).map(m => m.rank)),
    gradeS: g.recaps.filter(r => r.grade.g === 'S').length, gradeA: g.recaps.filter(r => 'SA'.includes(r.grade.g)).length,
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
