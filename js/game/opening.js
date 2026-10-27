// Invocation en plein écran : autel des box, coffre à fissurer, explosion, cartes à retourner,
// mise en scène des cartes 4★, 5★ et brillantes ; écrans de niveau, de fusion, de boss vaincu et de bilan.
import { openBox, cardHTML, setCompanion, chestHTML } from './gacha.js';
import { G, AWAKEN, FUSE_COST, BOSS_XP, LEGEND_XP, SHINY_DUP } from './rules.js';
import { RARITY, LINES, FORMS } from './roster.js';
import { TIERS, TIER_KEYS, levelRewards } from './tiers.js';
import { confetti, buzz, burstAt, implode } from '../fx.js';
import { ui, rerender, pushModal, popModal, holdBanners } from '../ui.js';
import { esc, plural, key, parseKey, addDays } from '../util.js';
import { S, save, activeDomains, isDone } from '../store.js';
import { periodScore, isPerfect } from '../stats.js';
import { reviewDone, monthName, REVIEW_XP, WHY } from './growth.js';
import { winsBetween } from './wins.js';

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
  else if (act === 'saveReview') saveReview(a.dataset.m);
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
      <div class="sp-cards">${pack.map((c, i) => `<div class="fcard r${c.rarity} ${c.shiny ? 'shiny' : ''}" role="button" tabindex="0" data-ov="flip" data-i="${i}" style="--i:${i};--rc:${RARITY[c.rarity].color}" aria-label="Retourner la carte ${i + 1}">
          <div class="fc-inner"><div class="fc-back"><span class="fc-emblem">⚡</span><span class="fc-shine"></span>${c.shiny ? '<span class="fc-sparks"><i></i><i></i><i></i></span>' : ''}</div>
          <div class="fc-front">${cardHTML(c.form.id, { size: N === 1 ? 'xl' : 'sm', big: N === 1, shiny: c.shiny })}</div></div>
          <span class="fc-tag ${c.shinyNew ? 'shiny' : c.isNew ? 'new' : 'dup'}">${tagOf(c)}</span></div>`).join('')}</div>
      <div class="sp-foot">${N > 1 ? '<button class="btn ghost" data-ov="flipAll">Tout retourner</button>' : ''}</div>
      <div class="showcase" hidden></div>
      ${CLOSE}</div>`, 'spread-ov');
}

const tagOf = c => (c.shinyNew ? '✨ BRILLANTE' : c.isNew ? 'NOUVEAU' : c.shiny ? `✨ +${SHINY_DUP} 💎` : `DOUBLON ×${c.dups}`);
const RAINBOW = ['#ffd700', '#ff6ad5', '#7c5cff', '#00d4ff', '#ffffff'];

function flipCard(i) {
  if (!layer || !pack || flipped[i] || busy) return;
  const el = layer.querySelectorAll('.fcard')[i], c = pack[i];
  flipped[i] = true;
  if (c.rarity >= 4 || c.shiny) {
    busy = true;
    el.classList.add('charging');
    buzz([25, 25, 25, 25, 70]);
    later(() => {
      el.classList.remove('charging'); el.classList.add('flipped');
      const [x, y] = center(el);
      burstAt(x, y, c.shiny ? RAINBOW : [c.rarity === 5 ? '#ffd700' : RARITY[4].color, '#ffffff'], c.shiny ? 110 : 70, 1.1);
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
  sc.innerHTML = `<div class="sc r${c.rarity} ${c.shiny ? 'shiny r5' : ''}" data-ov="showcase" style="--rc:${RARITY[c.rarity].color}">
      <div class="sc-rays"></div>
      ${c.shiny ? '<p class="sc-shiny">✨ BRILLANTE ✨</p>' : ''}
      <p class="sc-rarity">${'<span>★</span>'.repeat(c.rarity)}<b>${RARITY[c.rarity].name}</b></p>
      <div class="sc-card">${cardHTML(c.form.id, { size: 'xl', big: true, shiny: c.shiny })}</div>
      <h2 class="sc-name">${esc(c.form.name)}</h2>
      ${c.isNew ? '<span class="new-tag">NOUVEAU !</span>' : c.shinyNew ? '<span class="new-tag">VERSION BRILLANTE !</span>' : `<p class="ov-msg">Doublon · <b>×${c.dups}</b> à fusionner ou échanger</p>`}
      <p class="sc-tap">Touche pour continuer</p></div>`;
  sc.hidden = false;
  confetti(c.rarity === 5 || c.shiny ? 240 : 110);
  buzz(c.rarity === 5 || c.shiny ? [60, 40, 60, 40, 200] : [60, 40, 120]);
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
  const news = pack.filter(c => c.isNew), dups = pack.filter(c => !c.isNew).length, shinies = pack.filter(c => c.shiny).length;
  const newBest = [...pack].reverse().find(c => c.isNew);
  const foot = layer.querySelector('.sp-foot');
  layer.querySelector('.sp-hint').textContent = '';
  foot.innerHTML = `<div class="sp-sum">${news.length ? `<span>🆕 ${plural(news.length, 'nouvelle carte', 'nouvelles cartes')}</span>` : ''}${shinies ? `<span>✨ ${plural(shinies, 'brillante', 'brillantes')} !</span>` : ''}${dups ? `<span>🃏 ${plural(dups, 'doublon', 'doublons')} : fusion ou échange</span>` : ''}</div>
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

/* ---------- Fusion : les doublons se rassemblent, la carte s'éveille ---------- */
export function showFusion(lineId, lv) {
  const L = LINES[lineId], f = FORMS[L.base], g = G(), o = g.owned[lineId] || {};
  const n = FUSE_COST[lv] || 3;
  show(`<div class="fusion lv${lv}" style="--rc:${RARITY[L.rarity].color}">
      <div class="ov-rays"></div>
      <p class="ov-kicker">Fusion de ${plural(n, 'doublon', 'doublons')}</p>
      <div class="fu-stage">${Array.from({ length: n }, (_, i) => `<i class="fu-ghost" style="--a:${Math.round(i * 360 / n)}deg;--i:${i}"></i>`).join('')}
        <div class="fu-card">${cardHTML(f.id, { size: 'xl', big: true, aw: lv, shiny: o.shiny })}</div><div class="fu-flash"></div></div>
      <h2 class="fu-name">${esc(f.name)}</h2>
      <p class="fu-lv">${lv === 2 ? '🌈 ULTIME !' : '✨ ÉVEILLÉE !'}</p>
      <p class="ov-msg">Nouveau cadre${lv === 2 ? ' arc-en-ciel' : ' doré'} · en compagnon, elle grandit ${Math.round((AWAKEN[lv].mult - 1) * 100)} % plus vite</p>
      <div class="ov-actions"><button class="btn primary" data-ov="close">Trop bien !</button></div>
      ${CLOSE}</div>`, 'fusion-ov');
  later(() => { const el = layer.querySelector('.fu-card'); if (el) { const [x, y] = center(el); burstAt(x, y, lv === 2 ? RAINBOW : ['#ffd700', '#ffe08a', '#ffffff'], 120, 1.2); confetti(lv === 2 ? 200 : 120); buzz([40, 40, 120]); } }, 1150);
}

/* ---------- Boss vaincu ---------- */
export function showBossKO(b) {
  const L = LINES[b.line], days = b.days.length;
  const next = G().boss.current ? 'Le prochain boss est déjà là !' : 'Le prochain boss arrive demain.';
  show(`<div class="boss-ko ${b.legendary ? 'legend' : ''}">
      <div class="ov-rays"></div>
      <p class="ov-kicker">${b.legendary ? 'Boss légendaire vaincu' : 'Boss vaincu'}</p>
      <div class="ko-stage"><img class="ko-img" src="${esc(b.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><span class="ko-txt">K.O. !</span></div>
      <h2>${esc(b.name)} est vaincu !</h2>
      <p class="ov-msg">En ${plural(days, 'jour', 'jours')} · ${b.hp.toLocaleString('fr-FR')} PV détruits</p>
      <div class="lv-rewards">
        <span class="lv-rw" style="--i:0">${chestHTML('g', 'mini')}<b>${b.legendary ? '2 × ' : ''}Grande box</b></span>
        <span class="lv-rw" style="--i:1"><span class="ko-card">${cardHTML(L.base, { size: 'sm' })}</span><b>Sa carte</b></span>
        <span class="lv-rw" style="--i:2">⚡<b>+${b.legendary ? LEGEND_XP : BOSS_XP} XP</b></span>
      </div>
      <p class="ov-tip">${next}</p>
      <div class="ov-actions">${G().boxes.g ? '<button class="btn primary" data-ov="altar" data-k="g">🎁 Ouvrir ma grande box</button>' : ''}<button class="btn ghost" data-ov="close">Continuer</button></div>
    </div>`, 'ko-ov');
  later(() => { confetti(b.legendary ? 240 : 150); buzz([80, 40, 80, 40, 200]); }, 900);
}

/* ---------- Bilan de la semaine ---------- */
const MOODS = ['', '😞', '😕', '😐', '🙂', '😄'];
export function showRecap(r) {
  const gr = r.grade, box = gr.box, b = G().boxes;
  const fmt = d => `${d.getDate()}/${d.getMonth() + 1}`;
  const sun = new Date(r.ws); sun.setDate(sun.getDate() + 6);
  const delta = r.pct - r.prevPct;
  const lines = [];
  if (r.best) lines.push(`${r.best.d.emoji} Domaine phare : <b>${esc(r.best.d.name)}</b> (${r.best.n}/7)`);
  for (const x of r.bosses) lines.push(x.won ? `⚔️ ${esc(x.name)} vaincu` : `💨 ${esc(x.name)} s’est enfui`);
  if (r.mood) lines.push(`${MOODS[Math.round(r.mood)]} Humeur moyenne : <b>${r.mood.toFixed(1).replace('.', ',')}/5</b>`);
  if (r.record) lines.push('🏆 <b>Nouveau record</b> : ta meilleure semaine en XP !');
  const wins = winsBetween(G(), key(r.ws), key(sun)).sort((a, b) => b.big - a.big);
  if (wins.length) lines.unshift(`🏅 <b>${plural(wins.length, 'victoire', 'victoires')}</b> : ${wins.slice(0, 3).map(w => esc(w.txt)).join(' · ')}${wins.length > 3 ? '…' : ''}`);
  if (!r.provisional && 'CD'.includes(gr.g)) lines.push('🌱 Une semaine difficile ne définit pas la suivante : lundi, page blanche.');
  show(`<div class="recap g-${gr.g}" style="--gc:${gr.color}">
      <div class="ov-rays"></div>
      <p class="ov-kicker">Bilan de la semaine · ${fmt(r.ws)} → ${fmt(sun)}</p>
      <div class="rc-grade"><span>${gr.g}</span></div>
      <h2>${r.provisional ? `Note provisoire : ${gr.g}` : gr.title}</h2>
      <div class="rc-stats">
        <div><b>${r.pct} %</b><small>${delta ? `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} pts` : 'score'}</small></div>
        <div><b>${r.done}</b><small>cases</small></div>
        <div><b>${r.perfect}</b><small>${r.perfect > 1 ? 'parfaites' : 'parfaite'}</small></div>
        <div><b>${r.xp.toLocaleString('fr-FR')}</b><small>XP</small></div>
      </div>
      ${lines.length ? `<ul class="rc-lines">${lines.map(l => `<li>${l}</li>`).join('')}</ul>` : ''}
      <div class="rc-reward">${box ? `${chestHTML(box, 'mini')}<span><b>${r.provisional ? `Dimanche, si ça reste comme ça : ${TIERS[box].name.toLowerCase()}` : `${TIERS[box].name} gagnée !`}</b><small>Note ${gr.g}</small></span>`
        : `<span><b>${r.provisional ? 'Pas encore de box' : 'Pas de box cette fois'}</b><small>Note B (60 %) pour une petite box, A (75 %) pour une classique, S (90 %) pour une grande</small></span>`}</div>
      ${r.next && r.live ? `<p class="ov-tip">${r.provisional ? 'Le bilan tombe dimanche à 18 h. ' : 'Il reste ce soir pour monter. '}Prochaine note : ${r.next.g} à ${r.next.min} %.</p>` : ''}
      <div class="ov-actions">${box && !r.provisional && b[box] ? `<button class="btn primary" data-ov="altar" data-k="${box}">🎁 Ouvrir ma box</button>` : ''}<button class="btn ghost" data-ov="close">${box && !r.provisional ? 'Plus tard' : 'Fermer'}</button></div>
    </div>`, 'recap-ov');
  later(() => { if (!r.provisional && 'SA'.includes(gr.g)) confetti(gr.g === 'S' ? 240 : 140); buzz([50, 40, 120]); }, 750);
}

/* ---------- Bilan du mois : tes chiffres, puis 3 questions ---------- */
function monthStats(mk) {
  const [y, m] = mk.split('-').map(Number), start = new Date(y, m - 1, 1), end = new Date(y, m, 0);
  const days = [];
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) days.push(key(d));
  const g = G(), sc = periodScore(start, end);
  const per = activeDomains().map(d => ({ d, n: days.filter(k => isDone(k, d.id)).length })).sort((a, b) => b.n - a.n);
  const moods = days.map(k => S.days[k] && S.days[k].mood).filter(Boolean);
  return {
    pct: sc.pct, done: sc.done, perfect: days.filter(isPerfect).length, xp: days.reduce((a, k) => a + (g.dayXP[k] || 0), 0),
    best: per[0] && per[0].n ? per[0] : null, low: per.filter(x => x.n).pop() || null,
    mood: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : 0,
    bosses: g.boss.history.filter(b => b.won && b.endDay >= days[0] && b.endDay <= days[days.length - 1]).length,
    skills: days.filter(k => isDone(k, 'competence')).length,
  };
}
export function showMonthRecap(mk) {
  const [y, m] = mk.split('-').map(Number), pk = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}`;
  const a = monthStats(mk), b = monthStats(pk), r = S.reviews[mk] || {}, done = reviewDone(r), live = mk >= key(new Date()).slice(0, 7);
  const delta = (x, y2, unit = '') => { const d = Math.round(x - y2); return d ? `<small class="${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d)}${unit}</small>` : '<small>=</small>'; };
  const q = (id, label, ph) => `<label class="mr-q"><span>${label}</span><textarea id="mr-${id}" rows="2" maxlength="300" placeholder="${ph}">${esc(r[id] || '')}</textarea></label>`;
  show(`<div class="month-recap">
      <div class="ov-rays"></div>
      <p class="ov-kicker">Bilan du mois</p>
      <h2>${monthName(mk).replace(/^./, c => c.toUpperCase())}</h2>
      <div class="rc-stats mr-stats">
        <div><b>${a.pct} %</b>${delta(a.pct, b.pct, ' pts')}<small>score</small></div>
        <div><b>${a.done}</b>${delta(a.done, b.done)}<small>cases</small></div>
        <div><b>${a.perfect}</b>${delta(a.perfect, b.perfect)}<small>parfaites</small></div>
        <div><b>${a.xp.toLocaleString('fr-FR')}</b>${delta(a.xp, b.xp)}<small>XP</small></div>
      </div>
      <ul class="rc-lines">
        ${a.best ? `<li>${a.best.d.emoji} Ton point fort : <b>${esc(a.best.d.name)}</b> (${a.best.n} jours)</li>` : ''}
        ${a.low && a.low !== a.best ? `<li>${a.low.d.emoji} À travailler : <b>${esc(a.low.d.name)}</b> (${a.low.n} jours)</li>` : ''}
        ${a.bosses ? `<li>⚔️ ${plural(a.bosses, 'boss vaincu', 'boss vaincus')}</li>` : ''}
        ${a.skills ? `<li>🧠 ${plural(a.skills, 'séance', 'séances')} de compétence</li>` : ''}
        ${a.mood ? `<li>🙂 Humeur moyenne : <b>${a.mood.toFixed(1).replace('.', ',')}/5</b></li>` : ''}
      </ul>
      <div class="mr-form">
        ${q('good', '✅ Qu’est-ce qui a bien marché ?', 'Ce dont tu es fier ce mois-ci…')}
        ${q('bad', '🧱 Qu’est-ce qui t’a bloqué ?', 'Ce qui t’a freiné, et pourquoi…')}
        ${q('focus', '🎯 Ton focus pour le mois prochain ?', 'Une priorité claire (elle s’affichera chaque jour)')}
        <div class="mr-q mr-why"><span>🤔 Est-ce que tu le fais encore pour toi, ou pour le jeu ?</span>
          <div class="pills">${Object.entries(WHY).map(([id, l]) => `<label><input type="radio" name="mr-why" value="${id}" ${r.why === id ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          <small>Pas de mauvaise réponse. Si c’est surtout pour le jeu, relis ta vision et garde une ou deux cases « juste pour toi », sans regarder l’XP.</small></div>
      </div>
      <p class="ov-tip">${live ? 'Mois en cours : tu pourras valider ce bilan (box classique + ' + REVIEW_XP + ' XP) dès le 1er du mois prochain.' : done ? '✓ Bilan rempli : box classique et +' + REVIEW_XP + ' XP gagnées.' : `Réponds aux 3 questions : <b>box classique + ${REVIEW_XP} XP</b>.`}</p>
      <div class="ov-actions"><button class="btn primary" data-ov="saveReview" data-m="${mk}">${done ? 'Enregistrer' : 'Valider mon bilan'}</button><button class="btn ghost" data-ov="close">Plus tard</button></div>
      ${CLOSE}</div>`, 'month-ov');
}
function saveReview(mk) {
  const val = id => (layer.querySelector('#mr-' + id) || {}).value || '';
  const was = reviewDone(S.reviews[mk]);
  const why = (layer.querySelector('input[name="mr-why"]:checked') || {}).value || '';
  S.reviews[mk] = { good: val('good').trim(), bad: val('bad').trim(), focus: val('focus').trim(), why, u: Date.now() };
  save();
  if (!reviewDone(S.reviews[mk])) { const tip = layer.querySelector('.ov-tip'); tip.innerHTML = '✍️ Écris au moins quelques mots à chaque question.'; buzz([30, 30, 30]); return; }
  if (was || mk >= key(new Date()).slice(0, 7)) { closeOverlay(); return; }
  confetti(160); buzz([50, 40, 120]);
  const foot = layer.querySelector('.ov-actions'), tip = layer.querySelector('.ov-tip');
  tip.innerHTML = `🎉 Bilan validé : <b>box classique + ${REVIEW_XP} XP</b> !`;
  foot.innerHTML = `${G().boxes.c ? '<button class="btn primary" data-ov="altar" data-k="c">🎁 Ouvrir ma box classique</button>' : ''}<button class="btn ghost" data-ov="close">Fermer</button>`;
}
