// Données de l'appli : valeurs par défaut, enregistrement sur l'appareil,
// fusion entre deux appareils et synchro via un dépôt GitHub privé.
import { todayKey, uid } from './util.js';
import { PRESETS, DEFAULT_XP } from './measures.js';

// Mode démo : un compte de démonstration rangé à part (les vraies données ne sont pas touchées)
export const DEMO = (() => { try { return localStorage.getItem('tdb2-demo') === '1'; } catch (e) { return false; } })();
export let leaving = false;   // l'appli se recharge : plus rien ne doit être enregistré
export function setDemo(on) {
  leaving = true;
  try {
    if (on) localStorage.setItem('tdb2-demo', '1');
    else Object.keys(localStorage).filter(k => k === 'tdb2-demo' || k.startsWith('tdb2-demo-')).forEach(k => localStorage.removeItem(k));
  } catch (e) {}
  location.reload();
}
const KEY = DEMO ? 'tdb2-demo-data' : 'tdb2-data';
const SYNC_KEY = 'tdb2-sync', OLD_SYNC_KEY = 'tdb-sync', SYNC_FILE = 'tableau-de-bord-v2.json';

export const COLORS = ['#4f8cff', '#9b6bff', '#ff5a5f', '#f5b700', '#ff8a3d', '#22c55e', '#14c8c8', '#6c7bff', '#ff4fa3', '#00b3ff', '#e879f9', '#84cc16'];

const DEFAULT_DOMAINS = [
  ['ecole', 'École', '🎓', '#4f8cff', 'Réviser, avancer un cours'],
  ['echecs', 'Échecs', '♟️', '#9b6bff', 'Puzzles ou une partie analysée'],
  ['sport', 'Sport', '🏃', '#ff5a5f', 'Même 10 minutes, ça compte'],
  ['argent', 'Argent', '💰', '#f5b700', 'Un point sur mes finances'],
  ['culture', 'Culture & Lecture', '📚', '#ff8a3d', 'Lire, un film, un podcast…'],
  ['alim', 'Alimentation', '🥗', '#22c55e', 'Manger sainement'],
  ['medit', 'Méditation', '🧘', '#14c8c8', 'Quelques minutes au calme'],
  ['sommeil', 'Sommeil', '😴', '#6c7bff', 'Une vraie nuit de sommeil'],
  ['ecran', 'Écran < 2h', '📵', '#ff4fa3', 'Moins de 2 h sur le téléphone'],
  ['scroll', 'Pas de scroll', '🙅', '#00b3ff', 'Zéro réseau en scroll infini'],
].map(([id, name, emoji, color, hint]) => ({ id, name, emoji, color, hint, archived: false, xp: DEFAULT_XP[id], m: PRESETS[id] }));

const DEFAULT_VISION = [
  { id: 'devenir', title: 'Qui je veux devenir', text: '' },
  { id: 'pense', title: 'Ce que je pense', text: '' },
];

export function defaults() {
  return {
    v: 2,
    meta: { modified: 0 },
    profile: { name: 'Aaron', start: todayKey(), u: 0 },
    settings: { theme: 'auto', threshold: 0.5, u: 0 },
    domains: { list: DEFAULT_DOMAINS.map(d => ({ ...d })), u: 0 },
    days: {},
    goals: [],
    media: [],
    vision: { blocks: DEFAULT_VISION.map(b => ({ ...b })), u: 0 },
    game: { pulls: [], trades: [], visits: {}, badges: {}, jokerDays: {}, comp: [], rewards: [], u: 0 },
    dead: {},
  };
}

// Complète des données venant d'une version plus ancienne ou d'un autre appareil
function normalize(d) {
  const def = defaults();
  const o = Object.assign(defaults(), d || {});
  for (const k of ['meta', 'profile', 'settings', 'domains', 'vision', 'game']) o[k] = Object.assign(def[k], o[k] && typeof o[k] === 'object' ? o[k] : {});
  for (const k of ['days', 'dead']) if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {};
  for (const k of ['goals', 'media']) if (!Array.isArray(o[k])) o[k] = [];
  if (!Array.isArray(o.domains.list)) o.domains.list = defaults().domains.list;
  if (!Array.isArray(o.vision.blocks)) o.vision.blocks = defaults().vision.blocks;
  // Domaines d'une version sans XP ni détail : on reprend les réglages par défaut
  for (const d of o.domains.list) {
    if (d.xp == null) d.xp = DEFAULT_XP[d.id] ?? 15;
    if (!d.m) d.m = PRESETS[d.id] || { kind: 'none' };
  }
  const g = o.game;
  for (const k of ['pulls', 'trades', 'comp', 'rewards']) if (!Array.isArray(g[k])) g[k] = [];
  for (const k of ['visits', 'badges', 'jokerDays']) if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {};
  return o;
}

export let storageOK = true;
function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { storageOK = false; }
  if (raw) {
    try { return normalize(JSON.parse(raw)); }
    catch (e) { try { localStorage.setItem(KEY + '-illisible-' + Date.now(), raw); } catch (_) {} }
  }
  return defaults();
}

export let S = load();

const listeners = new Set();
export const onChange = fn => listeners.add(fn);
const emit = () => listeners.forEach(fn => fn());

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; }
  catch (e) { storageOK = false; }
}
// Enregistre une modification : sur l'appareil, puis en ligne si la synchro est active
export function save() {
  if (leaving) return;
  S.meta.modified = Date.now();
  persist();
  schedulePush();
  emit();
}
export const touch = o => { o.u = Date.now(); return o; };
export function replaceAll(d) { S = normalize(d); save(); }
export function resetAll() { S = defaults(); save(); }

/* ---------- Jours ---------- */
export const dayOf = k => S.days[k];
export const isDone = (k, id) => !!(S.days[k] && S.days[k].c && S.days[k].c[id]);
export function setDone(k, id, val) {
  const day = S.days[k] || { c: {}, note: '' };
  if (!day.c) day.c = {};
  if (val) day.c[id] = 1; else delete day.c[id];
  S.days[k] = touch(day);
}
// Détail de ce qui a été fait (temps, liste, montant…)
export const valOf = (k, id) => S.days[k] && S.days[k].x ? S.days[k].x[id] : undefined;
export function setVal(k, id, v) {
  const day = S.days[k] || { c: {}, note: '' };
  day.x = day.x || {};
  if (v == null) delete day.x[id]; else day.x[id] = v;
  S.days[k] = touch(day);
}
export function setNote(k, note) {
  const day = S.days[k] || { c: {}, note: '' };
  day.note = note;
  S.days[k] = touch(day);
}
export const activeDomains = () => S.domains.list.filter(d => !d.archived);

/* ---------- Listes (objectifs, médiathèque) ---------- */
export function upsert(list, item) {
  touch(item);
  const i = S[list].findIndex(x => x.id === item.id);
  if (i >= 0) S[list][i] = item; else S[list].push(item);
  return item;
}
export function remove(list, id) {
  S[list] = S[list].filter(x => x.id !== id);
  S.dead[id] = Date.now();
}
export const newId = uid;

/* ---------- Fusion de deux versions ---------- */
// Chaque élément porte l'heure de sa dernière modification (u) : la plus récente gagne.
export function merge(a, b) {
  a = normalize(JSON.parse(JSON.stringify(a)));
  b = normalize(JSON.parse(JSON.stringify(b)));
  const newer = (x, y) => ((y && y.u) || 0) > ((x && x.u) || 0) ? y : x;
  const m = normalize({});
  m.dead = { ...a.dead };
  for (const [id, t] of Object.entries(b.dead)) m.dead[id] = Math.max(m.dead[id] || 0, t);
  for (const k of ['profile', 'settings', 'domains', 'vision']) m[k] = newer(a[k], b[k]);
  m.game = mergeGame(a.game, b.game, m.dead);
  m.days = { ...a.days };
  for (const [k, d] of Object.entries(b.days)) m.days[k] = newer(m.days[k], d);
  for (const list of ['goals', 'media']) {
    const byId = new Map();
    for (const it of [...a[list], ...b[list]]) byId.set(it.id, newer(byId.get(it.id), it));
    m[list] = [...byId.values()].filter(it => !(m.dead[it.id] >= (it.u || 0)));
  }
  m.meta = { modified: Date.now() };
  return m;
}
// Le jeu ne fait qu'ajouter des événements (box ouvertes, jours d'ouverture, badges…) : on garde l'union des deux.
function mergeGame(a, b, dead) {
  const byId = (x, y) => { const m = new Map(); for (const it of [...x, ...y]) m.set(it.id, it); return [...m.values()].sort((p, q) => (p.t || 0) - (q.t || 0)); };
  const newerById = (x, y) => { const m = new Map(); for (const it of [...x, ...y]) { const o = m.get(it.id); if (!o || (it.u || 0) > (o.u || 0)) m.set(it.id, it); } return [...m.values()]; };
  const badges = { ...b.badges };
  for (const [id, d] of Object.entries(a.badges)) badges[id] = badges[id] && badges[id] < d ? badges[id] : d;
  return {
    ...a,
    pulls: byId(a.pulls, b.pulls), trades: byId(a.trades, b.trades), comp: byId(a.comp, b.comp),
    visits: { ...a.visits, ...b.visits }, jokerDays: { ...a.jokerDays, ...b.jokerDays }, badges,
    rewards: newerById(a.rewards, b.rewards).filter(r => !(dead[r.id] >= (r.u || 0))),
    u: Math.max(a.u || 0, b.u || 0),
  };
}

/* ---------- Synchro PC ↔ téléphone (dépôt GitHub privé) ---------- */
// Réglages propres à chaque appareil : jamais exportés ni synchronisés
export let sync = (() => {
  if (DEMO) return null;
  try {
    const s = JSON.parse(localStorage.getItem(SYNC_KEY));
    if (s) return s;
    // Reprend le dépôt et la clé de l'ancienne version du tableau de bord
    const old = JSON.parse(localStorage.getItem(OLD_SYNC_KEY));
    if (old && old.repo && old.token) return { repo: old.repo, token: old.token, on: !!old.on };
  } catch (e) {}
  return null;
})();
let pushTimer = null, syncing = false, syncAgain = false;
const saveSync = () => { if (DEMO) return; try { if (sync) localStorage.setItem(SYNC_KEY, JSON.stringify(sync)); else localStorage.removeItem(SYNC_KEY); } catch (e) {} };
const b64enc = s => { const b = new TextEncoder().encode(s); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); };
const b64dec = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g, '')), ch => ch.charCodeAt(0)));
const ghFetch = (path, opts = {}) => fetch(`https://api.github.com/repos/${sync.repo}${path}`, Object.assign({ cache: 'no-store' }, opts, {
  headers: Object.assign({ Authorization: `Bearer ${sync.token}`, Accept: 'application/vnd.github+json' }, opts.headers || {}),
}));
const ghError = st => st === 401 ? 'Clé refusée par GitHub (expirée ou mal copiée). Crée-en une nouvelle.'
  : st === 403 ? 'La clé n’a pas le droit d’écrire dans le dépôt : il faut la permission « Contents : Read and write ».'
  : st === 404 ? 'Dépôt introuvable : vérifie le nom (pseudo/dépôt) et que la clé a accès à ce dépôt.'
  : `GitHub a répondu une erreur (${st}). Réessaie plus tard.`;

function schedulePush() {
  if (!sync || !sync.on) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(syncNow, 2500);
}
export function enableSync(repo, token) {
  if (DEMO) return Promise.resolve();
  sync = { repo, token, on: true };
  saveSync();
  return syncNow();
}
export function disableSync() { sync = null; saveSync(); emit(); }

export async function syncNow(attempt = 0) {
  if (DEMO || !sync || !sync.on) return;
  if (syncing) { syncAgain = true; return; }
  if (!navigator.onLine) { sync.err = 'Hors ligne : la synchro reprendra au retour d’internet.'; saveSync(); return; }
  clearTimeout(pushTimer);
  syncing = true;
  let changedLocal = false, retry = false;
  try {
    let res = await ghFetch(`/contents/${SYNC_FILE}`);
    let remote = null, sha = null;
    if (res.ok) { const j = await res.json(); sha = j.sha; remote = JSON.parse(b64dec(j.content)); }
    else if (res.status !== 404) throw new Error(ghError(res.status));
    const localDirty = (S.meta.modified || 0) > (sync.syncedAt || 0);
    const remoteChanged = !!remote && sha !== sync.sha;
    let mustPush = !remote || localDirty;
    if (remoteChanged) {
      if (!sync.sha || localDirty) { S = merge(S, remote); mustPush = true; }
      else { S = normalize(remote); mustPush = false; }    // rien de neuf ici : on prend la version en ligne
      persist(); changedLocal = true;
    }
    if (mustPush) {
      const body = { message: `Synchro du ${new Date().toLocaleString('fr-FR')}`, content: b64enc(JSON.stringify(S)) };
      if (sha) body.sha = sha;
      const sentMod = S.meta.modified;
      res = await ghFetch(`/contents/${SYNC_FILE}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if ((res.status === 409 || res.status === 422) && attempt < 2) { retry = true; return; }   // modifié ailleurs entre-temps : on recommence
      if (!res.ok) throw new Error(ghError(res.status));
      sha = (await res.json()).content.sha;
      sync.syncedAt = sentMod;
    } else sync.syncedAt = S.meta.modified;
    sync.sha = sha; sync.last = Date.now(); sync.err = '';
  } catch (e) {
    sync.err = e instanceof TypeError ? 'Connexion à GitHub impossible — vérifie ta connexion internet.' : (e.message || 'Synchro impossible');
  } finally {
    syncing = false; saveSync();
    if (retry) syncNow(attempt + 1);
    else {
      emit();
      // Modifications faites pendant la synchro : on renvoie (sauf en cas d'erreur, pour ne pas boucler)
      if (sync && !sync.err && (syncAgain || (S.meta.modified || 0) > (sync.syncedAt || 0))) schedulePush();
      syncAgain = false;
    }
  }
  return changedLocal;
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
