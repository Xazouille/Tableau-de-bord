// Écran « Aujourd'hui » : les cases du jour, l'anneau de progression, la phrase du jour.
import { S, save, isDone, setDone, setNote, setMood, valOf, setVal, activeDomains, domainsOn, touch, newId } from '../store.js';
import { dayCount, globalStreak, globalBest, domainStreak, isPerfect, perfectNeed, isGoodDay, isJoker, visionSentences } from '../stats.js';
import { G, PERFECT_BONUS, SLEEP_REG_XP, chalOpen } from '../game/rules.js';
import { IDENT_AT } from '../game/identity.js';
import { levelCard, bossCard } from './game.js';
import { nudges } from '../nudges.js';
import { RANKS } from '../game/mastery.js';
import { currentFocus } from '../game/growth.js';
import { timerState, timedDomains, optMinutes, startTimer, pauseTimer, stopTimer, remainingMs, fmtClock, isTimed } from '../timer.js';
import { caseXP, caseLabel, fmtMoney, moneyBonus } from '../measures.js';
import { ui, ico, toast, openSheet, closeSheet, banner, pref, setPref } from '../ui.js';
import { chestHTML } from '../game/gacha.js';
import { key, today, addDays, parseKey, fmtLong, fmtShort, esc, todayKey, seeded, plural, weekStart } from '../util.js';
import { burst, confetti, buzz, floatText } from '../fx.js';

export const MOODS = ['', '😞', '😕', '😐', '🙂', '😄'];
const MOOD_NAMES = ['', 'Pas terrible', 'Bof', 'Normal', 'Bien', 'Super'];

const CHEERS0 = ['Une case pour lancer la machine 💪', 'Chaque jour compte. On commence ?', 'Le premier pas est le plus important.', 'Aujourd’hui, tu construis la version de demain.'];
const CHEERS_LOW = ['Bon début, continue sur ta lancée !', 'C’est parti, une case après l’autre.', 'La machine est lancée 🚀'];
const CHEERS = ['Belle lancée, continue !', 'Tu es dans le rythme 🔥', 'Ça avance, ne lâche rien.', 'Plus de la moitié, bravo !'];

// Dernier total des comptes noté avant le jour k
function prevMoney(k) {
  const m = G().money.filter(([d]) => d < k);
  return m.length ? m[m.length - 1][1] : undefined;
}
const domainById = id => S.domains.list.find(d => d.id === id);

function jokerOffer() {
  const y = key(addDays(today(), -1)), y2 = key(addDays(today(), -2));
  if (ui.day !== todayKey() || isGoodDay(y) || !isGoodDay(y2) || G().jokers < 1) return '';
  let n = 0;
  for (let d = addDays(today(), -2); isGoodDay(key(d)); d = addDays(d, -1)) n++;
  return `<button class="joker-offer" data-act="useJoker">🃏 Hier n’a pas compté : utilise un joker pour sauver ta série de ${plural(n, 'jour', 'jours')} <b>(${G().jokers} dispo)</b></button>`;
}

// Série cassée : un message bienveillant plutôt qu'un compteur à zéro.
// Rater un jour ne change presque rien à une habitude qui se construit ; c'est la façon de le vivre qui compte.
function kindCard() {
  if (ui.day !== todayKey() || isGoodDay(todayKey())) return '';
  let d = addDays(today(), -1), gap = 0;
  while (gap < 4 && !isGoodDay(key(d))) { d = addDays(d, -1); gap++; }
  if (!gap || gap >= 4) return '';
  const last = key(d);
  let n = 0;
  for (let x = d; n < 4000 && isGoodDay(key(x)); x = addDays(x, -1)) n++;
  if (n < 3 || pref('kindSeen') === last || (gap === 1 && G().jokers > 0)) return '';
  const best = globalBest();
  return `<section class="kind-card"><span class="kc-ico">🌱</span><div>
    <b>Ta série de ${plural(n, 'jour', 'jours')} s’est arrêtée${gap > 1 ? '' : ' hier'}.</b>
    <p>${gap > 1 ? 'Ces derniers jours étaient plus compliqués, et c’est normal. ' : 'Pas grave : '}rater un jour ne change presque rien à une habitude qui se construit. Ce qui compte, c’est de reprendre aujourd’hui : une case suffit pour relancer la machine.</p>
    <small class="muted">Tes ${n} jours restent acquis${best > n ? ` · ton record : ${best} jours` : ' · c’est ton record, il t’attend'}.</small>
    <button class="btn sm primary" data-act="kindOk" data-k="${last}">C’est reparti 💪</button></div></section>`;
}

// Nouvelle semaine : choisir ses défis (jusqu'au mardi soir)
function chalPrompt() {
  if (ui.day !== todayKey() || !chalOpen() || S.game.chal[key(weekStart(today()))]) return '';
  return `<button class="chal-prompt" data-act="chalOpen"><span>🎯</span><span><b>Nouvelle semaine, page blanche !</b><small>Choisis tes 3 défis de la semaine (jusqu’à mardi soir)</small></span>${ico('chev')}</button>`;
}

// Plans « si… alors… » : le matin, ce que tu as prévu pour les cases pas encore faites
const hasPlan = d => !!(d.plan && (d.plan.when || '').trim());
const planTxt = d => `Si ${d.plan.when.trim()} → ${(d.plan.then || '').trim() || d.name}`;
function plansCard(k, doms) {
  if (k !== todayKey() || new Date().getHours() >= 12) return '';
  const list = doms.filter(d => hasPlan(d) && !isDone(k, d.id)).slice(0, 4);
  return list.length ? `<section class="card plans-card"><div class="c-head"><h2>🧭 Ton plan du jour</h2><button class="link-btn" data-act="plansOpen">Modifier ›</button></div>
    ${list.map(d => `<p class="plan-row"><span>${d.emoji}</span><span>${esc(planTxt(d))}</span></p>`).join('')}</section>` : '';
}

// Rappeler le pourquoi : en cochant, ton vrai progrès ou une phrase de ta vision, pas seulement l'XP
const MILESTONES = new Set([5, 10, 20, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 365, 400, 500, 600, 700, 800, 900, 1000]);
const nth = n => (n === 1 ? '1re' : `${n}e`);
function whyLine(d) {
  const keys = Object.keys(S.days).filter(k => isDone(k, d.id)), n = keys.length, m = d.m || {};
  // Une nouvelle identité s'annonce déjà ; l'argent a son propre message (gagné ou perdu depuis la dernière fois)
  if (!n || IDENT_AT.includes(n) || m.kind === 'money') return '';
  let mins = 0;
  for (const k of keys) { const v = valOf(k, d.id), i = m.kind === 'skill' ? v && v.v : v, o = typeof i === 'number' && m.opts && m.opts[i]; if (o && o[2]) mins += o[2]; }
  const time = mins >= 60 ? ` · ${Math.round(mins / 60)} h au total` : '';
  if (MILESTONES.has(n)) return `${d.emoji} ${nth(n)} fois ${d.name}${time} : c’est ça, progresser`;
  if (Math.random() > 0.35) return '';
  const mk = todayKey().slice(0, 7), month = keys.filter(k => k.startsWith(mk)).length, id = G().identity[d.id], vs = visionSentences();
  const pool = [`${d.emoji} ${nth(n)} fois ${d.name}${time}`];
  if (month >= 3) pool.push(`${d.emoji} ${month} fois ${d.name} ce mois-ci`);
  if (id && id.next) pool.push(`${d.emoji} Encore ${plural(id.nextAt - n, 'jour', 'jours')} pour devenir « ${id.next} »`);
  if (vs.length) for (let i = 0; i < 2; i++) pool.push(`🌅 « ${vs[Math.floor(Math.random() * vs.length)]} »`);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Habitudes arrêtées : le nombre de jours, visible dès l'accueil
function habitStrip(k) {
  const hs = k === todayKey() ? G().habits : [];
  return hs.length ? `<div class="hb-strip">${hs.map(h => `<button class="hb-chip ${h.fellToday ? 'fell' : ''}" data-act="habitsOpen" title="Record : ${plural(h.best, 'jour', 'jours')}">
    <span class="hbc-emoji">${esc(h.emoji || '🛑')}</span><span><b>${h.cur}</b> <small>${h.cur > 1 ? 'jours' : 'jour'} sans</small><small class="hbc-name">${esc(h.name)}</small></span></button>`).join('')}</div>` : '';
}

function hero(k, n, c) {
  const pct = n ? c / n : 0, R = 52, C = 2 * Math.PI * R;
  const st = globalStreak(), perfect = isPerfect(k), isToday = k === todayKey(), need = perfectNeed(n);
  const rnd = seeded(k);
  const msg = perfect ? (c < n ? `Journée parfaite ! Encore ${plural(n - c, 'case', 'cases')} pour tout cocher 🏆` : 'Journée parfaite et tout coché ! Tu es une machine 🏆')
    : c === 0 ? CHEERS0[Math.floor(rnd() * CHEERS0.length)]
    : need - c <= 2 ? `Plus que ${plural(need - c, 'case', 'cases')} pour une journée parfaite (+${PERFECT_BONUS} XP) !`
    : pct < 0.5 ? CHEERS_LOW[Math.floor(rnd() * CHEERS_LOW.length)]
    : CHEERS[Math.floor(rnd() * CHEERS.length)];
  const xp = G().dayXP[k] || 0;
  // Prochaine box du jour : petite à 5 cases, classique quand tout est coché
  const sAt = G().smallAt;
  const boxChip = !n ? '' : perfect ? '🎁 2 box gagnées' : c >= sAt ? `🎁 ${c}/${need} → box classique` : `🎁 ${c}/${sAt} → petite box`;
  return `<section class="hero ${perfect ? 'perfect' : ''}">
    <div class="ring" role="img" aria-label="${c} sur ${n}">
      <svg viewBox="0 0 120 120"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#ffe680"/></linearGradient></defs>
        <circle class="r-bg" cx="60" cy="60" r="${R}"/>
        <circle class="r-arc" cx="60" cy="60" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"/></svg>
      <div class="r-txt"><b>${c}</b><span>/${n}</span></div>
    </div>
    <div class="h-side">
      <div class="h-pct">${Math.round(pct * 100)}<small>%</small></div>
      <p class="h-msg">${msg}</p>
      <div class="h-chips">
        <span class="chip-glass" title="Série globale">${st.n ? `🔥 ${plural(st.n, 'jour', 'jours')}` : '🌱 Nouvelle série'}</span>
        <span class="chip-glass" title="XP gagnée ${isToday ? 'aujourd’hui' : 'ce jour-là'}">⚡ +${xp} XP</span>
        ${boxChip ? `<span class="chip-glass box-chip ${c >= sAt ? 'got' : ''}">${boxChip}</span>` : ''}
        ${!isToday ? `<span class="chip-glass">✏️ ${fmtShort(parseKey(k))}</span>` : ''}
      </div>
    </div>
  </section>`;
}

// Ce qui est à portée de main aujourd'hui (petite box, journée parfaite, boss, série…)
function nudgeStrip(k) {
  if (k !== todayKey()) return '';
  const list = nudges().slice(0, 2);
  return list.length ? `<div class="nudges">${list.map(x => `<p class="nudge n-${x.key}"><span>${x.ico}</span>${esc(x.txt)}</p>`).join('')}</div>` : '';
}

// Le focus choisi au bilan du mois dernier
function focusLine(k) {
  const f = k === todayKey() ? currentFocus() : '';
  return f ? `<p class="focus-line"><span>🎯</span><span><small>Focus du mois</small>${esc(f)}</span></p>` : '';
}

function quote() {
  const all = visionSentences();
  if (!all.length) return `<button class="quote empty-q" data-act="tab" data-tab="vision"><span class="q-mark">✨</span><span>Écris ta vision : ce que tu veux devenir. Une de tes phrases s’affichera ici chaque jour.</span>${ico('chev')}</button>`;
  const i = Math.floor(seeded(todayKey() + (ui.quoteShift || 0))() * all.length);
  return `<button class="quote" data-act="shuffleQuote" title="Une autre phrase"><span class="q-mark">“</span><span class="q-txt">${esc(all[i])}</span></button>`;
}

export function render() {
  const k = ui.day, doms = domainsOn(k), n = doms.length, c = dayCount(k);
  const t = today(), g = G();
  const days = [[-2, 'Avant-hier'], [-1, 'Hier'], [0, 'Aujourd’hui']].map(([o, l]) => {
    const dk = key(addDays(t, o)), cnt = dayCount(dk);
    return `<button class="seg ${dk === k ? 'on' : ''}" data-act="day" data-k="${dk}"><span>${l}</span><small>${cnt}/${domainsOn(dk).length}</small></button>`;
  }).join('');
  const per = g.caseXPs[k] || {};
  const tiles = doms.map(d => {
    const done = isDone(k, d.id), s = domainStreak(d.id).n, v = valOf(k, d.id), m = g.mastery[d.id];
    const reg = d.id === 'sommeil' && valOf(k, 'sleepreg') === 1 ? ' · 🌙' : '';
    const lab = done ? caseLabel(d, v, S.skills) + reg : isTimed(d.id) ? '⏱️ Minuteur en cours…' : hasPlan(d) ? `🧭 ${d.plan.when.trim()}` : '';
    const xpTxt = done ? `+${per[d.id] ?? d.xp} XP` : `${d.xp} XP${d.m && d.m.kind !== 'none' ? '+' : ''}`;
    const weak = g.boss.current && g.boss.current.weak === d.id;
    return `<button class="tile ${done ? 'on' : ''} ${ui.justDone === d.id ? 'pop' : ''} ${weak ? 'weak' : ''}" style="--c:${d.color}" data-act="toggle" data-id="${d.id}" aria-pressed="${done}">
      <span class="t-emoji">${d.emoji}${m ? `<span class="t-lv" style="--rk:${RANKS[m.rank][1]}" title="Maîtrise : niveau ${m.level}">${m.level}</span>` : ''}</span>${weak ? '<span class="t-weak" title="Point faible du boss : dégâts ×2">⚔️×2</span>' : ''}
      <span class="t-body"><span class="t-name">${esc(d.name)}</span><span class="t-hint">${esc(lab || d.hint || '')}</span></span>
      <span class="t-foot"><span class="t-xp">${xpTxt}</span>${s > 0 ? `<span class="t-streak">🔥${s}</span>` : ''}</span>
      <span class="t-check">${ico('check')}</span>
    </button>`;
  }).join('');
  const day = S.days[k];
  const comp = g.companion;
  return `<header class="page-head hello">
      <div><p class="eyebrow">${fmtLong(parseKey(todayKey()))}</p><h1>Salut ${esc(S.profile.name || 'toi')} 👋</h1></div>
    </header>
    ${levelCard(true)}
    ${g.boxes.total ? `<button class="box-banner" data-act="openBox"><span class="bb-chests">${['g', 'c', 'p'].filter(t => g.boxes[t]).map(t => `<span class="bb-c">${chestHTML(t, 'mini')}<b>${g.boxes[t]}</b></span>`).join('')}</span><b class="bb-txt">${plural(g.boxes.total, 'box à ouvrir', 'box à ouvrir')} !</b><span class="bb-go">Invoquer ${ico('chev')}</span></button>` : ''}
    ${comp && comp.badStreak >= 1 && k === todayKey() ? `<p class="comp-warn">⚠️ ${esc(comp.form.name)} est en danger : coche École, Sommeil (7 h+) ou Alimentation aujourd’hui.</p>` : ''}
    <div class="segs days">${days}</div>
    ${hero(k, n, c)}
    ${habitStrip(k)}
    ${nudgeStrip(k)}
    ${bossCard(true)}
    ${jokerOffer()}
    ${kindCard()}
    ${chalPrompt()}
    ${quote()}
    ${focusLine(k)}
    ${plansCard(k, doms)}
    ${k === todayKey() ? `<div class="tiles-head">${timedDomains().length ? `<button class="chip timer-chip" data-act="timerOpen">⏱️ ${timerState() ? 'Minuteur en cours' : 'Lancer un minuteur'}</button>` : ''}<button class="chip" data-act="plansOpen">🧭 ${doms.some(hasPlan) ? 'Mes plans' : 'Écrire mes plans'}</button></div>` : ''}
    <div class="tiles">${tiles || '<p class="muted">Aucun domaine : ajoute-en dans Réglages.</p>'}</div>
    <section class="card note">
      <div class="mood-row"><span class="note-label">Mon humeur ${k === todayKey() ? 'du jour' : 'du ' + fmtShort(parseKey(k))}</span>
        <div class="moods" role="radiogroup">${MOODS.slice(1).map((e, i) => `<button class="mood ${day && day.mood === i + 1 ? 'on' : ''}" data-act="mood" data-v="${i + 1}" role="radio" aria-checked="${!!day && day.mood === i + 1}" aria-label="${MOOD_NAMES[i + 1]}">${e}</button>`).join('')}</div></div>
      <div class="note-head"><label class="note-label" for="note">✍️ Ma phrase ${k === todayKey() ? 'du jour' : 'du ' + fmtShort(parseKey(k))} <small class="muted">+5 XP</small></label>
        ${day && (day.note || '').trim() ? (S.wins.some(w => w.k === k && w.from === 'note') ? '<span class="muted small">🏅 Dans tes victoires</span>' : '<button class="chip sm" data-act="noteWin">🏅 C’est une victoire</button>') : ''}</div>
      <input id="note" class="note-input" data-input="note" maxlength="160" autocomplete="off" placeholder="Une victoire, une pensée, un ressenti…" value="${esc(day && day.note || '')}">
    </section>`;
}

// Fenêtre « combien ? » : temps, liste ou montant selon le domaine
export function sheet(s) {
  const d = domainById(s.id), k = s.k, m = d.m || { kind: 'none' }, v = valOf(k, d.id), done = isDone(k, d.id);
  const pm = prevMoney(k);
  let body = '';
  const timerBtn = k === todayKey() && !done && timedDomains().some(x => x.id === d.id) ? `<button class="btn ghost full" data-act="timerOpen" data-id="${d.id}">⏱️ Plutôt lancer un minuteur</button>` : '';
  // Sommeil : se coucher à heure fixe (la régularité compte autant que la durée)
  const reg = valOf(k, 'sleepreg'), bt = S.settings.bedtime || '';
  const sleepReg = d.id === 'sommeil' ? `<div class="sleep-reg"><p class="eyebrow">🌙 La veille au soir, couché à ton heure ?</p>
      <div class="chips"><button class="chip ${reg === 1 ? 'on' : ''}" data-act="sleepReg" data-v="1">Oui${bt ? `, vers ${bt} (± 30 min)` : ', à mon heure'} <small>+${SLEEP_REG_XP} XP</small></button><button class="chip ${reg === 0 ? 'on' : ''}" data-act="sleepReg" data-v="0">Non</button></div>
      <label class="f bt-in">Mon heure de coucher<input type="time" data-input="bedtime" value="${esc(bt)}"></label></div>` : '';
  if (m.kind === 'levels') {
    body = `${sleepReg}<div class="opts">${m.opts.map(([l], i) => `<button class="opt ${v === i ? 'on' : ''}" style="--c:${d.color}" data-act="measureSet" data-v="${i}"><span>${esc(l)}</span><b>+${caseXP(d, i)} XP</b></button>`).join('')}</div>${timerBtn}`;
  } else if (m.kind === 'skill') {
    // Compétence : la choisir (ou en écrire une nouvelle), puis le temps passé
    const cur = s.skill || (v && v.s) || '';
    body = `<p class="eyebrow">Compétence</p>
      <div class="chips wrap">${S.skills.map(sk => `<button class="chip ${cur === sk.id ? 'on' : ''}" style="--c:${d.color}" data-act="skillPick" data-id="${sk.id}">${esc(sk.emoji || '🧠')} ${esc(sk.name)} <small>${'★'.repeat(sk.stars || 1)}</small></button>`).join('')}</div>
      <form class="g-add" data-form="skillQuick"><input name="name" maxlength="40" placeholder="Nouvelle compétence (ex. Anglais, Guitare…)" autocomplete="off"><button class="btn sm">${ico('plus')}</button></form>
      <p class="eyebrow" style="margin-top:12px">Temps passé</p>
      <div class="opts ${cur ? '' : 'off'}">${m.opts.map(([l], i) => `<button class="opt ${v && v.v === i && v.s === cur ? 'on' : ''}" style="--c:${d.color}" ${cur ? `data-act="measureSkill" data-v="${i}"` : 'disabled'}><span>${esc(l)}</span><b>+${caseXP(d, { s: cur, v: i })} XP</b></button>`).join('')}</div>
      ${cur ? '' : '<p class="muted small">Choisis ou ajoute d’abord la compétence.</p>'}${timerBtn}`;
  } else if (m.kind === 'list') {
    const sel = Array.isArray(v) ? v : [];
    body = `<form class="form" data-form="measureList"><div class="checks">${m.items.map((it, i) => `<label class="chk" style="--c:${d.color}"><input type="checkbox" name="i${i}" ${sel.includes(i) ? 'checked' : ''}><span class="box">${ico('check')}</span><span>${esc(it)}</span></label>`).join('')}</div>
      <p class="muted small">Chaque objectif rapporte ${Math.round(d.xp * 0.5)} XP, et les ${m.items.length} ensemble ${caseXP(d, m.items.map((_, i) => i))} XP.</p>
      <div class="row"><button class="btn primary">Valider</button></div></form>`;
  } else if (m.kind === 'money') {
    body = `<form class="form" data-form="money">
      <label class="f">${esc(m.q)} (€)<input type="number" name="amount" step="0.01" inputmode="decimal" required value="${typeof v === 'number' ? v : pm ?? ''}" placeholder="Ex. 2 450"></label>
      <p class="muted small">${typeof pm === 'number' ? `Dernier total : <b>${fmtMoney(pm)}</b>. ` : ''}Faire le point rapporte ${d.xp} XP, plus 1 XP par tranche de 10 € gagnés (50 max).</p>
      <div class="row"><button class="btn primary">Valider</button></div></form>`;
  }
  return `<div class="measure"><div class="m-head"><span class="t-emoji" style="--c:${d.color}">${d.emoji}</span><div><p class="eyebrow">${esc(d.name)} · ${k === todayKey() ? 'aujourd’hui' : fmtShort(parseKey(k))}</p><h2>${esc(m.q || d.name)}</h2></div></div>
    ${hasPlan(d) ? `<p class="plan-line">🧭 Ton plan : ${esc(planTxt(d))}</p>` : ''}
    ${body}
    ${done ? `<button class="btn danger ghost full" data-act="measureUncheck">Décocher ${esc(d.name)}</button>` : ''}</div>`;
}

const shown = new Set();
function afterCheck(id, wasPerfect, before) {
  const k = ui.day;
  save();
  const el = document.querySelector(`.tile[data-id="${id}"]`), g = G();
  const xp = (g.caseXPs[k] || {})[id];
  if (xp) floatText(el, `+${xp} XP`);
  const why = isDone(k, id) && whyLine(domainById(id));
  if (why) setTimeout(() => toast(why), 700);
  // Dégâts au boss (ou K.O. : l'écran de victoire s'affiche ensuite)
  const b = g.boss.current;
  if (before && b && b.n === before.n && b.dmg > before.dmg) {
    floatText(el, `⚔️ −${b.dmg - before.dmg}`, 'dmg');
    setTimeout(() => { const c = document.querySelector('.boss-card'); if (c) { c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); } }, 40);
  } else if (before && (!b || b.n !== before.n)) floatText(el, '💥 K.O. !', 'dmg');
  if (!wasPerfect && isPerfect(k)) {
    setTimeout(() => { confetti(); buzz([30, 60, 30]); }, 250);
    banner({ icon: '🏆', title: 'Journée parfaite !', sub: `+${PERFECT_BONUS} XP bonus · coup critique sur le boss · tu es une machine`, color: '#f59e0b', cls: 'gold-ban' });
  }
  // « Presque ! » : plus qu'une case pour la petite box, la journée parfaite, ou le boss presque à terre
  if (k !== todayKey()) return;
  const nd = nudges().find(x => ((x.key === 'small' || x.key === 'perfect') && x.left === 1) || (x.key === 'boss' && x.pct <= 10));
  if (nd && !shown.has(k + nd.key)) { shown.add(k + nd.key); banner({ icon: nd.ico, title: 'Presque !', sub: nd.txt, color: '#ff4fa3' }); }
}

export const actions = {
  toggle(el) {
    const id = el.dataset.id, k = ui.day, d = domainById(id), was = isDone(k, id);
    const measured = d.m && d.m.kind !== 'none';
    if (was && measured) { openSheet({ kind: 'measure', id, k }); return; }
    const wasPerfect = isPerfect(k), before = G().boss.current;
    setDone(k, id, !was);
    if (was) setVal(k, id, null);
    ui.justDone = was ? null : id;
    if (!was) { burst(el, d.color); buzz(15); } else buzz(6);
    // Fenêtre « combien ? » : si on la ferme sans choisir, la case reste cochée avec l'XP de base
    if (!was && measured) { save(); openSheet({ kind: 'measure', id, k, before, onClose: () => afterCheck(id, wasPerfect, before) }); }
    else if (!was) afterCheck(id, wasPerfect, before);
    else save();
    setTimeout(() => { ui.justDone = null; }, 600);
  },
  measureSet(el) {
    const s = ui.sheet, { id, k } = s, wasPerfect = s.onClose ? false : isPerfect(k), before = s.onClose ? s.before : G().boss.current;
    setDone(k, id, true); setVal(k, id, Number(el.dataset.v));
    s.handled = true; ui.sheet = null; afterCheck(id, wasPerfect, before);
  },
  measureUncheck() {
    const s = ui.sheet, { id, k } = s;
    setDone(k, id, false); setVal(k, id, null); s.handled = true; ui.sheet = null; save();
  },
  day(el) { ui.day = el.dataset.k; },
  skillPick(el) { ui.sheet = { ...ui.sheet, skill: el.dataset.id }; },
  measureSkill(el) {
    const s = ui.sheet, { id, k } = s, wasPerfect = s.onClose ? false : isPerfect(k), before = s.onClose ? s.before : G().boss.current;
    const cur = s.skill || (valOf(k, id) || {}).s;
    if (!cur) return;
    setDone(k, id, true); setVal(k, id, { s: cur, v: Number(el.dataset.v) });
    s.handled = true; ui.sheet = null; afterCheck(id, wasPerfect, before);
  },
  timerOpen(el) {
    const t = timerState(), id = el.dataset.id || (ui.sheet && ui.sheet.id);
    if (ui.sheet && ui.sheet.kind === 'measure' && ui.sheet.onClose && !isDone(ui.sheet.k, ui.sheet.id)) ui.sheet.handled = true;
    // Case cochée juste pour ouvrir la fiche : le minuteur la cochera lui-même à la fin
    if (ui.sheet && ui.sheet.kind === 'measure' && ui.sheet.onClose) { setDone(ui.sheet.k, ui.sheet.id, false); setVal(ui.sheet.k, ui.sheet.id, null); save(); }
    ui.sheet = { kind: 'timer', id: t ? t.dom : id || '', skill: ui.sheet && ui.sheet.skill };
  },
  timerDom(el) { ui.sheet = { ...ui.sheet, id: el.dataset.id, mins: 0 }; },
  timerMins(el) { ui.sheet = { ...ui.sheet, mins: Number(el.dataset.m) }; },
  timerSkill(el) { ui.sheet = { ...ui.sheet, skill: el.dataset.id }; },
  timerGo() {
    const s = ui.sheet, d = domainById(s.id);
    if (!d || !s.mins) return;
    if (d.m.kind === 'skill' && !s.skill) { toast('Choisis la compétence'); return; }
    startTimer(d.id, s.mins, s.skill); ui.sheet = { kind: 'timer' }; buzz(20);
  },
  timerPause() { pauseTimer(); ui.sheet = { ...ui.sheet }; },
  timerStop() {
    const t = timerState(); if (!t) return;
    const d = domainById(t.dom), mins = Math.floor((t.mins * 60000 - remainingMs(t)) / 60000);
    if (!confirm(`Arrêter maintenant ? ${mins >= optMinutes(d, 0) ? `${d.name} sera cochée avec ${mins} min.` : `Moins de ${optMinutes(d, 0)} min : la case ne sera pas cochée.`}`)) return;
    ui.sheet = null; stopTimer(true);
  },
  timerCancel() { if (confirm('Annuler le minuteur sans rien cocher ?')) { ui.sheet = null; stopTimer(false); } },
  mood(el) {
    const v = Number(el.dataset.v), cur = S.days[ui.day] && S.days[ui.day].mood;
    setMood(ui.day, cur === v ? 0 : v); save();
    if (cur !== v) { burst(el, '#f5b700'); buzz(10); }
  },
  shuffleQuote() { ui.quoteShift = (ui.quoteShift || 0) + 1; },
  habitsOpen() { ui.tab = 'growth'; ui.growthTab = 'habits'; setPref('tab', 'growth'); scrollTo({ top: 0 }); },
  kindOk(el) { setPref('kindSeen', el.dataset.k); buzz(15); },
  chalOpen() { openSheet({ kind: 'chal' }); },
  plansOpen() { openSheet({ kind: 'plans' }); },
  sleepReg(el) {
    const s = ui.sheet, v = Number(el.dataset.v);
    setVal(s.k, 'sleepreg', valOf(s.k, 'sleepreg') === v ? null : v); save();
    if (v === 1) burst(el, '#6c7bff');
    ui.sheet = { ...s };
  },
  noteWin() {
    const day = S.days[ui.day], text = day && (day.note || '').trim();
    if (!text) return;
    S.wins.push({ id: newId(), k: ui.day, emoji: '⭐', text, from: 'note', u: Date.now() }); save();
    buzz([20, 40, 20]); toast('Ajoutée à ton mur des victoires 🏅');
  },
  useJoker() {
    const y = key(addDays(today(), -1));
    if (G().jokers < 1) return;
    S.game.jokerDays[y] = 1; touch(S.game); save();
    toast('🃏 Joker utilisé : ta série est sauvée !');
  },
};

// Plans « si… alors… » : quand et comment tu fais chaque case
const PLAN_IDEAS = {
  ecole: ['après le dîner', '15 min de révision active'], echecs: ['dans le bus', '5 puzzles'], sport: ['en rentrant à la maison', 'je mets mes baskets et je pars 20 min'],
  argent: ['le dimanche soir', 'je fais le point sur mes comptes'], culture: ['au lit, avant de dormir', '10 pages'], alim: ['quand j’ai envie de soda', 'je bois un grand verre d’eau'],
  medit: ['juste après le réveil', '5 min de respiration'], sommeil: ['à 22 h 30', 'téléphone hors de la chambre'], ecran: ['quand je prends mon téléphone sans raison', 'je le repose et je lis 2 pages'],
  scroll: ['quand j’ai envie de scroller', 'je pose le téléphone et je respire 1 min'], pas: ['à la pause de midi', 'je marche 15 min'], journal: ['avant de me coucher', 'j’écris 3 lignes'],
  competence: ['le samedi matin', '30 min de ma compétence'], rangement: ['après le petit-déjeuner', '5 min de rangement'], hygiene: ['après la douche', 'crème et fil dentaire'],
};
export function plansSheet() {
  const doms = activeDomains();
  return `<form class="form plans-sheet" data-form="plans"><h2>🧭 Mes plans « si… alors… »</h2>
    <p class="muted small">Décide à l’avance <b>quand</b> et <b>comment</b> tu fais chaque case. C’est une des techniques les plus efficaces pour passer à l’action : ton plan s’affiche sur la case et le matin.</p>
    ${doms.map(d => { const p = d.plan || {}, ex = PLAN_IDEAS[d.id] || ['quand… (un moment, un lieu)', 'je…']; return `<div class="plan-edit" style="--c:${d.color}"><b>${d.emoji} ${esc(d.name)}</b>
      <div class="grid2"><label class="f">Si (quand)<input name="w_${d.id}" maxlength="60" value="${esc(p.when || '')}" placeholder="Ex. ${esc(ex[0])}" autocomplete="off"></label>
      <label class="f">Alors je…<input name="t_${d.id}" maxlength="60" value="${esc(p.then || '')}" placeholder="Ex. ${esc(ex[1])}" autocomplete="off"></label></div></div>`; }).join('')}
    <div class="row sticky-actions"><button class="btn primary">Enregistrer mes plans</button></div></form>`;
}

// Minuteur : choisir la case, la durée (et la compétence), puis le compte à rebours
export function timerSheet(s) {
  const t = timerState();
  if (t) {
    const d = domainById(t.dom), C = 2 * Math.PI * 88, left = remainingMs(t), sk = S.skills.find(x => x.id === t.skill);
    return `<div class="timer-sheet running" style="--c:${d ? d.color : 'var(--accent)'}">
      <p class="eyebrow">${d ? `${d.emoji} ${esc(d.name)}` : ''}${sk ? ` · ${esc(sk.name)}` : ''} · ${t.mins} min</p>
      <div class="tm-ring"><svg viewBox="0 0 200 200"><circle class="tm-bg" cx="100" cy="100" r="88"/><circle class="tm-arc" cx="100" cy="100" r="88" data-c="${C.toFixed(1)}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - left / (t.mins * 60000))).toFixed(1)}"/></svg>
        <div class="tm-txt"><b data-timer>${fmtClock(left)}</b><small>${t.paused ? 'En pause' : 'restantes'}</small></div></div>
      <p class="muted small center">La case se coche toute seule à la fin, même si tu fermes l’appli.</p>
      <div class="row center-row"><button class="btn primary" data-act="timerPause">${t.paused ? '▶️ Reprendre' : '⏸️ Pause'}</button><button class="btn" data-act="timerStop">⏹️ Terminer</button><button class="btn ghost" data-act="timerCancel">Annuler</button></div>
    </div>`;
  }
  const doms = timedDomains(), d = doms.find(x => x.id === s.id);
  const mins = d ? [...new Set(d.m.opts.map((_, i) => optMinutes(d, i)).filter(Boolean))] : [];
  return `<div class="timer-sheet"><h2>⏱️ Minuteur</h2>
    <p class="muted small">Lance une séance : à la fin, la case est cochée avec le bon temps.</p>
    <p class="eyebrow">Pour quoi ?</p>
    <div class="chips wrap">${doms.map(x => `<button class="chip ${d && d.id === x.id ? 'on' : ''}" style="--c:${x.color}" data-act="timerDom" data-id="${x.id}">${x.emoji} ${esc(x.name)}</button>`).join('')}</div>
    ${d && d.m.kind === 'skill' ? `<p class="eyebrow">Quelle compétence ?</p><div class="chips wrap">${S.skills.map(sk => `<button class="chip ${s.skill === sk.id ? 'on' : ''}" data-act="timerSkill" data-id="${sk.id}">${esc(sk.emoji || '🧠')} ${esc(sk.name)}</button>`).join('') || '<span class="muted small">Ajoute une compétence dans Progrès (ou en cochant la case Compétence).</span>'}</div>` : ''}
    ${d ? `<p class="eyebrow">Combien de temps ?</p><div class="chips wrap">${mins.map(m => `<button class="chip ${s.mins === m ? 'on' : ''}" data-act="timerMins" data-m="${m}">${m >= 60 ? `${m / 60} h` : `${m} min`}</button>`).join('')}</div>` : ''}
    <button class="btn primary full" data-act="timerGo" ${d && s.mins ? '' : 'disabled'}>▶️ C’est parti</button>
  </div>`;
}

export const forms = {
  plans(f) {
    let n = 0;
    for (const d of activeDomains()) {
      const when = (f['w_' + d.id] || '').trim(), then = (f['t_' + d.id] || '').trim();
      if (when) { d.plan = { when, then }; n++; } else delete d.plan;
    }
    touch(S.domains); ui.sheet = null; save();
    toast(n ? `🧭 ${plural(n, 'plan enregistré', 'plans enregistrés')}` : 'Plans effacés');
  },
  skillQuick(f) {
    const name = (f.name || '').trim();
    if (!name) return false;
    let sk = S.skills.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!sk) { sk = { id: newId(), name, emoji: '🧠', stars: 1, created: todayKey(), u: Date.now() }; S.skills.push(sk); save(); }
    ui.sheet = { ...ui.sheet, skill: sk.id };
  },
  measureList(f) {
    const s = ui.sheet, { id, k } = s, d = domainById(id), wasPerfect = s.onClose ? false : isPerfect(k), before = s.onClose ? s.before : G().boss.current;
    const sel = d.m.items.map((_, i) => i).filter(i => f['i' + i]);
    s.handled = true; ui.sheet = null;
    if (!sel.length) { setDone(k, id, false); setVal(k, id, null); save(); return; }
    setDone(k, id, true); setVal(k, id, sel); afterCheck(id, wasPerfect, before);
  },
  money(f) {
    const s = ui.sheet, { id, k } = s, wasPerfect = s.onClose ? false : isPerfect(k), before = s.onClose ? s.before : G().boss.current;
    const amount = Math.round(Number(String(f.amount).replace(',', '.')) * 100) / 100;
    if (!isFinite(amount)) return false;
    const pm = prevMoney(k);
    setDone(k, id, true); setVal(k, id, amount);
    s.handled = true; ui.sheet = null; afterCheck(id, wasPerfect, before);
    if (typeof pm === 'number' && amount !== pm) {
      const diff = amount - pm, b = moneyBonus(diff);
      toast(`${diff > 0 ? '📈 +' : '📉 '}${fmtMoney(diff)} depuis la dernière fois${b ? ` · bonus +${b} XP` : ''}`);
    }
  },
};

export const inputs = {
  note(el) { setNote(ui.day, el.value.slice(0, 160)); save(); },
  bedtime(el) { S.settings.bedtime = el.value; touch(S.settings); save(); },
};
