// Animation plein écran : ouverture d'une box, passage de niveau.
import { openBox, cardHTML, setCompanion } from './gacha.js';
import { G } from './rules.js';
import { RARITY } from './roster.js';
import { confetti, buzz } from '../fx.js';
import { ui, rerender } from '../ui.js';
import { esc } from '../util.js';

let layer = null;
export const overlayOpen = () => !!layer;
function show(html, cls = '') {
  close();
  layer = document.createElement('div');
  layer.className = 'overlay ' + cls;
  layer.innerHTML = html;
  document.body.appendChild(layer);
  document.body.classList.add('lock');
  requestAnimationFrame(() => layer && layer.classList.add('in'));
  layer.addEventListener('click', onClick);
  return layer;
}
function close() {
  if (!layer) return;
  const l = layer; layer = null;
  l.classList.remove('in');
  document.body.classList.remove('lock');
  setTimeout(() => l.remove(), 250);
  rerender();
}

function onClick(e) {
  const a = e.target.closest('[data-ov]');
  if (!a) return;
  const act = a.dataset.ov;
  if (act === 'close') close();
  else if (act === 'open') reveal();
  else if (act === 'again') startBox();
  else if (act === 'companion') { setCompanion(a.dataset.line); close(); ui.tab = 'game'; ui.gameTab = 'profil'; rerender(); }
  else if (act === 'collection') { close(); ui.tab = 'game'; ui.gameTab = 'collection'; rerender(); }
}

let busy = false;
export function startBox() {
  if (G().boxes <= 0) return;
  show(`<div class="ov-box-stage">
      <p class="ov-hint">${G().boxes > 1 ? `${G().boxes} box à ouvrir` : 'Ta box est prête'}</p>
      <button class="gbox" data-ov="open" aria-label="Ouvrir la box"><span class="gbox-lid"></span><span class="gbox-body"></span><span class="gbox-ribbon"></span><span class="gbox-glow"></span></button>
      <p class="ov-tap">Touche la box pour l’ouvrir</p>
      <button class="ov-x" data-ov="close" aria-label="Fermer">✕</button></div>`, 'box');
  busy = false;
}

function reveal() {
  if (busy || !layer) return;
  busy = true;
  const res = openBox();
  if (!res) { close(); return; }
  const stage = layer.querySelector('.ov-box-stage');
  const color = RARITY[res.rarity].color;
  stage.style.setProperty('--rc', color);
  stage.classList.add('shaking', 'r' + res.rarity);
  buzz([20, 40, 20, 40, 20]);
  setTimeout(() => {
    if (!layer) return;
    stage.classList.add('burst');
    buzz(res.rarity >= 4 ? [60, 40, 120] : 30);
    if (res.rarity >= 4) confetti(res.rarity === 5 ? 220 : 120);
  }, res.rarity >= 4 ? 1700 : 1100);
  setTimeout(() => {
    if (!layer) return;
    const left = G().boxes, hasComp = !!G().companion;
    layer.innerHTML = `<div class="ov-result r${res.rarity}" style="--rc:${color}">
      <div class="ov-rays"></div>
      <p class="ov-rarity">${'★'.repeat(res.rarity)} ${RARITY[res.rarity].name}</p>
      <div class="ov-card">${cardHTML(res.form.id, { size: 'xl' })}</div>
      <p class="ov-msg">${res.isNew ? '<span class="new-tag">NOUVEAU !</span>' : `Doublon · <b>+${res.frag} 💎</b> fragments`}</p>
      <h2>${esc(res.form.name)}</h2>
      <div class="ov-actions">
        ${res.isNew && !hasComp ? `<button class="btn primary" data-ov="companion" data-line="${res.line.id}">Choisir comme compagnon</button>` : ''}
        ${left > 0 ? `<button class="btn primary" data-ov="again">🎁 Ouvrir la suivante (${left})</button>` : ''}
        <button class="btn" data-ov="collection">Voir ma collection</button>
        <button class="btn ghost" data-ov="close">Fermer</button>
      </div></div>`;
    busy = false;
  }, res.rarity >= 4 ? 2100 : 1450);
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
