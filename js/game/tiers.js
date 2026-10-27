// Les trois types de box : nombre de cartes, chances par rareté (1★ → 5★), coût en fragments, comment les gagner.
export const TIERS = {
  p: { key: 'p', name: 'Petite box', many: 'petites box', cards: 1, odds: [62, 28, 9, 1, 0], min: 1, pity: false, cost: 15, color: '#38bdf8',
    how: ['5 cases cochées dans la journée', 'Défi facile de la semaine'] },
  c: { key: 'c', name: 'Box classique', many: 'box classiques', cards: 3, odds: [50, 28, 15, 6, 1], min: 2, pity: true, cost: 50, color: '#a855f7',
    how: ['Journée parfaite (12 cases sur 15)', 'Défi moyen de la semaine', 'Niveaux 5, 15, 25… : en bonus'] },
  g: { key: 'g', name: 'Grande box', many: 'grandes box', cards: 5, odds: [30, 32, 24, 10, 4], min: 3, pity: true, cost: 120, color: '#f59e0b',
    how: ['Chaque niveau gagné', 'Défi difficile de la semaine', 'Niveaux 10, 20, 30… : une deuxième', 'Certains badges'] },
};
export const TIER_KEYS = ['p', 'c', 'g'];
// Garanties (box classiques et grandes) : un 4★ au moins toutes les 15 cartes, un 5★ toutes les 80
export const PITY4 = 15, PITY5 = 80;
// Les box d'avant (3 cartes) comptent comme des box classiques
export const kindOf = p => (p && TIERS[p.k] ? p.k : 'c');
// Petite box à 5 cases cochées dans la journée (un peu moins si tu as peu de domaines)
export const smallAt = n => Math.min(5, Math.max(1, n - 1));
// Récompense d'un niveau : une grande box, plus une box classique tous les 5 niveaux ou une 2e grande tous les 10
export const levelRewards = L => (L <= 1 ? ['g'] : L % 10 === 0 ? ['g', 'g'] : L % 5 === 0 ? ['g', 'c'] : ['g']);

export function countLabel(n, k) {
  const t = TIERS[k];
  return `${n} ${n > 1 ? t.many : t.name.toLowerCase()}`;
}
