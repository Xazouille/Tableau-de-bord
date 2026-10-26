// État de l'interface (onglet ouvert, fenêtre ouverte…) et petits composants partagés.
import { todayKey, esc } from './util.js';

const PFX = (() => { try { return localStorage.getItem('tdb2-demo') === '1' ? 'tdb2-demo-' : 'tdb2-'; } catch (e) { return 'tdb2-'; } })();
export const pref = k => { try { return localStorage.getItem(PFX + k); } catch (e) { return null; } };
export const setPref = (k, v) => { try { localStorage.setItem(PFX + k, v); } catch (e) {} };

export const ui = {
  tab: pref('tab') || 'today',
  day: todayKey(),          // jour affiché sur l'écran Aujourd'hui
  sheet: null,              // fenêtre ouverte : { kind, ...données }
  heatDom: 'all',
  goalFilter: 'open',
  mediaType: 'all', mediaStatus: 'done',
  visionEdit: false,
  justDone: null,           // case qui vient d'être cochée (animation)
  install: null,
};

let renderFn = () => {};
export const setRender = fn => { renderFn = fn; };
export const rerender = () => renderFn();

export function openSheet(sheet) { ui.sheet = sheet; rerender(); }
export function closeSheet() { ui.sheet = null; rerender(); }

// Bouton « retour » du téléphone : tant qu'une fenêtre est ouverte (fiche ou animation), l'historique a une entrée en plus.
// Le retour ferme la fenêtre du dessus au lieu de quitter l'appli. Un history.back() est asynchrone : on attend
// qu'il soit terminé avant d'ajouter une nouvelle entrée, sinon l'historique se décale et un retour fait sortir de l'appli.
let modals = 0, hasEntry = false, backing = false, backHandler = () => {};
export const setBackHandler = fn => { backHandler = fn; };
export function pushModal() { modals++; syncHistory(); }
export function popModal() { if (modals > 0) modals--; syncHistory(); }
function syncHistory() {
  if (backing) return;
  try {
    if (modals > 0 && !hasEntry) { history.pushState({ lvModal: 1 }, ''); hasEntry = true; }
    else if (!modals && hasEntry) { hasEntry = false; backing = true; history.back(); }
  } catch (e) { backing = false; }
}
addEventListener('popstate', () => {
  if (backing) { backing = false; syncHistory(); return; }
  if (!hasEntry) return;
  hasEntry = false;
  backHandler();
  syncHistory();
});

// Bannières de récompense qui glissent depuis le haut (badge, box gagnée, journée parfaite…)
// Elles attendent la fin d'une invocation pour ne rien gâcher, et sautent celles devenues inutiles (b.still)
const banners = [];
let bannerOn = false, held = false;
export function banner(b) {
  banners.push(b);
  if (!bannerOn) nextBanner();
}
export function holdBanners(on) {
  held = on;
  if (!on && !bannerOn) nextBanner();
}
function nextBanner() {
  let b = banners.shift();
  while (b && b.still && !b.still()) b = banners.shift();
  if (!b || held) { if (b) banners.unshift(b); bannerOn = false; return; }
  bannerOn = true;
  let root = document.getElementById('banners');
  if (!root) { root = document.createElement('div'); root.id = 'banners'; document.body.appendChild(root); }
  const el = document.createElement('button');
  el.className = 'ban ' + (b.cls || '');
  el.style.setProperty('--bc', b.color || '#9b6bff');
  el.innerHTML = `<span class="ban-ico">${b.icon || '🎉'}</span><span class="ban-txt"><b>${esc(b.title)}</b>${b.sub ? `<small>${esc(b.sub)}</small>` : ''}</span><span class="ban-shine"></span>`;
  let done = false;
  const hide = () => {
    if (done) return;
    done = true;
    el.classList.remove('in');
    setTimeout(() => { el.remove(); nextBanner(); }, 320);
  };
  el.addEventListener('click', () => { if (b.onTap) b.onTap(); hide(); });
  root.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
  setTimeout(hide, b.ms || 3400);
}

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

const P = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  stats: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  game: '<rect x="3" y="6" width="18" height="13" rx="4"/><path d="M7.5 12.5h4M9.5 10.5v4M15.5 11.5h.01M17.5 13.5h.01"/>',
  goals: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".7"/>',
  more: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
  media: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z"/>',
  vision: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5"/>',
};
export const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

// Étoiles de 0 à 5 (cliquables si name est donné)
export function stars(v, name) {
  let h = '';
  for (let i = 1; i <= 5; i++) {
    h += name
      ? `<button type="button" class="star ${i <= v ? 'on' : ''}" data-act="${name}" data-v="${i}" aria-label="${i} étoile${i > 1 ? 's' : ''}">★</button>`
      : `<span class="star ${i <= v ? 'on' : ''}">★</span>`;
  }
  return `<span class="stars" ${name ? 'role="radiogroup"' : `aria-label="${v} sur 5"`}>${h}</span>`;
}
export const empty = (emoji, title, text, btn = '') => `<div class="empty"><div class="e-emoji">${emoji}</div><h3>${esc(title)}</h3><p>${text}</p>${btn}</div>`;
