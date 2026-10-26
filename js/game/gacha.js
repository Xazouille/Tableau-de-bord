// Ouverture des box, échange de fragments et choix du compagnon.
import { S, save, touch } from '../store.js';
import { uid, todayKey, esc } from '../util.js';
import { G, FRAG, FRAG_PER_BOX } from './rules.js';
import { LINES, FORMS, SERIES, RARITY, linesByRarity } from './roster.js';

// Chances : 1★ 50 %, 2★ 28 %, 3★ 15 %, 4★ 6 %, 5★ 1 % ; un 4★ au moins toutes les 10 box, un 5★ toutes les 50
function rollRarity(since4, since5) {
  if (since5 >= 49) return 5;
  const x = Math.random() * 100;
  let r = x < 1 ? 5 : x < 7 ? 4 : x < 22 ? 3 : x < 50 ? 2 : 1;
  if (since4 >= 9 && r < 4) r = Math.random() < 1 / 7 ? 5 : 4;
  return r;
}

export function openBox() {
  const g = G();
  if (g.boxes <= 0) return null;
  let r = rollRarity(g.since4, g.since5), pool = linesByRarity(r);
  while (!pool.length && r > 1) pool = linesByRarity(--r);
  const line = pool[Math.floor(Math.random() * pool.length)];
  const isNew = !g.owned[line.id];
  S.game.pulls.push({ id: uid(), l: line.id, r, t: Date.now() });
  touch(S.game); save();
  return { line, form: FORMS[line.base], rarity: r, isNew, frag: isNew ? 0 : FRAG[r] || 0 };
}

export function tradeFragments() {
  if (G().frags < FRAG_PER_BOX) return false;
  S.game.trades.push({ id: uid(), t: Date.now() });
  touch(S.game); save();
  return true;
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
  return `<div class="card-g r${r} ${known ? '' : 'unknown'} ${opts.size || ''}" style="--rc:${RARITY[r].color}">
    <div class="cg-inner">
      <div class="cg-top"><span class="cg-series">${s.emoji}<span class="cg-sname"> ${esc(s.short)}</span></span><span class="cg-stars">${stars(r)}</span></div>
      <div class="cg-art">${f.img ? `<img src="${esc(f.img)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'cg-fallback',textContent:'${s.emoji}'}))">` : `<span class="cg-fallback">${s.emoji}</span>`}</div>
      <div class="cg-name">${known ? esc(f.name) : '???'}</div>
      ${opts.badge ? `<div class="cg-badge">${opts.badge}</div>` : ''}
    </div></div>`;
}
