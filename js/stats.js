// Calculs : séries 🔥, scores du jour / de la semaine / du mois, calendrier.
import { S, isDone, activeDomains } from './store.js';
import { key, parseKey, today, addDays, weekStart } from './util.js';

export const dayCount = k => activeDomains().filter(d => isDone(k, d.id)).length;
export const dayRatio = k => { const n = activeDomains().length; return n ? dayCount(k) / n : 0; };
export const isPerfect = k => { const n = activeDomains().length; return n > 0 && dayCount(k) === n; };
// Jour sauvé par un joker (module de jeu)
export const isJoker = k => !!(S.game.jokerDays && S.game.jokerDays[k]);
// Journée « réussie » : assez de cases cochées pour faire vivre la série globale
export const isGoodDay = k => isJoker(k) || dayRatio(k) >= (S.settings.threshold || 0.5) - 1e-9;

// Série en cours : jours consécutifs jusqu'à aujourd'hui (ou hier si aujourd'hui n'est pas encore fait)
function streakOf(test) {
  let d = today(), n = 0;
  const alive = test(key(d));
  if (!alive) d = addDays(d, -1);
  while (test(key(d))) { n++; d = addDays(d, -1); }
  return { n, today: alive };
}
function bestOf(test) {
  const keys = Object.keys(S.days).sort();
  if (!keys.length) return 0;
  let best = 0, cur = 0;
  for (let d = parseKey(keys[0]), end = today(); d <= end; d = addDays(d, 1)) {
    if (test(key(d))) { cur++; if (cur > best) best = cur; } else cur = 0;
  }
  return best;
}
export const domainStreak = id => streakOf(k => isDone(k, id));
export const domainBest = id => bestOf(k => isDone(k, id));
export const globalStreak = () => streakOf(isGoodDay);
export const globalBest = () => bestOf(isGoodDay);

// Score d'une période (du jour start au jour end inclus, sans dépasser aujourd'hui)
export function periodScore(start, end) {
  const n = activeDomains().length, t = today();
  if (end > t) end = t;
  let days = 0, done = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) { days++; done += dayCount(key(d)); }
  return { done, max: days * n, pct: days && n ? Math.round(done / (days * n) * 100) : 0 };
}
export const weekScore = (d = today()) => periodScore(weekStart(d), addDays(weekStart(d), 6));
export const monthScore = (d = today()) => periodScore(new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0));

// Part des jours où un domaine a été fait sur les n derniers jours
export function domainRate(id, n = 30) {
  let c = 0;
  for (let i = 0; i < n; i++) if (isDone(key(addDays(today(), -i)), id)) c++;
  return Math.round(c / n * 100);
}
export function totalChecks() {
  let c = 0;
  for (const d of Object.values(S.days)) c += d.c ? Object.keys(d.c).length : 0;
  return c;
}
