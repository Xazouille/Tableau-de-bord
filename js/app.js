// Point d'entrée : affichage des écrans, navigation et gestion des clics / saisies.
import morphdom from './vendor/morphdom.js';
import { S, onChange, storageOK, sync, syncNow, save, touch, DEMO, setDemo, replaceAll, leaving, activeDomains } from './store.js';
import { ui, setRender, setPref, pref, closeSheet, ico, pushModal, popModal, setBackHandler, banner } from './ui.js';
import { makeDemo } from './demo.js';
import { G, awardBadges } from './game/rules.js';
import { showLevelUp, overlayOpen, requestClose, startBox, showBossKO, showRecap } from './game/opening.js';
import { chestHTML } from './game/gacha.js';
import { TIERS, TIER_KEYS, levelRewards } from './game/tiers.js';
import { RANKS, rankOf } from './game/mastery.js';
import { records, recapReady, weekRecap } from './game/weekly.js';
import { worn, applyLook } from './game/cosmetics.js';
import { globalBest, domainBest } from './stats.js';
import { confetti } from './fx.js';
import { todayKey, dayDiff, key, today as todayD, addDays, weekStart } from './util.js';
import { fmtMoney } from './measures.js';
import * as today from './views/today.js';
import * as stats from './views/stats.js';
import * as game from './views/game.js';
import * as goals from './views/goals.js';
import * as media from './views/media.js';
import * as vision from './views/vision.js';
import * as settings from './views/settings.js';
import * as growth from './views/growth.js';
import { timerState, tick } from './timer.js';
import { showMonthRecap } from './game/opening.js';
import { HABIT_STEPS, STAR_RULES, monthKey, prevMonth, reviewDone } from './game/growth.js';
import { IDENT_XP } from './game/identity.js';

const VIEWS = { today, stats, game, goals, media, vision, settings, growth, more: { render: settings.renderMore } };
const SHEETS = { goal: goals.sheet, media: media.sheet, domain: settings.sheet, measure: today.sheet, card: game.sheet, odds: game.oddsSheet, shop: game.shopSheet, boss: game.bossSheet, look: game.lookSheet, timer: today.timerSheet, chal: game.chalSheet, plans: today.plansSheet, ui: settings.uiSheet };
const MODULES = [today, stats, game, goals, media, vision, settings, growth];
const actions = Object.assign({}, ...MODULES.map(m => m.actions || {}), {
  tab(el) {
    if (ui.tab !== el.dataset.tab) ui.collNewSince = null;
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
  applyLook(worn(G()).theme);
  const navTab = ['media', 'vision', 'settings', 'growth'].includes(ui.tab) ? 'more' : ui.tab;
  document.querySelectorAll('nav.tabs [data-tab]').forEach(b => {
    const on = b.dataset.tab === ui.tab || (b.classList.contains('m-only') && b.dataset.tab === navTab);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });

  const view = VIEWS[ui.tab] || today;
  const demo = DEMO ? '<button class="demo-bar" data-act="demoOff">🧪 Mode démo : tout est débloqué · <b>Quitter la démo</b></button>' : '';
  const warn = storageOK ? '' : '<div class="card warn">Ce navigateur bloque l’enregistrement (navigation privée ?). Tes données seront perdues à la fermeture.</div>';
  // Un identifiant par onglet : changer d'onglet remplace la page (et rejoue son animation d'entrée)
  // Minuteur en cours : une pastille visible partout
  const tm = timerState(), tmDom = tm && S.domains.list.find(d => d.id === tm.dom);
  const pill = tmDom ? `<button class="timer-pill ${tm.paused ? 'paused' : ''}" data-act="timerOpen" style="--c:${tmDom.color}">⏱️ <span>${tmDom.name}</span><b data-timer></b>${tm.paused ? '<small>en pause</small>' : ''}</button>` : '';
  morphdom(app, `<main id="app" class="view-${ui.tab}">${demo}${warn}${pill}<div class="page" id="pg-${ui.tab}">${view.render()}</div></main>`, MORPH);
  if (tm) tick();

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

    announceRecords(g);
    announceMastery(g);
    announceAlbums(g);
    announceBoss(g);
    announceGrowth(g);
    announceIdentity(g);

    // Un seul grand écran à la fois : boss vaincu, puis bilan de la semaine
    if (overlayOpen() || ui.sheet) return;
    const hist = g.boss.history, bSeen = pref('bossSeen');
    if (bSeen == null || Number(bSeen) > hist.length) setPref('bossSeen', hist.length);
    else if (hist.length > Number(bSeen)) {
      const fresh = hist.slice(Number(bSeen));
      setPref('bossSeen', hist.length);
      fresh.filter(b => !b.won).forEach(b => banner({ icon: '💨', title: `${b.name} s’est enfui…`, sub: 'Il reviendra plus tard. Un nouveau boss t’attend !', color: '#64748b' }));
      const won = fresh.filter(b => b.won);
      if (won.length) { showBossKO(won[won.length - 1]); return; }
    }
    // Nouveau mois : le bilan du mois dernier (une fois)
    const cm = monthKey(todayD()), pm = monthKey(prevMonth());
    if (pref('monthSeen') == null) setPref('monthSeen', cm);
    else if (pref('monthSeen') !== cm) {
      setPref('monthSeen', cm);
      if (!reviewDone(S.reviews[pm]) && Object.keys(S.days).some(k => k.startsWith(pm))) { showMonthRecap(pm); return; }
    }
    const ws = recapReady(weekStart(todayD())) ? weekStart(todayD()) : addDays(weekStart(todayD()), -7), wk = key(ws);
    if (pref('recapSeen') !== wk) {
      setPref('recapSeen', wk);
      if (key(addDays(ws, 6)) >= S.game.since) showRecap({ ...weekRecap(ws, g), live: wk === key(weekStart(todayD())) });
    }
  } catch (e) { console.error(e); }
  finally { checking = false; }
}

// Records battus : meilleure journée, meilleure semaine, plus longues séries, plus gros total d'argent
function announceRecords(g) {
  const rec = records(g), tk = todayKey(), wk = key(weekStart(todayD()));
  const cur = { day: rec.day.v, week: rec.week.v, streak: globalBest(), money: rec.money.v, dom: {} };
  for (const d of activeDomains()) cur.dom[d.id] = domainBest(d.id);
  let rs = null;
  try { rs = JSON.parse(pref('records')); } catch (e) {}
  if (!rs) { setPref('records', JSON.stringify({ ...cur, dayK: '', weekK: '' })); return; }
  const out = { ...rs, dom: { ...(rs.dom || {}) } }, ban = (icon, title, sub) => banner({ icon, title, sub, color: '#f59e0b', cls: 'gold-ban' });
  const enough = Object.keys(S.days).length >= 14;
  if (cur.day > rs.day) { if (enough && rec.day.k === tk && rs.dayK !== tk) { ban('🏆', 'Record : ta meilleure journée !', `${cur.day} XP aujourd’hui`); out.dayK = tk; } out.day = cur.day; }
  if (cur.week > rs.week) { if (enough && rec.week.k === wk && rs.weekK !== wk) { ban('📈', 'Record : ta meilleure semaine !', `${cur.week.toLocaleString('fr-FR')} XP cette semaine`); out.weekK = wk; } out.week = cur.week; }
  if (cur.streak > rs.streak) { if (cur.streak >= 3) ban('🔥', `Record de série : ${cur.streak} jours !`, 'Tu n’as jamais tenu aussi longtemps'); out.streak = cur.streak; }
  for (const d of activeDomains()) {
    const n = cur.dom[d.id], was = rs.dom ? rs.dom[d.id] : undefined;
    if (was !== undefined && n > was && n >= 5) ban(d.emoji, `Record : ${d.name} ${n} jours d’affilée !`, 'Ta plus longue série dans ce domaine');
    out.dom[d.id] = Math.max(n, was || 0);
  }
  if (cur.money > rs.money) { if (rs.money > 0) ban('💰', 'Record d’épargne !', `${fmtMoney(cur.money)} au total`); out.money = cur.money; }
  if (JSON.stringify(out) !== JSON.stringify(rs)) setPref('records', JSON.stringify(out));
}

// Maîtrise : un niveau de plus dans un domaine, ou un nouveau rang (grande box)
function announceMastery(g) {
  const lv = {};
  for (const [id, m] of Object.entries(g.mastery)) lv[id] = m.level;
  let ms = null;
  try { ms = JSON.parse(pref('mastery')); } catch (e) {}
  if (ms) for (const d of activeDomains()) {
    const m = g.mastery[d.id];
    if (!m || !ms[d.id] || m.level <= ms[d.id]) continue;
    const up = m.rank > rankOf(ms[d.id]);
    banner({ icon: d.emoji, title: up ? `Nouveau rang : ${RANKS[m.rank][0]} ${RANKS[m.rank][2]}` : `${d.name} · niveau ${m.level}`,
      sub: up ? `${d.name} niveau ${m.level} · grande box gagnée !` : `Maîtrise ${RANKS[m.rank][0]} · ${m.need - m.into} pts avant le niveau ${m.level + 1}`, color: RANKS[m.rank][1], cls: up ? 'gold-ban' : '' });
    if (up) setTimeout(() => confetti(140), 300);
  }
  if (!ms || Object.keys(lv).some(id => lv[id] !== ms[id])) setPref('mastery', JSON.stringify(lv));
}

function announceAlbums(g) {
  const done = g.albums.filter(a => a.done).map(a => a.id);
  let al = null;
  try { al = JSON.parse(pref('albums')); } catch (e) {}
  if (al) for (const a of g.albums) if (a.done && !al.includes(a.id)) banner({ icon: a.emoji, title: `Album complété : ${a.name} !`, sub: `Grande box + titre « ${a.title} »`, color: '#f59e0b', cls: 'gold-ban' });
  if (!al || done.length !== al.length) setPref('albums', JSON.stringify(done));
}

// Habitudes : nouveau palier ; compétences : nouvelle étoile validée par la pratique
function announceGrowth(g) {
  let seen = null;
  try { seen = JSON.parse(pref('growth')); } catch (e) {}
  const now = { h: {}, s: {} };
  for (const h of g.habits) now.h[h.id] = HABIT_STEPS.filter(([d]) => h.best >= d).length;
  for (const s of g.skills) now.s[s.id] = s.validated + (s.sessions ? 1 : 0) * 10;
  if (seen) {
    for (const h of g.habits) {
      const n = now.h[h.id], was = seen.h[h.id] ?? n;
      if (n > was) { const st = HABIT_STEPS[n - 1]; banner({ icon: h.emoji || '🛑', title: `${st[0]} ${st[0] > 1 ? 'jours' : 'jour'} sans ${h.name} !`, sub: `+${st[1]} XP${st[2] ? ` · ${TIERS[st[2]].name} gagnée` : ''}`, color: '#22c55e', cls: 'gold-ban' }); }
    }
    for (const s of g.skills) {
      const was = seen.s[s.id];
      if (was === undefined) continue;
      if (was < 10 && s.sessions) banner({ icon: s.emoji || '🧠', title: `Nouvelle compétence : ${s.name} !`, sub: '+30 XP · première séance', color: '#6366f1' });
      if (s.validated > was % 10) { const r = STAR_RULES[s.validated]; banner({ icon: '⭐', title: `${s.name} : ${s.validated}★ validées !`, sub: `+${r[1]} XP${r[2] ? ` · ${TIERS[r[2]].name} gagnée` : ''} · ta pratique paie`, color: '#f59e0b', cls: 'gold-ban' }); }
    }
  }
  if (JSON.stringify(now) !== JSON.stringify(seen)) setPref('growth', JSON.stringify(now));
}

// Identités : un nouveau palier « Je suis… » dans un domaine
function announceIdentity(g) {
  const now = {};
  for (const [id, x] of Object.entries(g.identity)) now[id] = x.stage;
  let seen = null;
  try { seen = JSON.parse(pref('ident')); } catch (e) {}
  if (seen) for (const d of activeDomains()) {
    const x = g.identity[d.id];
    if (!x || seen[d.id] === undefined || x.stage <= seen[d.id]) continue;
    banner({ icon: d.emoji, title: `Tu es maintenant : ${x.name}`, sub: `${x.n} jours de ${d.name} · +${IDENT_XP[x.stage - 1]} XP · nouveau titre`, color: d.color, cls: 'gold-ban', ms: 4200 });
    if (x.stage >= 4) setTimeout(() => confetti(120), 300);
  }
  if (JSON.stringify(now) !== JSON.stringify(seen)) setPref('ident', JSON.stringify(now));
}

// Nouveau boss en vue
function announceBoss(g) {
  const b = g.boss.current;
  if (!b || pref('bossCur') === String(b.n)) return;
  setPref('bossCur', b.n);
  const wd = S.domains.list.find(d => d.id === b.weak);
  banner({ icon: b.legendary ? '🐉' : '⚔️', title: `${b.legendary ? 'Boss légendaire' : 'Nouveau boss'} : ${b.name} !`, sub: `${b.hp.toLocaleString('fr-FR')} PV · point faible ${wd ? wd.emoji + ' ' + wd.name : ''} · 7 jours pour le battre`,
    color: b.legendary ? '#f59e0b' : '#ef4444', onTap: () => { ui.sheet = { kind: 'boss' }; render(); } });
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
