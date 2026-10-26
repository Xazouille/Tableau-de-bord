// Maîtrise : chaque domaine a ses propres niveaux (1 à 100) et un rang tous les 10 niveaux.
// Un jour fait = 10 points (plus si tu y as passé du temps) ; il faut environ 3 ans de pratique pour le niveau 100.
export const MAX_LEVEL = 100;
// [nom, couleur, emblème]
export const RANKS = [
  ['Novice', '#94a3b8', '🌱'], ['Apprenti', '#22c55e', '🍀'], ['Initié', '#14b8a6', '💧'], ['Confirmé', '#3b82f6', '🔷'], ['Expert', '#6366f1', '💠'],
  ['Maître', '#a855f7', '🔮'], ['Grand maître', '#ec4899', '🌸'], ['Champion', '#f97316', '🔥'], ['Légende', '#f59e0b', '👑'], ['Mythe', '#ff3d97', '🌌'],
];
export const levelNeed = L => 20 + 4 * L;
export const rankOf = L => Math.min(RANKS.length - 1, Math.floor((L - 1) / 10));

function levelOfPoints(p) {
  let L = 1;
  while (L < MAX_LEVEL && p >= levelNeed(L)) { p -= levelNeed(L); L++; }
  return { level: L, into: L < MAX_LEVEL ? p : 0, need: L < MAX_LEVEL ? levelNeed(L) : 0 };
}
// Points d'une case cochée : 10 pour l'effort de base, jusqu'à 30 quand tu y passes beaucoup de temps
export const dayPoints = (xp, base) => Math.max(5, Math.min(30, Math.round(10 * xp / (Number(base) || 10))));

// Rejoue l'historique : niveau de chaque domaine et dates des nouveaux rangs
export function runMastery(doms, dayKeys, caseXPs) {
  const st = {};
  for (const d of doms) st[d.id] = { id: d.id, points: 0, days: 0, rank: 0, rankUps: [] };
  for (const k of dayKeys) {
    const per = caseXPs[k] || {};
    for (const d of doms) {
      if (per[d.id] === undefined) continue;
      const s = st[d.id];
      s.points += dayPoints(per[d.id], d.xp); s.days++;
      const r = rankOf(levelOfPoints(s.points).level);
      if (r > s.rank) { for (let x = s.rank + 1; x <= r; x++) s.rankUps.push({ rank: x, day: k }); s.rank = r; }
    }
  }
  for (const s of Object.values(st)) Object.assign(s, levelOfPoints(s.points));
  return st;
}
