// Bilan de la semaine (note de S à D, box selon la note) et records personnels.
import { S, activeDomains, isDone } from '../store.js';
import { key, parseKey, today, addDays, weekStart } from '../util.js';
import { periodScore, isPerfect } from '../stats.js';

export const GRADES = [
  { g: 'S', min: 90, box: 'g', title: 'Semaine légendaire !', color: '#f59e0b' },
  { g: 'A', min: 75, box: 'c', title: 'Excellente semaine !', color: '#a855f7' },
  { g: 'B', min: 60, box: 'p', title: 'Bonne semaine', color: '#3b82f6' },
  { g: 'C', min: 45, box: null, title: 'Semaine correcte', color: '#22c55e' },
  { g: 'D', min: 0, box: null, title: 'Semaine difficile', color: '#94a3b8' },
];
export const gradeOf = pct => GRADES.find(x => pct >= x.min);
// Le bilan s'ouvre le dimanche à 18 h (la note peut encore monter jusqu'à minuit)
export const RECAP_HOUR = 18;
export function recapReady(ws, now = new Date()) {
  const sun = addDays(ws, 6);
  sun.setHours(RECAP_HOUR, 0, 0, 0);
  return now >= sun;
}
export const weekDays = ws => Array.from({ length: 7 }, (_, i) => key(addDays(ws, i)));
export const weekXP = (ws, dayXP) => weekDays(ws).reduce((a, k) => a + (dayXP[k] || 0), 0);

// Semaines dont le bilan est ouvert depuis le début des bilans (pour les box gagnées)
export function recapWeeks(since, now = new Date()) {
  const out = [];
  if (!since) return out;
  for (let ws = weekStart(parseKey(since)); recapReady(ws, now); ws = addDays(ws, 7)) {
    if (key(addDays(ws, 6)) >= since) out.push(ws);
  }
  return out;
}

// Tout ce que montre l'écran de bilan
export function weekRecap(ws, g) {
  const days = weekDays(ws), doms = activeDomains();
  const sc = periodScore(ws, addDays(ws, 6)), prev = periodScore(addDays(ws, -7), addDays(ws, -1));
  const grade = gradeOf(sc.pct);
  const perDom = doms.map(d => ({ d, n: days.filter(k => isDone(k, d.id)).length })).sort((a, b) => b.n - a.n);
  const moods = days.map(k => S.days[k] && S.days[k].mood).filter(Boolean);
  const xp = weekXP(ws, g.dayXP);
  // Record : la meilleure semaine d'avant
  let bestPrev = 0;
  const first = Object.keys(S.days).sort()[0];
  if (first) for (let w = weekStart(parseKey(first)); w < ws; w = addDays(w, 7)) bestPrev = Math.max(bestPrev, weekXP(w, g.dayXP));
  const we = key(addDays(ws, 6));
  const bosses = g.boss.history.filter(b => b.endDay >= days[0] && b.endDay <= we);
  return {
    ws, days, pct: sc.pct, done: sc.done, max: sc.max, prevPct: prev.pct, grade, xp, record: bestPrev > 0 && xp > bestPrev,
    perfect: days.filter(isPerfect).length, best: perDom[0] && perDom[0].n ? perDom[0] : null,
    mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0, bosses,
    next: GRADES.slice().reverse().find(x => x.min > sc.pct),
  };
}

// Records : meilleure journée, meilleure semaine, plus longues séries, plus gros total d'argent
export function records(g) {
  const keys = Object.keys(g.dayXP).sort();
  let day = { v: 0, k: '' }, week = { v: 0, k: '' }, cases = { v: 0, k: '' };
  for (const k of keys) if (g.dayXP[k] > day.v) day = { v: g.dayXP[k], k };
  if (keys.length) for (let ws = weekStart(parseKey(keys[0])); ws <= today(); ws = addDays(ws, 7)) {
    const v = weekXP(ws, g.dayXP);
    if (v > week.v) week = { v, k: key(ws) };
  }
  for (const [k, d] of Object.entries(S.days)) { const n = d.c ? Object.keys(d.c).length : 0; if (n > cases.v) cases = { v: n, k }; }
  const money = g.money.reduce((a, [k, v]) => (v > a.v ? { v, k } : a), { v: 0, k: '' });
  return { day, week, cases, money };
}
