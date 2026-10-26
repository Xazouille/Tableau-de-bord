// Ouverture des box (petite, classique, grande), échange de fragments et choix du compagnon.
import { S, save, touch } from '../store.js';
import { uid, todayKey, esc } from '../util.js';
import { G, FRAG } from './rules.js';
import { LINES, FORMS, SERIES, RARITY, linesByRarity, bigCard } from './roster.js';
import { TIERS, PITY4, PITY5 } from './tiers.js';

function roll(odds) {
  let x = Math.random() * 100;
  for (let r = 1; r <= 5; r++) { x -= odds[r - 1]; if (x < 0) return r; }
  return 1;
}

// Ouvre une box du type k : tire ses cartes, les enregistre et les renvoie de la moins rare à la plus rare
export function openBox(k) {
  const g = G(), T = TIERS[k];
  if (!T || !(g.boxes[k] > 0)) return null;
  let since4 = g.since4, since5 = g.since5;
  const rs = [];
  for (let i = 0; i < T.cards; i++) {
    let r = roll(T.odds);
    if (T.pity) {
      if (since5 + 1 >= PITY5) r = 5;
      else if (since4 + 1 >= PITY4 && r < 4) r = 4;
      since4 = r >= 4 ? 0 : since4 + 1;
      since5 = r >= 5 ? 0 : since5 + 1;
    }
    rs.push(r);
  }
  // Rareté minimale garantie dans chaque box (2★ pour une classique, 3★ pour une grande)
  if (Math.max(...rs) < T.min) rs[rs.length - 1] = T.min;
  rs.sort((a, b) => a - b);
  const box = uid(), now = Date.now(), seen = new Set(Object.keys(g.owned)), out = [];
  rs.forEach((r0, i) => {
    let r = r0, pool = linesByRarity(r);
    while (!pool.length && r > 1) pool = linesByRarity(--r);
    const line = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !seen.has(line.id);
    seen.add(line.id);
    S.game.pulls.push({ id: uid(), b: box, k, l: line.id, r, t: now + i });
    out.push({ line, form: FORMS[line.base], rarity: r, isNew, frag: isNew ? 0 : FRAG[r] || 0 });
  });
  touch(S.game); save();
  return out;
}

// Boutique : des fragments contre une box
export function tradeFragments(k) {
  const T = TIERS[k];
  if (!T || G().frags < T.cost) return false;
  S.game.trades.push({ id: uid(), k, t: Date.now() });
  touch(S.game); save();
  return true;
}

// Coffre dessiné en CSS, aux couleurs de son type ; les fissures apparaissent pendant l'invocation
export function chestHTML(k, cls = '') {
  return `<span class="chest t-${k} ${cls}" aria-hidden="true">
    <span class="ch-glow"></span>
    <span class="ch-body"><span class="ch-band"></span><span class="ch-lock"></span></span>
    <span class="ch-lid"><span class="ch-band"></span></span>
    ${k === 'g' ? '<span class="ch-gems"><i></i><i></i><i></i></span>' : ''}
    ${cls === 'big' ? '<svg class="ch-cracks" viewBox="0 0 100 100"><path class="ck ck1" pathLength="100" d="M50 34 44 48 53 57 46 74"/><path class="ck ck2" pathLength="100" d="M26 50 35 60 29 72M74 50 66 61 72 74"/><path class="ck ck3" pathLength="100" d="M14 66 26 72 21 88M86 66 74 74 80 90M50 78 56 94"/></svg>' : ''}
  </span>`;
}

export function setCompanion(lineId) {
  if (!G().owned[lineId]) return;
  S.game.comp.push({ id: uid(), line: lineId, from: todayKey(), t: Date.now() });
  touch(S.game); save();
}

export const stars = n => '★'.repeat(n);

// Carte à collectionner : cadre aux couleurs de la rareté, image, nom, étoiles
export function cardHTML(formId, opts = {}) {
  const f = FORMS[formId];
  if (!f) return '';
  const L = LINES[f.line], r = L.rarity, s = SERIES[f.series];
  const known = opts.known !== false;
  // Pokémon obtenu : la vraie carte du jeu
  if (known && f.card) {
    return `<div class="card-g tcg r${r} ${opts.size || ''}" style="--rc:${RARITY[r].color}"><div class="cg-inner">
      <img class="tcg-img" src="${esc(opts.big ? bigCard(f.card) : f.card)}" alt="${esc(f.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-art="${esc(f.img)}" onerror="this.onerror=null;this.className='tcg-img art';this.src=this.dataset.art">
      <span class="tcg-fallback">${esc(f.name)}</span><span class="tcg-stars">${stars(r)}</span>${opts.badge ? `<div class="cg-badge">${opts.badge}</div>` : ''}</div></div>`;
  }
  return `<div class="card-g r${r} ${known ? '' : 'unknown'} ${opts.size || ''}" style="--rc:${RARITY[r].color}">
    <div class="cg-inner">
      <div class="cg-top"><span class="cg-series">${s.emoji}<span class="cg-sname"> ${esc(s.short)}</span></span><span class="cg-stars">${stars(r)}</span></div>
      <div class="cg-art ${f.small ? 'small' : ''}">${f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'cg-fallback',textContent:'${s.emoji}'}))">` : `<span class="cg-fallback">${s.emoji}</span>`}</div>
      <div class="cg-name">${known ? esc(f.name) : '???'}${known && f.saga && opts.size !== 'sm' ? `<small>${esc(f.saga)}</small>` : ''}</div>
      ${opts.badge ? `<div class="cg-badge">${opts.badge}</div>` : ''}
    </div></div>`;
}
