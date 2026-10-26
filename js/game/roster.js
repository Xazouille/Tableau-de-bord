// Toutes les cartes du jeu : séries, familles (lignes d'évolution) et formes.
import { PK_NAMES, PK_EVO, PK_LINES, PK_TCG } from './pokemon-data.js';
import { ANIME } from './anime-data.js';

export const SERIES = {
  pokemon: { name: 'Pokémon', short: 'Pokémon', color: '#f5b700', emoji: '⚡' },
};
export const RARITY = {
  1: { name: 'Commune', color: '#94a3b8' },
  2: { name: 'Peu commune', color: '#22c55e' },
  3: { name: 'Rare', color: '#3b82f6' },
  4: { name: 'Épique', color: '#a855f7' },
  5: { name: 'Légendaire', color: '#f59e0b' },
};

// FORMS[id] = { id, name, series, img, next: [ids], line, depth, num }
export const FORMS = {};
// LINES[id] = { id, series, rarity, base, forms: [ids], depth (nombre d'évolutions possibles) }
export const LINES = {};

const pkImg = n => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${n}.png`;
const pkCard = n => { const c = PK_TCG[n] || ''; return c.startsWith('1:') ? 'https://images.pokemontcg.io/' + c.slice(2) : c.startsWith('2:') ? 'https://images.scrydex.com/pokemon/' + c.slice(2) : c; };
// Version grand format d'une carte (ouverture de box, fiche)
export const bigCard = u => u.replace(/(images\.pokemontcg\.io\/.+)\.png$/, '$1_hires.png').replace(/\/small$/, '/large');
for (const [base, rarity] of PK_LINES) {
  const id = 'pk' + base, forms = [];
  let depth = 0;
  const walk = (n, d) => {
    const fid = 'pk' + n;
    FORMS[fid] = { id: fid, name: PK_NAMES[n], series: 'pokemon', img: pkImg(n), card: pkCard(n), next: (PK_EVO[n] || []).map(x => 'pk' + x), line: id, depth: d, num: n };
    forms.push(fid);
    depth = Math.max(depth, d);
    for (const c of PK_EVO[n] || []) walk(c, d + 1);
  };
  walk(base, 0);
  LINES[id] = { id, series: 'pokemon', rarity, base: id, forms, depth };
}

// Ajoute les familles d'une autre série (Dragon Ball, Naruto, One Piece…)
export function addSeries(key, info, lines) {
  SERIES[key] = info;
  for (const l of lines) {
    const id = l.forms[0].id;
    l.forms.forEach((f, i) => {
      FORMS[f.id] = { id: f.id, name: f.name, series: key, img: f.img || '', small: !!f.small, next: f.next || (l.forms[i + 1] ? [l.forms[i + 1].id] : []), line: id, depth: f.depth ?? i, saga: f.saga || '' };
    });
    LINES[id] = { id, series: key, rarity: l.rarity, base: id, forms: l.forms.map(f => f.id), depth: Math.max(...l.forms.map((f, i) => f.depth ?? i)) };
  }
}

export const linesByRarity = r => Object.values(LINES).filter(l => l.rarity === r);
export const allForms = () => Object.values(FORMS);

for (const s of ANIME) addSeries(s.key, s.info, s.lines);
