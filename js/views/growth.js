// Écran « Progrès » : qui je suis (identités), mes victoires, mes compétences (notées sur 5),
// les habitudes que j'arrête et les bilans du mois.
import { S, save, touch, newId, activeDomains } from '../store.js';
import { G } from '../game/rules.js';
import { STAR_RULES, STAR_NAMES, NEW_SKILL_XP, HABIT_STEPS, monthName, prevMonth, monthKey, reviewDone, WHY } from '../game/growth.js';
import { IDENT_AT, IDENT_XP } from '../game/identity.js';
import { victories, WIN_KINDS } from '../game/wins.js';
import { TIERS } from '../game/tiers.js';
import { showMonthRecap } from '../game/opening.js';
import { ui, ico, toast } from '../ui.js';
import { esc, plural, todayKey, fmtShort, parseKey, key, today, weekStart, cap } from '../util.js';
import { burst, buzz, confetti } from '../fx.js';

const SKILL_EMOJIS = ['🧠', '🗣️', '🇬🇧', '🎸', '🎹', '💻', '🎨', '📷', '✍️', '🍳', '♟️', '🧮', '📈', '🥊', '🏊', '🚗', '🎤', '🧩'];
const HABIT_EMOJIS = ['🍬', '🥤', '📱', '🎮', '🚬', '🍔', '😴', '🛋️', '🤬', '💸', '🍺', '⏰'];

function skills() {
  const g = G(), list = [...g.skills].sort((a, b) => (b.last || '').localeCompare(a.last || '') || b.stars - a.stars);
  return `<section class="card"><h2>🧠 Mes compétences</h2>
      <p class="muted small">Coche la case <b>Compétence</b> en choisissant ce que tu as travaillé. Note-toi toi-même de 1 à 5 étoiles : l’XP d’une étoile se débloque quand tu as assez pratiqué (${[2, 3, 4, 5].map(s => `${s}★ = ${STAR_RULES[s][0]} séances`).join(', ')}). Première séance d’une nouvelle compétence : +${NEW_SKILL_XP} XP.</p>
      <form class="g-add" data-form="skillAdd"><input name="name" maxlength="40" placeholder="Ajouter une compétence…" autocomplete="off" required><button class="btn sm primary">${ico('plus')}</button></form>
    </section>
    ${list.length ? `<div class="sk-list">${list.map(sk => {
      const pct = sk.next ? Math.min(100, Math.round(sk.sessions / sk.nextNeed * 100)) : 100;
      const pending = sk.stars > sk.validated;
      return `<div class="sk">
        <button class="sk-emoji" data-act="skillEmoji" data-id="${sk.id}" aria-label="Changer l’emoji">${esc(sk.emoji || '🧠')}</button>
        <div class="sk-main">
          <div class="sk-top"><b>${esc(sk.name)}</b><button class="icon-btn" data-act="skillDel" data-id="${sk.id}" aria-label="Supprimer">${ico('trash')}</button></div>
          <div class="sk-stars" role="radiogroup" aria-label="Mon niveau">${[1, 2, 3, 4, 5].map(s => `<button class="sk-star ${s <= sk.stars ? 'on' : ''} ${s <= sk.validated ? 'ok' : ''}" data-act="skillStar" data-id="${sk.id}" data-s="${s}" aria-label="${s} étoile${s > 1 ? 's' : ''}">★</button>`).join('')}<span class="sk-lvl">${STAR_NAMES[sk.stars]}</span></div>
          <div class="d-bar"><span style="width:${pct}%"></span></div>
          <small class="muted">${plural(sk.sessions, 'séance', 'séances')}${sk.last ? ` · dernière le ${fmtShort(parseKey(sk.last))}` : ''}${sk.next ? ` · ${sk.next}★ ${pending && sk.next <= sk.stars ? 'validée' : 'possible'} à ${sk.nextNeed} séances (+${STAR_RULES[sk.next][1]} XP${STAR_RULES[sk.next][2] ? `, ${TIERS[STAR_RULES[sk.next][2]].name.toLowerCase()}` : ''})` : ' · 5★ validées 🏆'}</small>
          ${pending ? `<small class="sk-pending">⏳ Tu t’es donné ${sk.stars}★ : l’XP arrive avec la pratique.</small>` : ''}
        </div></div>`;
    }).join('')}</div>` : '<p class="muted center pad">Aucune compétence pour l’instant. Ajoute-en une ici ou en cochant la case Compétence.</p>'}`;
}

function habits() {
  const g = G();
  return `<section class="card"><h2>🛑 Habitudes à arrêter</h2>
      <p class="muted small">Le compteur avance tout seul chaque jour. Paliers récompensés : ${HABIT_STEPS.map(([d, , b]) => `${d} j${b ? ` ${b === 'g' ? '🟡' : b === 'c' ? '🟣' : '🔵'}` : ''}`).join(' · ')}. En cas de rechute, appuie sur « J’ai craqué » : ton record et ses récompenses sont gardés.</p>
      <form class="g-add" data-form="habitAdd"><input name="name" maxlength="40" placeholder="Ex. Sucre, Réseaux sociaux, Grignotage…" autocomplete="off" required><button class="btn sm primary">${ico('plus')}</button></form>
    </section>
    ${g.habits.length ? `<div class="hb-list">${g.habits.map(h => {
      const nx = h.next, prev = HABIT_STEPS.filter(([d]) => d <= h.cur).pop(), base = prev ? prev[0] : 0;
      const pct = nx ? Math.round((h.cur - base) / (nx[0] - base) * 100) : 100;
      return `<div class="hb ${h.fellToday ? 'fell' : ''}">
        <div class="hb-top"><span class="hb-emoji">${esc(h.emoji || '🛑')}</span><b>${esc(h.name)}</b><button class="icon-btn" data-act="habitDel" data-id="${h.id}" aria-label="Supprimer">${ico('trash')}</button></div>
        <div class="hb-count"><b>${h.cur}</b><span>${h.cur > 1 ? 'jours sans' : 'jour sans'}</span></div>
        <div class="d-bar"><span style="width:${pct}%"></span></div>
        <small class="muted">${nx ? `Prochain palier : ${nx[0]} jours (+${nx[1]} XP${nx[2] ? `, ${TIERS[nx[2]].name.toLowerCase()}` : ''}) · encore ${plural(nx[0] - h.cur, 'jour', 'jours')}` : 'Tous les paliers atteints 👑'} · record ${plural(h.best, 'jour', 'jours')}${h.relapses ? ` · ${plural(h.relapses, 'rechute', 'rechutes')}` : ''}</small>
        <div class="row">${h.fellToday ? `<button class="btn sm ghost" data-act="habitUndo" data-id="${h.id}">Annuler la rechute d’aujourd’hui</button>` : `<button class="btn sm danger ghost" data-act="habitFail" data-id="${h.id}">😓 J’ai craqué</button>`}</div>
      </div>`;
    }).join('')}</div>` : '<p class="muted center pad">Ajoute une habitude que tu veux arrêter : le compteur démarre aujourd’hui.</p>'}`;
}


// Qui je suis : 7 paliers d'identité par domaine, débloqués par les jours pratiqués
function identity() {
  const g = G(), list = activeDomains().map(d => ({ d, id: g.identity[d.id] })).filter(x => x.id).sort((a, b) => b.id.stage - a.id.stage || b.id.n - a.id.n);
  const now = list.filter(x => x.id.stage);
  return `<section class="card"><h2>🪪 Qui je suis</h2>
      <p class="muted small">Chaque jour où tu coches une case, tu deviens un peu plus cette personne. ${IDENT_AT.length} paliers par domaine (${IDENT_AT.join(', ')} jours, soit environ 4 ans), jamais perdus : chaque palier rapporte de l’XP et devient un titre que tu peux porter.</p>
      ${now.length ? `<div class="id-now">${now.slice(0, 6).map(x => `<span class="id-chip" style="--c:${x.d.color}">${x.d.emoji} ${esc(x.id.name)}</span>`).join('')}</div>` : '<p class="muted small">Coche tes cases 3 jours dans un domaine pour ta première identité.</p>'}
    </section>
    <div class="id-list">${list.map(({ d, id }) => {
      const pct = id.nextAt ? Math.round((id.n - id.prevAt) / (id.nextAt - id.prevAt) * 100) : 100, open = ui.identOpen === d.id;
      return `<button class="idc ${open ? 'open' : ''}" style="--c:${d.color}" data-act="identOpen" data-id="${d.id}" aria-expanded="${open}">
        <span class="idc-emoji">${d.emoji}</span>
        <span class="idc-main">
          <small class="muted">${esc(d.name)} · ${plural(id.n, 'jour', 'jours')}</small>
          <b class="idc-name">${id.stage ? esc(id.name) : 'Pas encore…'}</b>
          <span class="idc-pips">${IDENT_AT.map((_, i) => `<i class="${i < id.stage ? 'on' : ''}"></i>`).join('')}</span>
          <span class="d-bar"><span style="width:${pct}%"></span></span>
          <small class="muted">${id.next ? `Prochain : <b>${esc(id.next)}</b> à ${id.nextAt} jours (encore ${id.nextAt - id.n}) · +${IDENT_XP[id.stage]} XP` : 'Dernier palier atteint 👑'}</small>
          ${open ? `<span class="idc-ladder">${id.names.map((n, i) => `<span class="${i < id.stage ? 'ok' : ''}">${i < id.stage ? '✓' : '🔒'} ${esc(n)} <small>${IDENT_AT[i]} j</small></span>`).join('')}</span>` : ''}
        </span></button>`;
    }).join('')}</div>`;
}

// Mur des victoires : ce que tu as accompli, des plus récentes aux plus anciennes
function wins() {
  const g = G(), all = victories(g), f = ui.winKind || 'all', list = all.filter(w => f === 'all' || w.kind === f);
  const wk = key(weekStart(today())), mk = todayKey().slice(0, 7);
  const n = (test) => all.filter(test).length;
  const shown = list.slice(0, ui.winsAll ? 2000 : 60);
  let last = '', html = '';
  for (const w of shown) {
    const grp = w.k >= wk ? 'Cette semaine' : w.k.startsWith(mk) ? 'Plus tôt ce mois-ci' : cap(monthName(w.k.slice(0, 7)));
    if (grp !== last) { html += `<p class="eyebrow wn-grp">${grp}</p>`; last = grp; }
    html += `<div class="wn ${w.big ? 'big' : ''} k-${w.kind}"><span class="wn-ico">${w.ico}</span><span class="wn-txt">${esc(w.txt)}</span><small class="muted">${fmtShort(parseKey(w.k))}</small>${w.id ? `<button class="icon-btn" data-act="winDel" data-id="${w.id}" aria-label="Supprimer">${ico('trash')}</button>` : ''}</div>`;
  }
  return `<section class="card"><h2>🏅 Mur des victoires</h2>
      <p class="muted small">Tes progrès retrouvés tout seuls dans ton historique : premières fois, nouveaux paliers, séries, habitudes, compétences, identités, objectifs… Les petites victoires comptent presque autant que les grandes : ajoute aussi les tiennes.</p>
      <div class="wn-stats"><div><b>${n(w => w.k >= wk)}</b><small>cette semaine</small></div><div><b>${n(w => w.k.startsWith(mk))}</b><small>ce mois-ci</small></div><div><b>${all.length}</b><small>au total</small></div></div>
      <form class="g-add" data-form="winAdd"><input name="text" maxlength="80" placeholder="Ma victoire (ex. 10 min d’anglais à l’oral)" autocomplete="off" required><button class="btn sm primary">${ico('plus')}</button></form>
    </section>
    <div class="chips wrap wn-filters">${WIN_KINDS.map(([id, l]) => `<button class="chip ${f === id ? 'on' : ''}" data-act="winKind" data-k="${id}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="wn-list">${html}</div>${list.length > shown.length ? `<button class="btn ghost full" data-act="winsAll">Tout afficher (${list.length})</button>` : ''}` : '<p class="muted center pad">Rien ici pour l’instant : chaque case cochée peut devenir une victoire.</p>'}`;
}

// Bilans du mois déjà faits
function reviews() {
  const pm = monthKey(prevMonth()), keys = Object.keys(S.reviews).filter(reviewDoneKey).sort().reverse();
  return `<section class="card"><div class="c-head"><h2>🗓️ Bilans du mois</h2>${!reviewDone(S.reviews[pm]) && Object.keys(S.days).some(k => k.startsWith(pm)) ? `<button class="btn sm primary" data-act="monthOpen">Faire le bilan de ${monthName(pm).split(' ')[0]}</button>` : ''}</div>
    ${keys.length ? keys.map(k => { const r = S.reviews[k]; return `<div class="rv"><b>${monthName(k)}</b>
      <p>✅ ${esc(r.good)}</p><p>🧱 ${esc(r.bad)}</p><p>🎯 ${esc(r.focus)}</p>${WHY[r.why] ? `<p>🤔 ${WHY[r.why]}</p>` : ''}</div>`; }).join('') : '<p class="muted small">Chaque début de mois, un bilan te pose 3 questions : ce qui a marché, ce qui a bloqué, ton focus. Le remplir rapporte une box classique et 100 XP.</p>'}
  </section>`;
}
const reviewDoneKey = k => reviewDone(S.reviews[k]);

export function render() {
  const t = ui.growthTab || 'ident';
  const tabs = [['ident', '🪪', 'Identité'], ['wins', '🏅', 'Victoires'], ['skills', '🧠', 'Compétences'], ['habits', '🛑', 'Habitudes'], ['reviews', '🗓️', 'Bilans']];
  const body = { ident: identity, wins, skills, habits, reviews }[t] || identity;
  return `<header class="page-head"><h1>Progrès</h1></header>
    <div class="segs growth-segs">${tabs.map(([id, e, l]) => `<button class="seg ${t === id ? 'on' : ''}" data-act="growthTab" data-t="${id}"><span>${e}</span><small>${l}</small></button>`).join('')}</div>
    ${body()}`;
}

const skill = id => S.skills.find(x => x.id === id), habit = id => S.habits.find(x => x.id === id);
const del = (list, id) => { S[list] = S[list].filter(x => x.id !== id); S.dead[id] = Date.now(); save(); };
export const actions = {
  growthTab(el) { ui.growthTab = el.dataset.t; ui.winsAll = false; },
  identOpen(el) { ui.identOpen = ui.identOpen === el.dataset.id ? null : el.dataset.id; },
  winKind(el) { ui.winKind = el.dataset.k; ui.winsAll = false; },
  winsAll() { ui.winsAll = true; },
  winDel(el) { if (confirm('Supprimer cette victoire ?')) del('wins', el.dataset.id); },
  skillStar(el) {
    const sk = skill(el.dataset.id), s = Number(el.dataset.s);
    sk.stars = sk.stars === s && s > 1 ? s - 1 : s; touch(sk); save();
    burst(el, '#f5b700'); buzz(10);
  },
  skillEmoji(el) {
    const sk = skill(el.dataset.id), i = SKILL_EMOJIS.indexOf(sk.emoji || '🧠');
    sk.emoji = SKILL_EMOJIS[(i + 1) % SKILL_EMOJIS.length]; touch(sk); save();
  },
  skillDel(el) { const sk = skill(el.dataset.id); if (confirm(`Supprimer « ${sk.name} » ? Ses séances restent cochées, mais son XP d’étoiles disparaît.`)) del('skills', sk.id); },
  habitFail(el) {
    const h = habit(el.dataset.id);
    if (!confirm(`Rechute pour « ${h.name} » ? Le compteur repart de zéro demain (ton record est gardé).`)) return;
    const st = G().habits.find(x => x.id === h.id), n = st ? st.cur : 0;
    h.resets = [...(h.resets || []), todayKey()]; touch(h); save();
    // Une rechute n'efface pas le chemin fait : c'est la façon de la vivre qui compte pour la suite
    toast(n >= 2 ? `Une rechute n’efface pas tes ${n} jours. Tu sais que tu en es capable : on repart demain 💪` : 'Pas grave : une rechute fait partie du chemin. On repart demain 💪');
  },
  habitUndo(el) { const h = habit(el.dataset.id); h.resets = (h.resets || []).filter(k => k !== todayKey()); touch(h); save(); },
  habitDel(el) { const h = habit(el.dataset.id); if (confirm(`Supprimer « ${h.name} » et son compteur ?`)) del('habits', h.id); },
  // Le mois dernier s'il y a eu de l'activité, sinon le mois en cours (provisoire)
  monthOpen() { const pm = monthKey(prevMonth()); showMonthRecap(Object.keys(S.days).some(k => k.startsWith(pm)) ? pm : monthKey(new Date())); },
};
export const forms = {
  skillAdd(f) {
    const name = (f.name || '').trim();
    if (!name) return false;
    if (S.skills.some(x => x.name.toLowerCase() === name.toLowerCase())) { toast('Cette compétence existe déjà'); return false; }
    S.skills.push({ id: newId(), name, emoji: SKILL_EMOJIS[S.skills.length % SKILL_EMOJIS.length], stars: 1, created: todayKey(), u: Date.now() }); save();
    toast('Compétence ajoutée 🧠 Note-toi de 1 à 5 étoiles');
  },
  winAdd(f) {
    const text = (f.text || '').trim();
    if (!text) return false;
    S.wins.push({ id: newId(), k: todayKey(), emoji: '⭐', text, u: Date.now() }); save();
    confetti(60); buzz([20, 40, 20]); toast('Victoire ajoutée ⭐ Bien joué !');
  },
  habitAdd(f) {
    const name = (f.name || '').trim();
    if (!name) return false;
    S.habits.push({ id: newId(), name, emoji: HABIT_EMOJIS[S.habits.length % HABIT_EMOJIS.length], start: todayKey(), resets: [], u: Date.now() }); save();
    toast('C’est parti : le compteur démarre aujourd’hui 💪');
  },
};
