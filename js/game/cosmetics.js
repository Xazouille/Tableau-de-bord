// Thèmes de couleur, cadres du médaillon et titres : débloqués par les niveaux, albums, badges, boss et la maîtrise.
import { S } from '../store.js';
import { G, badgeDefs, LEVEL_TITLES } from './rules.js';
import { RANKS } from './mastery.js';
import { ALBUMS } from './albums.js';
import { UIS, applyUI } from '../looks.js';

// Thèmes complets (définis dans looks.js) : 3 dès le départ, les autres à débloquer
const LOOK_NEED = { ocean: { level: 5 }, saiyan: { level: 10 }, sakura: { level: 15 }, foret: { rank: 3 }, lave: { bosses: 5 }, akatsuki: { album: 'na-akatsuki' },
  gameboy: { badge: 'coll100' }, galaxie: { level: 25 }, glace: { badge: 'serie30' }, prisme: { shinies: 10 } };
export const LOOKS = UIS.map(u => ({ id: u.id, name: u.name, desc: u.desc, need: LOOK_NEED[u.id] || null }));

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
  // Identités « Je suis… » déjà atteintes
  for (const d of S.domains.list.filter(x => !x.archived)) {
    const id = g.identity[d.id];
    if (id) for (let i = 0; i < id.stage; i++) out.push({ id: `id-${d.id}-${i}`, name: id.names[i], need: { ident: [d.id, i] }, ok: true, how: `${d.name} : ${id.n} jours` });
  }
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

// Thème porté : appliqué à toute l'appli (avec la disposition choisie pour lui)
export function applyLook(theme) { applyUI(theme ? theme.id : 'neon'); }
