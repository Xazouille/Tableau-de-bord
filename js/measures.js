// Détail de ce qui a été fait pour chaque domaine (temps, quantité, liste, montant)
// et l'XP qui en découle.

// Chaque option : [libellé, multiplicateur d'XP, minutes (pour le minuteur)]
const TIME = [['15 min', 1, 15], ['30 min', 1.5, 30], ['1 h', 2, 60], ['2 h et +', 3, 120]];
export const PRESETS = {
  ecole: { kind: 'levels', q: 'Combien de temps de révision ?', opts: TIME },
  echecs: { kind: 'levels', q: 'Qu’as-tu fait ?', opts: [['Quelques puzzles', 1, 15], ['1 partie ou 15 puzzles', 1.5, 30], ['1 h d’entraînement', 2, 60], ['2 h et +', 3, 120]] },
  sport: { kind: 'levels', q: 'Combien de temps de sport ?', opts: TIME },
  argent: { kind: 'money', q: 'Total de tous mes comptes' },
  culture: { kind: 'levels', q: 'Qu’as-tu lu ou regardé ?', opts: [['10-20 pages ou 1 épisode', 1, 20], ['30-50 pages ou un film', 1.5, 45], ['1 h et +', 2, 60], ['2 h et +', 3, 120]] },
  alim: { kind: 'list', q: 'Qu’as-tu réussi aujourd’hui ?', items: ['Pas de soda', 'Pas de boisson sucrée', 'Manger un fruit', 'Un aliment pour prendre du poids'] },
  medit: { kind: 'levels', q: 'Combien de temps de méditation ?', opts: [['5 min', 1, 5], ['10 min', 1.5, 10], ['20 min', 2, 20], ['30 min et +', 3, 30]] },
  sommeil: { kind: 'levels', q: 'Combien d’heures as-tu dormi ?', opts: [['Moins de 6 h', 0.5], ['6 h – 7 h', 1], ['7 h – 8 h', 1.5], ['8 h et +', 2]] },
  ecran: { kind: 'levels', q: 'Ton temps d’écran aujourd’hui ?', opts: [['1 h 30 – 2 h', 1], ['1 h – 1 h 30', 2], ['30 min – 1 h', 2.5], ['Moins de 30 min', 3]] },
  scroll: { kind: 'none' },
  pas: { kind: 'levels', q: 'Combien de pas aujourd’hui ?', opts: [['5 000 pas', 1], ['8 000 pas', 1.5], ['10 000 pas', 2], ['15 000 pas et +', 3]] },
  journal: { kind: 'none' },
  competence: { kind: 'skill', q: 'Quelle compétence as-tu travaillée ?', opts: TIME },
  rangement: { kind: 'levels', q: 'Qu’as-tu fait ?', opts: [['Balai ou poussière', 1], ['Balai et poussière', 1.5], ['Balai, poussière et serpillère', 2], ['Tout laver', 3]] },
  hygiene: { kind: 'list', q: 'Qu’as-tu fait aujourd’hui ?', items: ['Me raser', 'Mettre de la crème', 'Me laver le visage', 'Fil dentaire'] },
};
export const TIME_MEASURE = { kind: 'levels', q: 'Combien de temps ?', opts: TIME };
export const DEFAULT_XP = { ecole: 10, echecs: 10, sport: 20, argent: 10, culture: 15, alim: 10, medit: 30, sommeil: 10, ecran: 20, scroll: 20, pas: 15, journal: 15, competence: 20, rangement: 15, hygiene: 10 };

// Index de l'option « 7 h – 8 h » : à partir de là, la nuit compte comme assez longue
export const SLEEP_OK_FROM = 2;
// Bonus d'XP quand le total des comptes augmente : 1 XP par tranche de 10 €, 50 au maximum
export const moneyBonus = diff => diff > 0 ? Math.min(50, Math.floor(diff / 10)) : 0;

export const fmtMoney = n => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' €';

// XP d'une case cochée selon le détail saisi (prevMoney : dernier total connu avant ce jour)
export function caseXP(d, v, prevMoney) {
  const base = Number(d.xp) || 0, m = d.m || { kind: 'none' };
  if (m.kind === 'levels') {
    const o = v != null && m.opts[v];
    return Math.round(base * (o ? o[1] : 1));
  }
  // Compétence : { s: id de la compétence, v: temps passé }
  if (m.kind === 'skill') {
    const o = v && v.v != null && m.opts[v.v];
    return Math.round(base * (o ? o[1] : 1));
  }
  if (m.kind === 'list') {
    const n = Array.isArray(v) ? v.length : 0, total = m.items.length;
    if (!n) return base;
    return Math.round(base * 0.5 * n + (n >= total ? base : 0));
  }
  if (m.kind === 'money') {
    return base + (typeof v === 'number' && typeof prevMoney === 'number' ? moneyBonus(v - prevMoney) : 0);
  }
  return base;
}

// Petit texte affiché sur la case (« 1 h », « 3/4 », « 12 450 € »)
export function caseLabel(d, v, skills = []) {
  const m = d.m || { kind: 'none' };
  if (v == null) return '';
  if (m.kind === 'skill') {
    const sk = v.s && skills.find(x => x.id === v.s), o = v.v != null && m.opts[v.v];
    return [sk ? `${sk.emoji || '🧠'} ${sk.name}` : '', o ? o[0] : ''].filter(Boolean).join(' · ');
  }
  if (m.kind === 'levels') return m.opts[v] ? m.opts[v][0] : '';
  if (m.kind === 'list') return Array.isArray(v) && v.length ? `${v.length}/${m.items.length}` : '';
  if (m.kind === 'money') return typeof v === 'number' ? fmtMoney(v) : '';
  return '';
}
