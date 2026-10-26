// Point d'entrée : affichage des écrans, navigation et gestion des clics / saisies.
import morphdom from './vendor/morphdom.js';
import { S, onChange, storageOK, sync, syncNow } from './store.js';
import { ui, setRender, setPref, closeSheet, ico } from './ui.js';
import { todayKey, dayDiff } from './util.js';
import * as today from './views/today.js';
import * as stats from './views/stats.js';
import * as game from './views/game.js';
import * as goals from './views/goals.js';
import * as media from './views/media.js';
import * as vision from './views/vision.js';
import * as settings from './views/settings.js';

const VIEWS = { today, stats, game, goals, media, vision, settings, more: { render: settings.renderMore } };
const SHEETS = { goal: goals.sheet, media: media.sheet, domain: settings.sheet };
const MODULES = [today, stats, game, goals, media, vision, settings];
const actions = Object.assign({}, ...MODULES.map(m => m.actions || {}), {
  tab(el) {
    ui.tab = el.dataset.tab; setPref('tab', ui.tab);
    ui.visionEdit = false; ui.sheet = null;
    if (ui.tab === 'today') ui.day = todayKey();
    scrollTo({ top: 0 });
  },
  closeSheet() { closeSheet(); },
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
  const warn = storageOK ? '' : '<div class="card warn">Ce navigateur bloque l’enregistrement (navigation privée ?). Tes données seront perdues à la fermeture.</div>';
  morphdom(app, `<main id="app" class="view-${ui.tab}">${warn}${view.render()}</main>`, MORPH);

  if (ui.sheet !== lastSheet) {
    lastSheet = ui.sheet;
    if (ui.sheet) {
      const html = (SHEETS[ui.sheet.kind] || (() => ''))(ui.sheet);
      sheetRoot.innerHTML = `<div class="backdrop" data-act="closeSheet"></div>
        <div class="sheet" role="dialog" aria-modal="true"><button class="icon-btn sheet-x" data-act="closeSheet" aria-label="Fermer">${ico('close')}</button>${html}</div>`;
      sheetRoot.hidden = false;
      requestAnimationFrame(() => sheetRoot.classList.add('open'));
      document.body.classList.add('lock');
    } else {
      sheetRoot.classList.remove('open');
      document.body.classList.remove('lock');
      setTimeout(() => { if (!ui.sheet) { sheetRoot.hidden = true; sheetRoot.innerHTML = ''; } }, 250);
    }
  }
  // Le calendrier s'ouvre sur les semaines les plus récentes
  const hs = app.querySelector('[data-scroll-end]');
  if (hs && !hs.dataset.done) { hs.scrollLeft = hs.scrollWidth; hs.dataset.done = '1'; }
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
document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.sheet) closeSheet(); });
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

render();
if (sync && sync.on) syncNow();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
