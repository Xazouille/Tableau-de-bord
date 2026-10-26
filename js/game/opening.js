// Invocation en plein écran : autel des box, coffre à fissurer, explosion, cartes à retourner,
// mise en scène des cartes 4★ et 5★ ; et l'écran de passage de niveau.
import { openBox, cardHTML, setCompanion, chestHTML } from './gacha.js';
import { G } from './rules.js';
import { RARITY } from './roster.js';
import { TIERS, TIER_KEYS, levelRewards } from './tiers.js';
import { confetti, buzz, burstAt, implode } from '../fx.js';
import { ui, rerender, pushModal, popModal, holdBanners } from '../ui.js';
import { esc, plural } from '../util.js';

let layer = null;
export const overlayOpen = () => !!layer;
const CLOSE = '<button class="ov-x" data-ov="close" aria-label="Fermer">✕</button>';
const SKY = '<div class="ov-sky" aria-hidden="true"><i></i><i></i><i></i></div>';

function show(html, cls) {
  const first = !layer;
  if (first) {
    layer = document.createElement('div');
    layer.addEventListener('click', onClick);
    document.body.appendChild(layer);
    document.body.classList.add('lock');
    pushModal(); holdBanners(true);
  }
  layer.className = `overlay ${cls} ${first ? '' : 'in'}`;
  layer.innerHTML = SKY + html;
  if (first) requestAnimationFrame(() => layer && layer.classList.add('in'));
}
function closeOverlay() {
  if (!layer) return;
  const l = layer;
  layer = null; pack = null; queue = []; gen++;
  l.classList.remove('in');
  if (!ui.sheet) document.body.classList.remove('lock');
  setTimeout(() => l.remove(), 300);
  popModal();
  rerender();
  holdBanners(false);
}

let pack = null, tier = 'c', taps = 0, tease = [], flipped = [], busy = false, queue = [], gen = 0;
// Minuteries de l'animation : ignorées si l'invocation a été fermée, sautée ou remplacée entre-temps
const later = (fn, ms) => { const g = gen; setTimeout(() => { if (g === gen && layer) fn(); }, ms); };

// ✕, retour ou Échap : si des cartes tirées n'ont pas encore été vues, on les révèle toutes au lieu de fermer
export function requestClose() {
  if (pack && flipped.some(f => !f)) revealAll(); else closeOverlay();
}
function revealAll() {
  gen++; busy = false; queue = [];
  if (!layer.querySelector('.spread')) spread();
  const sc = layer.querySelector('.showcase');
  if (sc) { sc.hidden = true; sc.innerHTML = ''; }
  flipped = pack.map(() => true);
  layer.querySelectorAll('.fcard').forEach(el => { el.classList.remove('charging'); el.classList.add('flipped'); });
  afterFlip();
}
const best = () => Math.max(...pack.map(c => c.rarity));
const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

function onClick(e) {
  const a = e.target.closest('[data-ov]');
  if (!a || !layer) return;
  const act = a.dataset.ov;
  if (act === 'close') requestClose();
  else if (act === 'pick') summon(a.dataset.k);
  else if (act === 'tap') tapChest();
  else if (act === 'flip') flipCard(Number(a.dataset.i));
  else if (act === 'flipAll') flipAll();
  else if (act === 'showcase') hideShowcase();
  else if (act === 'altar') startBox(a.dataset.k);
  else if (act === 'companion') { setCompanion(a.dataset.line); ui.tab = 'game'; ui.gameTab = 'profil'; closeOverlay(); }
  else if (act === 'collection') { ui.tab = 'game'; ui.gameTab = 'collection'; closeOverlay(); }
}

/* ---------- Autel : choix de la box ---------- */
export function startBox(k) {
  const b = G().boxes;
  if (!b.total) { closeOverlay(); return; }
  if (k && b[k] > 0) return summon(k);
  const avail = TIER_KEYS.filter(t => b[t] > 0);
  if (avail.length === 1) return summon(avail[0]);
  show(`<div class="altar">
      <p class="ov-kicker">Autel d’invocation</p>
      <h2>Quelle box ouvrir ?</h2>
      <div class="alt-list">${['g', 'c', 'p'].map((t, i) => `<button class="alt-item t-${t} ${b[t] ? '' : 'empty'}" ${b[t] ? `data-ov="pick" data-k="${t}"` : 'disabled'} style="--tc:${TIERS[t].color};--i:${i}">
        ${chestHTML(t)}<span class="alt-txt"><b>${TIERS[t].name}</b><small>${plural(TIERS[t].cards, 'carte', 'cartes')}${t === 'g' ? ' · les plus rares' : ''}</small></span><span class="alt-n">×${b[t]}</span></button>`).join('')}</div>
      <p class="ov-tip">Plus la box est grande, plus les cartes rares tombent souvent.</p>
      ${CLOSE}</div>`, 'altar-ov');
}

/* ---------- Le coffre : 3 touches pour le fissurer ---------- */
function summon(k) {
  const T = TIERS[k];
  tier = k; taps = 0; pack = null; busy = false; queue = []; gen++;
  show(`<div class="summon t-${k}" style="--tc:${T.color};--rc:${T.color}">
      <p class="ov-kicker">${T.name} · ${plural(T.cards, 'carte', 'cartes')}</p>
      <div class="sm-stage">
        <div class="sm-aura"></div><div class="sm-ring"></div>
        <div class="sm-wave"></div><div class="sm-wave w2"></div>
        <button class="sm-chest" data-ov="tap" aria-label="Toucher la box">${chestHTML(k, 'big')}</button>
        <p class="sm-up" aria-live="polite"></p>
      </div>
      <div class="sm-dots"><i></i><i></i><i></i></div>
      <p class="sm-hint">Touche la box 3 fois pour l’ouvrir</p>
      <div class="sm-flash"></div>
      ${CLOSE}</div>`, 'summon-ov');
}

// Couleur de la lueur à chaque touche : elle annonce la meilleure carte… et peut monter au dernier moment
function teaseColors(p) {
  const B = Math.max(...p.map(c => c.rarity)), rnd = Math.random;
  if (B <= 3) return [Math.max(1, B - (rnd() < 0.4 ? 1 : 0)), B, B];
  const s1 = rnd() < 0.2 ? B : 3;
  const s2 = Math.max(s1, B === 5 ? (rnd() < 0.55 ? 4 : s1) : (rnd() < 0.5 ? B : s1));
  return [s1, s2, B];
}
const UPGRADE = { 2: 'Peu commune !', 3: 'Rare !', 4: '✨ ÉPIQUE !', 5: '🌟 LÉGENDAIRE !!' };

function tapChest() {
  if (busy || !layer) return;
  const st = layer.querySelector('.summon');
  if (!pack) {
    pack = openBox(tier);       // les cartes sont tirées et enregistrées dès la première touche
    if (!pack) { closeOverlay(); return; }
    tease = teaseColors(pack); flipped = pack.map(() => false);
  }
  taps++;
  const lvl = tease[taps - 1], prev = taps > 1 ? tease[taps - 2] : 0, up = taps > 1 && lvl > prev;
  st.style.setProperty('--rc', RARITY[lvl].color);
  st.className = `summon t-${tier} tap${taps} r${lvl}${up ? ' upgrade' : ''}`;
  st.querySelectorAll('.sm-dots i').forEach((d, i) => d.classList.toggle('on', i < taps));
  st.querySelector('.sm-hint').textContent = taps < 3 ? `Encore ${3 - taps}…` : '';
  const upEl = st.querySelector('.sm-up');
  upEl.textContent = up ? UPGRADE[lvl] : '';
  upEl.classList.remove('show'); void upEl.offsetWidth; if (up) upEl.classList.add('show');
  const [x, y] = center(st.querySelector('.sm-chest'));
  implode(x, y, RARITY[lvl].color, 16 + taps * 12);
  buzz(up ? [40, 40, 90] : [20 + taps * 18]);
  if (taps >= 3) { busy = true; later(explode, lvl >= 4 ? 700 : 450); }
}

function explode() {
  if (!layer || !pack) return;
  const st = layer.querySelector('.summon'), B = best();
  st.classList.add('boom');
  const [x, y] = center(st.querySelector('.sm-chest'));
  burstAt(x, y, [RARITY[B].color, '#ffffff', '#ffe08a'], B >= 4 ? 150 : 90, B >= 4 ? 1.4 : 1);
  if (B >= 4) confetti(B === 5 ? 220 : 120);
  buzz(B >= 4 ? [90, 40, 160] : [70]);
  later(spread, B >= 4 ? 900 : 700);
}

/* ---------- Les cartes face cachée ---------- */
function spread() {
  if (!layer || !pack) return;
  busy = false;
  const T = TIERS[tier], N = pack.length;
  show(`<div class="spread n${N}" style="--rc:${RARITY[best()].color}">
      <div class="ov-rays"></div>
      <p class="ov-kicker">${T.name}</p>
      <p class="sp-hint">${N > 1 ? 'Touche les cartes pour les retourner' : 'Touche la carte pour la retourner'}</p>
      <div class="sp-cards">${pack.map((c, i) => `<div class="fcard r${c.rarity}" role="button" tabindex="0" data-ov="flip" data-i="${i}" style="--i:${i};--rc:${RARITY[c.rarity].color}" aria-label="Retourner la carte ${i + 1}">
          <div class="fc-inner"><div class="fc-back"><span class="fc-emblem">⚡</span><span class="fc-shine"></span></div>
          <div class="fc-front">${cardHTML(c.form.id, { size: N === 1 ? 'xl' : 'sm', big: N === 1 })}</div></div>
          <span class="fc-tag ${c.isNew ? 'new' : ''}">${c.isNew ? 'NOUVEAU' : `+${c.frag} 💎`}</span></div>`).join('')}</div>
      <div class="sp-foot">${N > 1 ? '<button class="btn ghost" data-ov="flipAll">Tout retourner</button>' : ''}</div>
      <div class="showcase" hidden></div>
      ${CLOSE}</div>`, 'spread-ov');
}

function flipCard(i) {
  if (!layer || !pack || flipped[i] || busy) return;
  const el = layer.querySelectorAll('.fcard')[i], c = pack[i];
  flipped[i] = true;
  if (c.rarity >= 4) {
    busy = true;
    el.classList.add('charging');
    buzz([25, 25, 25, 25, 70]);
    later(() => {
      el.classList.remove('charging'); el.classList.add('flipped');
      const [x, y] = center(el);
      burstAt(x, y, [c.rarity === 5 ? '#ffd700' : RARITY[4].color, '#ffffff'], 70, 1.1);
      later(() => showcase(c), 420);
    }, 650);
  } else {
    el.classList.add('flipped');
    if (c.isNew) { const [x, y] = center(el); burstAt(x, y, [RARITY[c.rarity].color, '#ffffff'], 18, 0.6); }
    buzz(12);
    afterFlip();
  }
}

function showcase(c) {
  const sc = layer && layer.querySelector('.showcase');
  if (!sc) return;
  sc.innerHTML = `<div class="sc r${c.rarity}" data-ov="showcase" style="--rc:${RARITY[c.rarity].color}">
      <div class="sc-rays"></div>
      <p class="sc-rarity">${'<span>★</span>'.repeat(c.rarity)}<b>${RARITY[c.rarity].name}</b></p>
      <div class="sc-card">${cardHTML(c.form.id, { size: 'xl', big: true })}</div>
      <h2 class="sc-name">${esc(c.form.name)}</h2>
      ${c.isNew ? '<span class="new-tag">NOUVEAU !</span>' : `<p class="ov-msg">Doublon · <b>+${c.frag} 💎</b></p>`}
      <p class="sc-tap">Touche pour continuer</p></div>`;
  sc.hidden = false;
  confetti(c.rarity === 5 ? 240 : 110);
  buzz(c.rarity === 5 ? [60, 40, 60, 40, 200] : [60, 40, 120]);
}
function hideShowcase() {
  const sc = layer && layer.querySelector('.showcase');
  if (sc) { sc.hidden = true; sc.innerHTML = ''; }
  busy = false;
  afterFlip();
}

function flipAll() {
  queue = flipped.map((f, i) => (f ? -1 : i)).filter(i => i >= 0);
  const foot = layer.querySelector('.sp-foot');
  if (foot) foot.innerHTML = '';
  nextInQueue();
}
function nextInQueue() {
  if (!layer || busy) return;
  while (queue.length && flipped[queue[0]]) queue.shift();
  if (queue.length) flipCard(queue.shift()); else afterFlip();
}

function afterFlip() {
  if (!layer || !pack) return;
  if (queue.length) { later(nextInQueue, 170); return; }
  if (flipped.some(f => !f)) return;
  // Toutes les cartes sont retournées : le résumé
  const b = G().boxes, T = TIERS[tier];
  const news = pack.filter(c => c.isNew), frags = pack.reduce((a, c) => a + c.frag, 0);
  const newBest = [...pack].reverse().find(c => c.isNew);
  const foot = layer.querySelector('.sp-foot');
  layer.querySelector('.sp-hint').textContent = '';
  foot.innerHTML = `<div class="sp-sum">${news.length ? `<span>✨ ${plural(news.length, 'nouvelle carte', 'nouvelles cartes')}</span>` : '<span>Que des doublons…</span>'}${frags ? `<span>💎 +${frags} fragments</span>` : ''}</div>
    <div class="ov-actions">
      ${newBest && !G().companion ? `<button class="btn primary" data-ov="companion" data-line="${newBest.line.id}">🐾 Choisir ${esc(newBest.form.name)} comme compagnon</button>` : ''}
      ${b[tier] ? `<button class="btn primary" data-ov="altar" data-k="${tier}">🎁 Encore une ${T.name.toLowerCase()} (${b[tier]})</button>` : ''}
      ${b.total - b[tier] > 0 ? `<button class="btn ${b[tier] ? '' : 'primary'}" data-ov="altar">🎁 Ouvrir une autre box (${b.total - b[tier]})</button>` : ''}
      <button class="btn" data-ov="collection">Voir ma collection</button>
      <button class="btn ghost" data-ov="close">Fermer</button>
    </div>`;
  foot.classList.add('done');
}

/* ---------- Passage de niveau ---------- */
export function showLevelUp(level, title, gained = 1) {
  const from = Math.max(1, level - gained);
  const won = { g: 0, c: 0, p: 0 };
  for (let L = from + 1; L <= level; L++) for (const t of levelRewards(L)) won[t]++;
  show(`<div class="ov-level">
      <div class="ov-rays"></div>
      <p class="ov-kicker lv-kick">Niveau supérieur !</p>
      <div class="lv-badge"><span class="lv-n">${from}</span></div>
      <h2 class="lv-tt">${esc(title)}</h2>
      <div class="lv-rewards">${['g', 'c'].filter(t => won[t]).map((t, i) => `<span class="lv-rw" style="--i:${i}">${chestHTML(t, 'mini')}<b>${won[t] > 1 ? won[t] + ' × ' : ''}${TIERS[t].name}</b></span>`).join('')}</div>
      <p class="ov-msg">${gained > 1 ? `+${gained} niveaux d’un coup ! ` : ''}${level % 5 === 0 ? 'Palier atteint : box bonus ! ' : ''}${G().boxes.total ? 'Tes box t’attendent.' : ''}</p>
      <div class="ov-actions">${G().boxes.total ? '<button class="btn primary" data-ov="altar">🎁 Ouvrir mes box</button><button class="btn ghost" data-ov="close">Plus tard</button>' : '<button class="btn primary" data-ov="close">Continuer</button>'}</div>
    </div>`, 'level-ov');
  // Le chiffre du niveau monte jusqu'au nouveau niveau
  const n = layer.querySelector('.lv-n');
  let cur = from;
  const step = () => {
    if (!layer || !n.isConnected) return;
    cur++;
    n.textContent = cur;
    n.parentElement.classList.remove('bump'); void n.offsetWidth; n.parentElement.classList.add('bump');
    if (cur < level) setTimeout(step, Math.max(90, 420 / gained));
    else { confetti(220); buzz([40, 60, 40, 60, 140]); layer.querySelector('.ov-level').classList.add('reached'); }
  };
  setTimeout(step, 550);
}
