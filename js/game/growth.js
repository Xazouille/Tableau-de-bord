// Compétences (notées sur 5 par toi), habitudes à arrêter et bilans du mois.
// L'XP des étoiles n'est débloquée qu'avec assez de séances : se donner 5★ sans pratiquer ne rapporte rien.
import { S, isDone, valOf } from '../store.js';
import { key, parseKey, today, addDays, dayDiff, todayKey } from '../util.js';

/* ---------- Compétences ---------- */
export const SKILL_DOM = 'competence';
export const NEW_SKILL_XP = 30;
// Étoile → [séances nécessaires, XP, box]
export const STAR_RULES = { 2: [3, 50, null], 3: [10, 100, 'p'], 4: [25, 200, 'c'], 5: [50, 400, 'g'] };
export const STAR_NAMES = ['', 'Débutant', 'Bases', 'À l’aise', 'Avancé', 'Expert'];

// Séances de chaque compétence (jours où la case Compétence est cochée avec elle)
export function skillSessions(dayKeys) {
  const out = {};
  for (const k of dayKeys) {
    if (!isDone(k, SKILL_DOM)) continue;
    const v = valOf(k, SKILL_DOM);
    if (v && v.s) (out[v.s] = out[v.s] || []).push(k);
  }
  return out;
}
export function skillState(dayKeys) {
  const ses = skillSessions(dayKeys), list = [];
  let xp = 0;
  const boxes = { p: 0, c: 0, g: 0 };
  for (const sk of S.skills) {
    const days = ses[sk.id] || [], n = days.length, stars = Math.max(1, Math.min(5, sk.stars || 1));
    let gotXP = 0, validated = 1;
    if (n) gotXP += NEW_SKILL_XP;
    for (let s = 2; s <= stars; s++) {
      const [need, x, box] = STAR_RULES[s];
      if (n < need) break;
      validated = s; gotXP += x;
      if (box) boxes[box]++;
    }
    // Prochaine étoile : celle que tu t'es donnée mais pas encore validée, sinon la suivante
    const next = validated < 5 ? validated + 1 : null;
    xp += gotXP;
    list.push({ ...sk, stars, sessions: n, last: days[days.length - 1] || '', validated, xp: gotXP, next, nextNeed: next ? STAR_RULES[next][0] : 0 });
  }
  return { list, xp, boxes };
}

/* ---------- Habitudes à arrêter ---------- */
// Paliers : [jours, XP, box]
export const HABIT_STEPS = [[1, 20, null], [3, 30, null], [7, 50, 'p'], [14, 80, 'p'], [30, 150, 'c'], [60, 250, 'c'], [90, 400, 'g'], [180, 600, 'g'], [365, 1000, 'g']];
export function habitState() {
  const t = todayKey(), list = [];
  let xp = 0;
  const boxes = { p: 0, c: 0, g: 0 };
  for (const h of S.habits) {
    const resets = [...new Set(h.resets || [])].filter(k => k >= h.start).sort();
    // Une série = du départ (ou du lendemain d'une rechute) jusqu'à la rechute suivante (ou aujourd'hui)
    let from = h.start, best = 0;
    for (const r of resets) { best = Math.max(best, dayDiff(from, r)); from = key(addDays(parseKey(r), 1)); }
    const cur = from <= t ? dayDiff(from, t) : 0;
    best = Math.max(best, cur);
    let gotXP = 0;
    for (const [d, x, box] of HABIT_STEPS) if (best >= d) { gotXP += x; if (box) boxes[box]++; }
    xp += gotXP;
    const next = HABIT_STEPS.find(([d]) => d > cur);
    list.push({ ...h, cur, best, relapses: resets.length, fellToday: resets.includes(t), next, xp: gotXP });
  }
  return { list, xp, boxes };
}

/* ---------- Bilans du mois ---------- */
export const REVIEW_XP = 100;
export const monthKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
export const prevMonth = (d = today()) => new Date(d.getFullYear(), d.getMonth() - 1, 1);
// « Pour toi ou pour le jeu ? » : vérifier que la motivation reste la tienne
export const WHY = { moi: '💚 Pour moi', deux: '⚖️ Un peu des deux', jeu: '🎮 Surtout pour le jeu' };
export const reviewDone = r => !!(r && ['good', 'bad', 'focus'].every(q => (r[q] || '').trim().length >= 3));
// Focus choisi au dernier bilan (pour le mois en cours)
export function currentFocus() {
  const r = S.reviews[monthKey(prevMonth())];
  return reviewDone(r) ? r.focus.trim() : '';
}
export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const monthName = mk => { const [y, m] = mk.split('-').map(Number); return `${MONTHS_FR[m - 1]} ${y}`; };
