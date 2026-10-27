// Mur des victoires : tes vrais progrès retrouvés dans l'historique (premières fois, nouveaux paliers, séries,
// habitudes, compétences, identités, objectifs…) et les victoires que tu notes toi-même.
// Les petites victoires comptent presque autant que les grandes pour la motivation : on les montre toutes.
import { S, isDone, valOf, activeDomains, rev } from '../store.js';
import { isPerfect, isGoodDay } from '../stats.js';
import { key, parseKey, addDays, dayDiff, today, todayKey } from '../util.js';
import { HABIT_STEPS, STAR_RULES, STAR_NAMES, skillSessions } from './growth.js';
import { RANKS } from './mastery.js';
import { badgeDefs } from './rules.js';

const STREAKS = [7, 14, 30, 60, 100, 200, 365];
const PERFECTS = [1, 5, 10, 25, 50, 100, 200, 365];
const MEDIA_ICO = { film: '🎬', livre: '📖', manga: '📕', anime: '🍥', serie: '📺' };
// Badges de la vraie vie (pas ceux de la collection)
const REAL_BADGES = /^(epargne\d+|hausse|argent-30|reg7|reg30|ecran7|sommeil7|alim7)$/;
export const WIN_KINDS = [['all', 'Toutes'], ['first', '✨ Premières fois'], ['streak', '🔥 Régularité'], ['growth', '🌱 Progrès'], ['goal', '🎯 Objectifs'], ['me', '⭐ Les miennes']];

// Jours de séries qui atteignent un palier pour la première fois
function streakWins(first, test, add) {
  let cur = 0, best = 0;
  for (let d = parseKey(first), end = today(); d <= end; d = addDays(d, 1)) {
    const k = key(d);
    cur = test(k) ? cur + 1 : 0;
    if (cur > best) { best = cur; if (STREAKS.includes(cur)) add(k, cur); }
  }
}

let memo = { s: null, mod: -1, day: '', v: null };
export function victories(g) {
  if (memo.s === S && memo.mod === rev() && memo.day === todayKey() && memo.v) return memo.v;
  const out = [], keys = Object.keys(S.days).sort(), doms = activeDomains();
  const add = (k, ico, txt, kind, big = 0, id = '') => { if (k) out.push({ k, ico, txt, kind, big, id }); };
  for (const d of doms) {
    // Première fois, puis chaque nouveau palier (1 h de sport, 8 h de sommeil, 15 000 pas…)
    const m = d.m || {}, graded = (m.kind === 'levels' || m.kind === 'skill') && m.opts;
    let seen = false, max = 0;
    for (const k of keys) {
      if (!isDone(k, d.id)) continue;
      if (!seen) { seen = true; add(k, d.emoji, `Première fois : ${d.name}`, 'first'); }
      if (!graded) continue;
      const v = valOf(k, d.id), i = m.kind === 'skill' ? v && v.v : v;
      if (typeof i === 'number' && i > max && m.opts[i]) { max = i; add(k, d.emoji, `Nouveau palier : ${d.name} · ${m.opts[i][0]}`, 'first', i === m.opts.length - 1 ? 1 : 0); }
    }
    if (keys.length) streakWins(keys[0], k => isDone(k, d.id), (k, n) => add(k, '🔥', `${d.name} : ${n} jours d’affilée`, 'streak', n >= 30 ? 1 : 0));
    // Identité et rangs de maîtrise
    const id = g.identity[d.id];
    // (le premier palier tombe avec les premières fois : on commence au deuxième)
    if (id) id.at.forEach((k, i) => { if (i) add(k, d.emoji, `Nouvelle identité : ${id.names[i]}`, 'growth', i >= 3 ? 1 : 0); });
    const ms = g.mastery[d.id];
    if (ms) for (const r of ms.rankUps) add(r.day, RANKS[r.rank][2], `${d.name} : rang ${RANKS[r.rank][0]}`, 'growth', r.rank >= 5 ? 1 : 0);
  }
  if (keys.length) streakWins(keys[0], isGoodDay, (k, n) => add(k, '🔥', `Série de ${n} jours`, 'streak', 1));
  let nPerfect = 0;
  for (const k of keys) if (isPerfect(k) && PERFECTS.includes(++nPerfect)) add(k, '🏆', nPerfect === 1 ? 'Première journée parfaite' : `${nPerfect}e journée parfaite`, 'streak', nPerfect >= 10 ? 1 : 0);
  for (const r of g.recaps) if ('SA'.includes(r.grade.g)) add(key(addDays(parseKey(r.ws), 6)), r.grade.g === 'S' ? '💯' : '📅', `Semaine notée ${r.grade.g}`, 'streak', r.grade.g === 'S' ? 1 : 0);
  // Habitudes arrêtées : chaque palier atteint pour la première fois
  const tk = todayKey();
  for (const h of S.habits) {
    const resets = [...new Set(h.resets || [])].filter(k => k >= h.start).sort();
    let from = h.start, best = 0;
    for (const end of [...resets, null]) {
      const len = end ? dayDiff(from, end) : Math.max(0, dayDiff(from, tk));
      for (const [n] of HABIT_STEPS) if (len >= n && best < n) add(key(addDays(parseKey(from), n)), h.emoji || '🛑', `${n} ${n > 1 ? 'jours' : 'jour'} sans ${h.name}`, 'growth', n >= 30 ? 1 : 0);
      best = Math.max(best, len);
      if (end) from = key(addDays(parseKey(end), 1));
    }
  }
  // Compétences : la première séance, puis chaque étoile validée par la pratique
  const ses = skillSessions(keys);
  for (const sk of g.skills) {
    const days = ses[sk.id] || [];
    if (days.length) add(days[0], sk.emoji || '🧠', `Nouvelle compétence : ${sk.name}`, 'growth');
    for (let s = 2; s <= sk.validated; s++) add(days[STAR_RULES[s][0] - 1], '⭐', `${sk.name} : ${s}★ (${STAR_NAMES[s]})`, 'growth', s >= 4 ? 1 : 0);
  }
  for (const x of S.goals) if (x.done && x.doneAt) add(x.doneAt, x.emoji || '🎯', `Objectif atteint : ${x.title}`, 'goal', 1);
  for (const m of S.media) if (m.status === 'done' && m.date) add(m.date, MEDIA_ICO[m.type] || '🍿', `Terminé : ${m.title}`, 'goal');
  const defs = badgeDefs();
  for (const [id, k] of Object.entries(S.game.badges)) if (REAL_BADGES.test(id)) { const b = defs.find(x => x.id === id); if (b) add(k, b.emoji, b.name, 'goal', 1); }
  for (const w of S.wins) add(w.k, w.emoji || '⭐', w.text, 'me', 1, w.id);
  out.sort((a, b) => (a.k < b.k ? 1 : a.k > b.k ? -1 : b.big - a.big));
  memo = { s: S, mod: rev(), day: todayKey(), v: out };
  return out;
}
export const winsBetween = (g, from, to) => victories(g).filter(w => w.k >= from && w.k <= to);
