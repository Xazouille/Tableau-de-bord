// Thèmes de couleur, cadres du médaillon et titres : débloqués par les niveaux, albums, badges, boss et la maîtrise.
import { S } from '../store.js';
import { G, badgeDefs, LEVEL_TITLES } from './rules.js';
import { RANKS } from './mastery.js';
import { ALBUMS } from './albums.js';

// [id, nom, 4 couleurs du dégradé, condition]
export const LOOKS = [
  ['neon', 'Néon', ['#7c5cff', '#c34dff', '#ff4fa3', '#ff9a3d'], null],
  ['ocean', 'Océan', ['#0ea5e9', '#14b8a6', '#6366f1', '#22d3ee'], { level: 5 }],
  ['saiyan', 'Super Saiyan', ['#f59e0b', '#facc15', '#f97316', '#fde047'], { level: 10 }],
  ['sakura', 'Sakura', ['#ec4899', '#f472b6', '#e879f9', '#fb7185'], { level: 15 }],
  ['foret', 'Forêt', ['#16a34a', '#22c55e', '#84cc16', '#14b8a6'], { rank: 3 }],
  ['lave', 'Lave', ['#dc2626', '#f97316', '#ef4444', '#fbbf24'], { bosses: 5 }],
  ['akatsuki', 'Akatsuki', ['#b91c1c', '#ef4444', '#7f1d1d', '#f87171'], { album: 'na-akatsuki' }],
  ['galaxie', 'Galaxie', ['#4f46e5', '#8b5cf6', '#06b6d4', '#a855f7'], { level: 25 }],
  ['glace', 'Glace', ['#0284c7', '#38bdf8', '#818cf8', '#67e8f9'], { badge: 'serie30' }],
  ['prisme', 'Prisme', ['#ff4fa3', '#f59e0b', '#22c55e', '#3b82f6'], { shinies: 10 }],
].map(([id, name, colors, need]) => ({ id, name, colors, need }));

export const FRAMES = [
  ['simple', 'Simple', null], ['eclair', 'Éclairs', { level: 8 }], ['feu', 'Flammes', { badge: 'serie7' }], ['givre', 'Givre', { badge: 'serie14' }],
  ['or', 'Or', { badge: 'parfait10' }], ['boss', 'Chasseur', { bosses: 3 }], ['sakura', 'Pétales', { albums: 3 }], ['arc', 'Arc-en-ciel', { maxRarity: 5 }],
  ['eveil', 'Éveil', { fusions: 1 }], ['cosmos', 'Cosmos', { rank: 5 }],
].map(([id, name, need]) => ({ id, name, need }));

// Ce qui sert à savoir ce qui est débloqué
export function unlockCtx(g = G()) {
  const won = g.boss.history.filter(b => b.won);
  let maxRarity = 0;
  for (const l of Object.keys(g.owned)) maxRarity = Math.max(maxRarity, g.rarityOf(l));
  return {
    level: g.lvl.level, rank: Math.max(0, ...Object.values(g.mastery).map(m => m.rank)),
    bosses: won.length, legends: won.filter(b => b.legendary).length,
    albumsDone: new Set(g.albums.filter(a => a.done).map(a => a.id)), shinies: g.shinies, maxRarity, fusions: g.fusionCount,
  };
}
export function isUnlocked(need, c) {
  if (!need) return true;
  if (need.level) return c.level >= need.level;
  if (need.rank) return c.rank >= need.rank;
  if (need.bosses) return c.bosses >= need.bosses;
  if (need.legends) return c.legends >= need.legends;
  if (need.album) return c.albumsDone.has(need.album);
  if (need.albums) return c.albumsDone.size >= need.albums;
  if (need.badge) return !!S.game.badges[need.badge];
  if (need.shinies) return c.shinies >= need.shinies;
  if (need.maxRarity) return c.maxRarity >= need.maxRarity;
  if (need.fusions) return c.fusions >= need.fusions;
  return false;
}
export function howTo(need) {
  if (!need) return 'Disponible';
  if (need.level) return `Niveau ${need.level}`;
  if (need.rank) return `Rang ${RANKS[need.rank][0]} dans un domaine`;
  if (need.bosses) return `Battre ${need.bosses} boss`;
  if (need.legends) return `Battre ${need.legends} boss légendaires`;
  if (need.album) { const a = ALBUMS.find(x => x.id === need.album); return `Album « ${a ? a.name : need.album} »`; }
  if (need.albums) return `Compléter ${need.albums} albums`;
  if (need.badge) { const b = badgeDefs().find(x => x.id === need.badge); return `Badge « ${b ? b.name : need.badge} »`; }
  if (need.shinies) return `${need.shinies} cartes brillantes`;
  if (need.maxRarity) return 'Obtenir une carte 5★';
  if (need.fusions) return 'Faire une fusion';
  return '';
}

// Tous les titres possibles : niveaux, albums, maîtrise, boss, collection
export function titleList(g = G()) {
  const c = unlockCtx(g), out = [];
  for (const [lv, name] of LEVEL_TITLES) out.push({ id: 'lv' + lv, name, need: { level: lv } });
  for (const a of ALBUMS) out.push({ id: 'al-' + a.id, name: a.title, need: { album: a.id } });
  out.push({ id: 'bo5', name: 'Chasseur de boss', need: { bosses: 5 } }, { id: 'bo25', name: 'Fléau des méchants', need: { bosses: 25 } },
    { id: 'lg3', name: 'Tueur de légendes', need: { legends: 3 } }, { id: 'sh10', name: 'Collectionneur brillant', need: { shinies: 10 } },
    { id: 'fu5', name: 'Alchimiste', need: { fusions: 5 } });
  for (const d of S.domains.list.filter(x => !x.archived)) {
    const m = g.mastery[d.id];
    for (const r of [3, 5, 7, 8, 9]) out.push({ id: `ms-${d.id}-${r}`, name: `${RANKS[r][0]} en ${d.name}`, need: { domRank: [d.id, r] }, ok: !!m && m.rank >= r, how: `${d.name} : rang ${RANKS[r][0]} (niv. ${r * 10 + 1})` });
  }
  return out.map(t => ({ ...t, ok: t.ok ?? isUnlocked(t.need, c), how: t.how || howTo(t.need) }));
}

const look = () => S.settings.look || {};
// Ce qui est porté en ce moment (un élément verrouillé revient à celui de base)
export function worn(g = G()) {
  const c = unlockCtx(g), L = look();
  const theme = LOOKS.find(x => x.id === L.theme && isUnlocked(x.need, c)) || LOOKS[0];
  const frame = FRAMES.find(x => x.id === L.frame && isUnlocked(x.need, c)) || FRAMES[0];
  const t = L.title && titleList(g).find(x => x.id === L.title && x.ok);
  return { theme, frame, title: t ? t.name : g.title };
}

// Couleurs du thème porté, appliquées à toute l'appli
export function applyLook(theme) {
  const st = document.documentElement.style;
  const props = ['--accent', '--accent2', '--grad', '--bg-a', '--bg-b', '--lv-bg'];
  if (!theme || theme.id === 'neon') { props.forEach(p => st.removeProperty(p)); return; }
  const [a, b, c, d] = theme.colors;
  st.setProperty('--accent', `color-mix(in oklab,${a} 82%,var(--text))`);
  st.setProperty('--accent2', `color-mix(in oklab,${c} 85%,var(--text))`);
  st.setProperty('--grad', `linear-gradient(135deg,${a} 0%,${b} 45%,${c} 75%,${d} 100%)`);
  st.setProperty('--bg-a', `color-mix(in oklab,${a} 26%,var(--bg))`);
  st.setProperty('--bg-b', `color-mix(in oklab,${c} 20%,var(--bg))`);
  st.setProperty('--lv-bg', `linear-gradient(135deg,color-mix(in oklab,${a} 40%,#120a2a) 0%,color-mix(in oklab,${b} 38%,#1a0b30) 55%,color-mix(in oklab,${c} 45%,#2a0b30) 100%)`);
}
