// Animation plein écran : ouverture d'une box (booster de 3 cartes), passage de niveau.
import { openBox, cardHTML, setCompanion } from './gacha.js';
import { G } from './rules.js';
import { RARITY } from './roster.js';
import { confetti, buzz } from '../fx.js';
import { ui, rerender } from '../ui.js';
import { esc } from '../util.js';

let layer = null;
export const overlayOpen = () => !!layer;
function show(html, cls = '') {
  close(false);
  layer = document.createElement('div');
  layer.className = 'overlay ' + cls;
  layer.innerHTML = html;
  document.body.appendChild(layer);
  document.body.classList.add('lock');
  requestAnimationFrame(() => layer && layer.classList.add('in'));
  layer.addEventListener('click', onClick);
  return layer;
}
function close(redraw = true) {
  if (!layer) return;
  const l = layer; layer = null;
  l.classList.remove('in');
  document.body.classList.remove('lock');
  setTimeout(() => l.remove(), 250);
  if (redraw) rerender();
}

let pack = null, idx = 0, busy = false;
function onClick(e) {
  const a = e.target.closest('[data-ov]');
  if (!a) return;
  const act = a.dataset.ov;
  if (act === 'close') close();
  else if (act === 'open') reveal();
  else if (act === 'next') showCard(idx + 1);
  else if (act === 'skip') summary();
  else if (act === 'again') startBox();
  else if (act === 'companion') { setCompanion(a.dataset.line); close(); ui.tab = 'game'; ui.gameTab = 'profil'; rerender(); }
  else if (act === 'collection') { close(); ui.tab = 'game'; ui.gameTab = 'collection'; rerender(); }
}

export function startBox() {
  if (G().boxes <= 0) return;
  show(`<div class="ov-box-stage">
      <p class="ov-hint">${G().boxes > 1 ? `${G().boxes} box à ouvrir` : 'Ta box est prête'}</p>
      <button class="gbox" data-ov="open" aria-label="Ouvrir la box"><span class="gbox-lid"></span><span class="gbox-body"></span><span class="gbox-ribbon"></span><span class="gbox-glow"></span></button>
      <p class="ov-tap">Touche la box pour l’ouvrir · 3 cartes</p>
      <button class="ov-x" data-ov="close" aria-label="Fermer">✕</button></div>`, 'box');
  busy = false;
}

function reveal() {
  if (busy || !layer) return;
  busy = true;
  pack = openBox();
  if (!pack) { close(); return; }
  const best = pack[pack.length - 1].rarity;
  const stage = layer.querySelector('.ov-box-stage');
  // La lueur annonce la meilleure carte du booster
  stage.style.setProperty('--rc', RARITY[best].color);
  stage.classList.add('shaking', 'r' + best);
  buzz([20, 40, 20, 40, 20]);
  const t = best >= 4 ? 1700 : 1100;
  setTimeout(() => { if (layer) { stage.classList.add('burst'); buzz(best >= 4 ? [60, 40, 120] : 30); } }, t);
  setTimeout(() => { busy = false; showCard(0); }, t + 350);
}

function showCard(i) {
  if (!layer || !pack) return;
  if (i >= pack.length) { summary(); return; }
  idx = i;
  const c = pack[i], color = RARITY[c.rarity].color, last = i === pack.length - 1;
  layer.innerHTML = `<div class="ov-result r${c.rarity} ${last ? 'last' : ''}" style="--rc:${color}">
    ${c.rarity >= 4 ? '<div class="ov-flash"></div>' : ''}<div class="ov-rays"></div>
    <p class="ov-count">Carte ${i + 1} / ${pack.length}</p>
    <p class="ov-rarity">${'★'.repeat(c.rarity)} ${RARITY[c.rarity].name}</p>
    <div class="ov-card" data-ov="next">${cardHTML(c.form.id, { size: 'xl', big: true })}</div>
    <p class="ov-msg">${c.isNew ? '<span class="new-tag">NOUVEAU !</span>' : `Doublon · <b>+${c.frag} 💎</b> fragments`}</p>
    <h2>${esc(c.form.name)}</h2>
    <div class="ov-actions">
      <button class="btn primary" data-ov="next">${last ? 'Voir mon booster' : 'Carte suivante ›'}</button>
      ${!last ? '<button class="btn ghost" data-ov="skip">Tout voir</button>' : ''}
    </div></div>`;
  if (c.rarity >= 4) { confetti(c.rarity === 5 ? 220 : 120); buzz([60, 40, 120]); }
  else buzz(15);
}

function summary() {
  if (!layer || !pack) return;
  const left = G().boxes, hasComp = !!G().companion;
  const best = pack[pack.length - 1];
  const newBest = [...pack].reverse().find(c => c.isNew);
  layer.innerHTML = `<div class="ov-result ov-summary" style="--rc:${RARITY[best.rarity].color}">
    <div class="ov-rays"></div>
    <p class="ov-rarity">Ton booster</p>
    <div class="ov-pack">${pack.map(c => `<div class="ov-mini">${cardHTML(c.form.id, { size: 'sm' })}<span class="${c.isNew ? 'new-tag sm' : 'dup-tag'}">${c.isNew ? 'NOUVEAU' : `+${c.frag} 💎`}</span></div>`).join('')}</div>
    <div class="ov-actions">
      ${newBest && !hasComp ? `<button class="btn primary" data-ov="companion" data-line="${newBest.line.id}">🐾 Choisir ${esc(newBest.form.name)} comme compagnon</button>` : ''}
      ${left > 0 ? `<button class="btn primary" data-ov="again">🎁 Ouvrir la suivante (${left})</button>` : ''}
      <button class="btn" data-ov="collection">Voir ma collection</button>
      <button class="btn ghost" data-ov="close">Fermer</button>
    </div></div>`;
}

export function showLevelUp(level, title, gained = 1) {
  confetti(200); buzz([40, 60, 40, 60, 120]);
  show(`<div class="ov-level">
      <div class="ov-rays"></div>
      <p class="ov-rarity">Niveau supérieur !</p>
      <div class="lv-badge"><span>${level}</span></div>
      <h2>${esc(title)}</h2>
      <p class="ov-msg">${gained > 1 ? `+${gained} niveaux ! ` : ''}Tu gagnes <b>🎁 ${gained} box</b> à ouvrir.</p>
      <div class="ov-actions"><button class="btn primary" data-ov="again">Ouvrir ma box</button><button class="btn ghost" data-ov="close">Plus tard</button></div>
    </div>`, 'level');
}
