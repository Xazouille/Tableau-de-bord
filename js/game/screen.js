// Écran maîtrisé : un objectif de temps d'écran qui part de ton niveau réel et descend petit à petit.
// Chaque semaine réussie (case cochée au moins 5 jours sur 7), l'objectif baisse de 15 min, de 4 h jusqu'à 2 h.
// Les paliers suivent l'objectif : moins de X, de 3/4 de X, de X/2 et de X/4 (4 h → 3 h, 2 h, 1 h).
import { S, isDone } from '../store.js';
import { key, parseKey, addDays, weekStart, today } from '../util.js';

export const SCREEN_ID = 'ecran', SCREEN_START = 240, SCREEN_MIN = 120, SCREEN_STEP = 15, SCREEN_WEEK = 5;
// Multiplicateurs d'XP de la case (inchangés, pour que l'XP déjà gagnée ne bouge pas)
const MULT = [1, 2, 2.5, 3];

export const fmtMin = m => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h} h${r ? ` ${String(r).padStart(2, '0')}` : ''}` : `${r} min`; };
const dom = () => S.domains.list.find(d => d.id === SCREEN_ID);
export const isAdaptive = d => !!(d && d.id === SCREEN_ID && d.adapt);
const weekDone = ws => { let n = 0; for (let i = 0; i < 7; i++) if (isDone(key(addDays(ws, i)), SCREEN_ID)) n++; return n; };

// Objectif (en minutes) valable pendant la semaine qui contient le jour k
export function screenLimit(k = key(today())) {
  const d = dom();
  if (!isAdaptive(d)) return SCREEN_START;
  let lim = d.adapt.start || SCREEN_START;
  const end = weekStart(parseKey(k));
  for (let ws = weekStart(parseKey(d.adapt.from)); ws < end && lim > SCREEN_MIN; ws = addDays(ws, 7)) if (weekDone(ws) >= SCREEN_WEEK) lim = Math.max(SCREEN_MIN, lim - SCREEN_STEP);
  return lim;
}
// Paliers du jour k : [libellé, multiplicateur d'XP]
export const screenOpts = (k) => { const x = screenLimit(k); return [x, x * 0.75, x / 2, x / 4].map((m, i) => [`Moins de ${fmtMin(Math.round(m / 5) * 5)}`, MULT[i]]); };
// Où en est la semaine en cours
export function screenWeek() {
  const ws = weekStart(today()), done = weekDone(ws), lim = screenLimit();
  return { done, need: SCREEN_WEEK, limit: lim, next: Math.max(SCREEN_MIN, lim - SCREEN_STEP), atMin: lim <= SCREEN_MIN };
}
