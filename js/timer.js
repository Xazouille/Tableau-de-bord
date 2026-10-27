// Minuteur : une séance chronométrée (révision, méditation, sport…) qui coche la case toute seule à la fin.
// Le minuteur est gardé sur l'appareil : il continue même si l'appli est fermée ou mise en arrière-plan.
import { S, save, setDone, setVal, isDone } from './store.js';
import { pref, setPref, ui, banner, rerender } from './ui.js';
import { todayKey, plural } from './util.js';
import { PRESETS } from './measures.js';
import { confetti, buzz } from './fx.js';

const KEY = 'timer';
export function timerState() {
  try { const t = JSON.parse(pref(KEY)); return t && t.dom ? t : null; } catch (e) { return null; }
}
const store = t => setPref(KEY, t ? JSON.stringify(t) : '');

// Minutes de chaque option (« 15 min », « 1 h », « 2 h et + »…)
export function optMinutes(d, i) {
  const o = d.m && d.m.opts && d.m.opts[i];
  if (!o) return 0;
  if (o[2]) return o[2];
  const pr = PRESETS[d.id] && PRESETS[d.id].opts && PRESETS[d.id].opts[i];
  if (pr && pr[0] === o[0] && pr[2]) return pr[2];
  const h = /(\d+)\s*h/.exec(o[0]), m = /(\d+)\s*min/.exec(o[0]);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0);
}
// Cases qu'on peut chronométrer : celles dont le détail est un temps
export const timedDomains = () => S.domains.list.filter(d => !d.archived && d.m && (d.m.kind === 'levels' || d.m.kind === 'skill') && d.m.opts.some((_, i) => optMinutes(d, i) > 0));

export const elapsedMs = t => (t.paused ? t.done : t.done + Date.now() - t.start);
export const remainingMs = t => Math.max(0, t.mins * 60000 - elapsedMs(t));
export const fmtClock = ms => { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return `${m}:${String(s % 60).padStart(2, '0')}`; };

let wake = null;
async function keepAwake(on) {
  try {
    if (on && !wake && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); }
    if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}

export function startTimer(domId, mins, skill) {
  store({ dom: domId, mins, skill: skill || '', start: Date.now(), done: 0, paused: false, day: todayKey() });
  keepAwake(true); tick();
}
export function pauseTimer() {
  const t = timerState(); if (!t) return;
  if (t.paused) { t.paused = false; t.start = Date.now(); keepAwake(true); }
  else { t.done = elapsedMs(t); t.paused = true; keepAwake(false); }
  store(t); tick();
}
// Arrêt : la case est cochée avec le temps vraiment fait (si c'est au moins le premier palier)
export function stopTimer(validate = true) {
  const t = timerState(); if (!t) return;
  store(null); keepAwake(false);
  if (validate) finish(t, Math.floor(elapsedMs(t) / 60000)); else rerender();
}

function finish(t, mins) {
  const d = S.domains.list.find(x => x.id === t.dom);
  if (!d) { rerender(); return; }
  let lvl = -1;
  d.m.opts.forEach((_, i) => { const m = optMinutes(d, i); if (m && mins >= m) lvl = i; });
  if (lvl < 0) {
    banner({ icon: '⏱️', title: 'Séance trop courte', sub: `${plural(mins, 'minute', 'minutes')} : il faut au moins ${optMinutes(d, 0)} min pour cocher ${d.name}`, color: '#64748b' });
    rerender(); return;
  }
  const k = t.day || todayKey();
  setDone(k, d.id, true);
  setVal(k, d.id, d.m.kind === 'skill' ? { s: t.skill || '', v: lvl } : lvl);
  save();
  confetti(120); buzz([60, 40, 60, 40, 160]);
  banner({ icon: d.emoji, title: `${d.name} : séance terminée !`, sub: `${d.m.opts[lvl][0]} · case cochée ✓`, color: d.color, cls: 'gold-ban' });
}

// Appelé chaque seconde : met à jour l'affichage, termine la séance quand le temps est écoulé
export function tick() {
  const t = timerState();
  document.querySelectorAll('[data-timer]').forEach(el => { el.textContent = t ? fmtClock(remainingMs(t)) : ''; });
  const ring = document.querySelector('.tm-ring .tm-arc');
  if (ring && t) ring.style.strokeDashoffset = String(ring.dataset.c * (1 - remainingMs(t) / (t.mins * 60000)));
  if (t && !t.paused && remainingMs(t) <= 0) { store(null); keepAwake(false); ui.sheet = null; finish(t, t.mins); }
}
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => { const t = timerState(); if (document.visibilityState === 'visible' && t && !t.paused) keepAwake(true); });
export const isTimed = id => { const t = timerState(); return !!t && t.dom === id && !isDone(t.day || todayKey(), id); };
