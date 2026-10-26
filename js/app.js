// Point d'entrée : affichage des écrans, navigation et gestion des clics / saisies.
import morphdom from './vendor/morphdom.js';
import { S, onChange, storageOK, sync, syncNow, save, touch, DEMO, setDemo, replaceAll, leaving } from './store.js';
import { ui, setRender, setPref, pref, closeSheet, ico, pushModal, popModal, setBackHandler, banner } from './ui.js';
import { makeDemo } from './demo.js';
import { G, awardBadges } from './game/rules.js';
import { showLevelUp, overlayOpen, requestClose, startBox } from './game/opening.js';
import { chestHTML } from './game/gacha.js';
import { TIERS, TIER_KEYS, levelRewards } from './game/tiers.js';
import { todayKey, dayDiff } from './util.js';
import * as today from './views/today.js';
import * as stats from './views/stats.js';
import * as game from './views/game.js';
import * as goals from './views/goals.js';
import * as media from './views/media.js';
import * as vision from './views/vision.js';
import * as settings from './views/settings.js';

const VIEWS = { today, stats, game, goals, media, vision, settings, more: { render: settings.renderMore } };
const SHEETS = { goal: goals.sheet, media: media.sheet, domain: settings.sheet, measure: today.sheet, card: game.sheet, odds: game.oddsSheet, shop: game.shopSheet };
const MODULES = [today, stats, game, goals, media, vision, settings];
const actions = Object.assign({}, ...MODULES.map(m => m.actions || {}), {
  tab(el) {
    ui.tab = el.dataset.tab; setPref('tab', ui.tab);
    ui.visionEdit = false; ui.sheet = null;
    if (ui.tab === 'today') ui.day = todayKey();
    scrollTo({ top: 0 });
  },
  closeSheet() { closeSheet(); },
  demoOn() { if (confirm('Ouvrir le compte de démonstration ? Tes vraies données restent de côté, intactes.')) setDemo(true); },
  demoOff() { setDemo(false); },
});
const forms = Object.assign({}, ...MODULES.map(m => m.forms || {}));
const inputs = Object.assign({}, ...MODULES.map(m => m.inputs || {}));

const app = document.getElementById('app');
const sheetRoot = document.getElementById('sheet');
const MORPH = {
  // Ne touche pas au champ en cours de saisie (garde le curseur et le texte tapé)
  onBeforeElUpdated(from, to) {
    if (from === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(from.tagName) && from.type !== 'radio' && from.type !== 'checkbox') return false;
    return !from.isEqualNode(to);
  },
};

let lastSheet = null, lastDay = todayKey();
function render() {
  if (leaving) return;
  // Nouveau jour depuis la dernière ouverture : on revient sur aujourd'hui
  const tk = todayKey();
  if (tk !== lastDay) { if (ui.day === lastDay || dayDiff(ui.day, tk) > 2) ui.day = tk; lastDay = tk; }

  const th = S.settings.theme;
  if (th === 'light' || th === 'dark') document.documentElement.dataset.theme = th; else delete document.documentElement.dataset.theme;
  const navTab = ['media', 'vision', 'settings'].includes(ui.tab) ? 'more' : ui.tab;
  document.querySelectorAll('nav.tabs [data-tab]').forEach(b => {
    const on = b.dataset.tab === ui.tab || (b.classList.contains('m-only') && b.dataset.tab === navTab);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });

  const view = VIEWS[ui.tab] || today;
  const demo = DEMO ? '<button class="demo-bar" data-act="demoOff">🧪 Mode démo : tout est débloqué · <b>Quitter la démo</b></button>' : '';
  const warn = storageOK ? '' : '<div class="card warn">Ce navigateur bloque l’enregistrement (navigation privée ?). Tes données seront perdues à la fermeture.</div>';
  // Un identifiant par onglet : changer d'onglet remplace la page (et rejoue son animation d'entrée)
  morphdom(app, `<main id="app" class="view-${ui.tab}">${demo}${warn}<div class="page" id="pg-${ui.tab}">${view.render()}</div></main>`, MORPH);

  if (ui.sheet !== lastSheet) {
    const prev = lastSheet;
    lastSheet = ui.sheet;
    if (ui.sheet && !prev) pushModal();
    if (!ui.sheet && prev) {
      popModal();
      // Fenêtre fermée sans rien choisir (ex. « combien de temps ? ») : son action par défaut
      if (prev.onClose && !prev.handled) setTimeout(prev.onClose, 0);
    }
    if (ui.sheet) {
      const html = (SHEETS[ui.sheet.kind] || (() => ''))(ui.sheet);
      sheetRoot.innerHTML = `<div class="backdrop" data-act="closeSheet"></div>
        <div class="sheet" role="dialog" aria-modal="true"><button class="icon-btn sheet-x" data-act="closeSheet" aria-label="Fermer">${ico('close')}</button>${html}</div>`;
      sheetRoot.hidden = false;
      requestAnimationFrame(() => sheetRoot.classList.add('open'));
      document.body.classList.add('lock');
    } else {
      sheetRoot.classList.remove('open');
      if (!overlayOpen()) document.body.classList.remove('lock');
      setTimeout(() => { if (!ui.sheet) { sheetRoot.hidden = true; sheetRoot.innerHTML = ''; } }, 250);
    }
  }
  // Le calendrier s'ouvre sur les semaines les plus récentes
  const hs = app.querySelector('[data-scroll-end]');
  if (hs && !hs.dataset.done) { hs.scrollLeft = hs.scrollWidth; hs.dataset.done = '1'; }
  checkProgress();
}

// Connexion du jour, nouveaux badges, passage de niveau et box gagnées
let checking = false;
function checkProgress() {
  if (checking) return;
  checking = true;
  try {
    const tk = todayKey();
    let changed = false;
    if (!S.game.visits[tk]) { S.game.visits[tk] = 1; changed = true; }
    const fresh = awardBadges();
    if (fresh.length) changed = true;
    if (changed) { touch(S.game); save(); }
    fresh.slice(0, 4).forEach(b => banner({ icon: b.emoji, title: `Badge : ${b.name}`, sub: `+${b.xp} XP${b.box ? ` · ${TIERS[b.box].name} offerte` : ''}`, color: '#f5b700', cls: 'badge-ban' }));
    if (fresh.length > 4) banner({ icon: '🏅', title: `Et ${fresh.length - 4} autres badges !`, sub: 'Jeu → Badges' });

    const g = G(), lv = g.lvl.level, seenLv = Number(pref('seenLevel') || 0);
    const free = !overlayOpen() && !ui.sheet;
    // Niveau gagné pendant qu'une fenêtre est ouverte : on attend qu'elle se ferme pour tout annoncer
    if (seenLv && lv > seenLv && !free) return;
    let lvUp = null;
    if (!seenLv) setPref('seenLevel', lv);
    else if (lv > seenLv) { setPref('seenLevel', lv); lvUp = [seenLv, lv]; showLevelUp(lv, g.title, lv - seenLv); }

    // Box gagnées depuis la dernière fois (celles d'un passage de niveau sont déjà annoncées par son écran)
    const earned = g.boxesEarned;
    let seen = null;
    try { seen = JSON.parse(pref('seenBoxes')); } catch (e) {}
    if (seen) {
      const inc = {};
      for (const k of TIER_KEYS) inc[k] = Math.max(0, earned[k] - (seen[k] || 0));
      if (lvUp) for (let L = lvUp[0] + 1; L <= lvUp[1]; L++) for (const t of levelRewards(L)) inc[t] = Math.max(0, inc[t] - 1);
      for (const k of ['g', 'c', 'p']) {
        if (!inc[k]) continue;
        banner({ icon: chestHTML(k, 'mini'), title: inc[k] > 1 ? `${inc[k]} ${TIERS[k].many} gagnées !` : `${TIERS[k].name} gagnée !`,
          sub: 'Touche pour l’ouvrir', color: TIERS[k].color, cls: 'box-ban', onTap: () => startBox(k), still: () => G().boxes[k] > 0 });
      }
    }
    if (!seen || TIER_KEYS.some(k => earned[k] !== seen[k])) setPref('seenBoxes', JSON.stringify(earned));
  } catch (e) { console.error(e); }
  finally { checking = false; }
}
setRender(render);
onChange(render);

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !actions[el.dataset.act]) return;
  if (el.tagName === 'A') e.preventDefault();
  actions[el.dataset.act](el, e);
  render();
});
document.addEventListener('submit', e => {
  const form = e.target.closest('form[data-form]');
  if (!form || !forms[form.dataset.form]) return;
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const inSheet = sheetRoot.contains(form);
  if (forms[form.dataset.form](data, form) !== false && !inSheet) form.reset();
  render();
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-input]');
  if (!el || !inputs[el.dataset.input]) return;
  inputs[el.dataset.input](el, e);
  render();
});
for (const ev of ['pointermove', 'pointerdown']) document.addEventListener(ev, stats.chartHover, { passive: true });
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (overlayOpen()) requestClose(); else if (ui.sheet) closeSheet();
});
// Bouton « retour » du téléphone : ferme l'animation ou la fenêtre ouverte
setBackHandler(() => {
  if (overlayOpen()) requestClose();
  else if (ui.sheet) { ui.sheet = null; render(); }
});
document.getElementById('importFile').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  if (f) settings.importFile(f);
  e.target.value = '';
});
addEventListener('beforeinstallprompt', e => { e.preventDefault(); ui.install = e; render(); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  render();
  if (sync && sync.on) syncNow();
});

if (DEMO && !S.game.pulls.length) replaceAll(makeDemo());
render();
if (sync && sync.on) syncNow();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
