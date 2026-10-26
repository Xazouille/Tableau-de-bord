// Écran « Aujourd'hui » : les cases du jour, l'anneau de progression, la phrase du jour.
import { S, save, isDone, setDone, setNote, setMood, valOf, setVal, activeDomains, touch } from '../store.js';
import { dayCount, globalStreak, domainStreak, isPerfect, isGoodDay, isJoker, visionSentences } from '../stats.js';
import { G, PERFECT_BONUS } from '../game/rules.js';
import { levelCard, bossCard } from './game.js';
import { nudges } from '../nudges.js';
import { RANKS } from '../game/mastery.js';
import { caseXP, caseLabel, fmtMoney, moneyBonus } from '../measures.js';
import { ui, ico, toast, openSheet, closeSheet, banner } from '../ui.js';
import { chestHTML } from '../game/gacha.js';
import { key, today, addDays, parseKey, fmtLong, fmtShort, esc, todayKey, seeded, plural } from '../util.js';
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

function hero(k, n, c) {
  const pct = n ? c / n : 0, R = 52, C = 2 * Math.PI * R;
  const st = globalStreak(), perfect = isPerfect(k), isToday = k === todayKey();
  const rnd = seeded(k);
  const msg = perfect ? 'Journée parfaite ! Tu es une machine 🏆'
    : c === 0 ? CHEERS0[Math.floor(rnd() * CHEERS0.length)]
    : n - c <= 2 ? `Plus que ${plural(n - c, 'case', 'cases')} pour une journée parfaite (+${PERFECT_BONUS} XP) !`
    : pct < 0.5 ? CHEERS_LOW[Math.floor(rnd() * CHEERS_LOW.length)]
    : CHEERS[Math.floor(rnd() * CHEERS.length)];
  const xp = G().dayXP[k] || 0;
  // Prochaine box du jour : petite à 5 cases, classique quand tout est coché
  const sAt = G().smallAt;
  const boxChip = !n ? '' : perfect ? '🎁 2 box gagnées' : c >= sAt ? `🎁 ${c}/${n} → box classique` : `🎁 ${c}/${sAt} → petite box`;
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
        <span class="chip-glass" title="Série globale">🔥 ${plural(st.n, 'jour', 'jours')}</span>
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

function quote() {
  const all = visionSentences();
  if (!all.length) return `<button class="quote empty-q" data-act="tab" data-tab="vision"><span class="q-mark">✨</span><span>Écris ta vision : ce que tu veux devenir. Une de tes phrases s’affichera ici chaque jour.</span>${ico('chev')}</button>`;
  const i = Math.floor(seeded(todayKey() + (ui.quoteShift || 0))() * all.length);
  return `<button class="quote" data-act="shuffleQuote" title="Une autre phrase"><span class="q-mark">“</span><span class="q-txt">${esc(all[i])}</span></button>`;
}

export function render() {
  const k = ui.day, doms = activeDomains(), n = doms.length, c = dayCount(k);
  const t = today(), g = G();
  const days = [[-2, 'Avant-hier'], [-1, 'Hier'], [0, 'Aujourd’hui']].map(([o, l]) => {
    const dk = key(addDays(t, o)), cnt = dayCount(dk);
    return `<button class="seg ${dk === k ? 'on' : ''}" data-act="day" data-k="${dk}"><span>${l}</span><small>${cnt}/${n}</small></button>`;
  }).join('');
  const per = g.caseXPs[k] || {};
  const tiles = doms.map(d => {
    const done = isDone(k, d.id), s = domainStreak(d.id).n, v = valOf(k, d.id), m = g.mastery[d.id];
    const lab = done ? caseLabel(d, v) : '';
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
    ${nudgeStrip(k)}
    ${bossCard(true)}
    ${jokerOffer()}
    ${quote()}
    <div class="tiles">${tiles || '<p class="muted">Aucun domaine : ajoute-en dans Réglages.</p>'}</div>
    <section class="card note">
      <div class="mood-row"><span class="note-label">Mon humeur ${k === todayKey() ? 'du jour' : 'du ' + fmtShort(parseKey(k))}</span>
        <div class="moods" role="radiogroup">${MOODS.slice(1).map((e, i) => `<button class="mood ${day && day.mood === i + 1 ? 'on' : ''}" data-act="mood" data-v="${i + 1}" role="radio" aria-checked="${!!day && day.mood === i + 1}" aria-label="${MOOD_NAMES[i + 1]}">${e}</button>`).join('')}</div></div>
      <label class="note-label" for="note">✍️ Ma phrase ${k === todayKey() ? 'du jour' : 'du ' + fmtShort(parseKey(k))} <small class="muted">+5 XP</small></label>
      <input id="note" class="note-input" data-input="note" maxlength="160" autocomplete="off" placeholder="Une victoire, une pensée, un ressenti…" value="${esc(day && day.note || '')}">
    </section>`;
}

// Fenêtre « combien ? » : temps, liste ou montant selon le domaine
export function sheet(s) {
  const d = domainById(s.id), k = s.k, m = d.m || { kind: 'none' }, v = valOf(k, d.id), done = isDone(k, d.id);
  const pm = prevMoney(k);
  let body = '';
  if (m.kind === 'levels') {
    body = `<div class="opts">${m.opts.map(([l], i) => `<button class="opt ${v === i ? 'on' : ''}" style="--c:${d.color}" data-act="measureSet" data-v="${i}"><span>${esc(l)}</span><b>+${caseXP(d, i)} XP</b></button>`).join('')}</div>`;
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
  mood(el) {
    const v = Number(el.dataset.v), cur = S.days[ui.day] && S.days[ui.day].mood;
    setMood(ui.day, cur === v ? 0 : v); save();
    if (cur !== v) { burst(el, '#f5b700'); buzz(10); }
  },
  shuffleQuote() { ui.quoteShift = (ui.quoteShift || 0) + 1; },
  useJoker() {
    const y = key(addDays(today(), -1));
    if (G().jokers < 1) return;
    S.game.jokerDays[y] = 1; touch(S.game); save();
    toast('🃏 Joker utilisé : ta série est sauvée !');
  },
};

export const forms = {
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
};
