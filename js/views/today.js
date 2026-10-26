// Écran « Aujourd'hui » : les cases du jour, l'anneau de progression, la phrase du jour.
import { S, save, isDone, setDone, setNote, activeDomains } from '../store.js';
import { dayCount, globalStreak, domainStreak, isPerfect } from '../stats.js';
import { ui, ico, toast } from '../ui.js';
import { key, today, addDays, parseKey, fmtLong, fmtShort, esc, todayKey, seeded, plural } from '../util.js';
import { burst, confetti, buzz } from '../fx.js';

const CHEERS0 = ['Une case pour lancer la machine 💪', 'Chaque jour compte. On commence ?', 'Le premier pas est le plus important.', 'Aujourd’hui, tu construis la version de demain.'];
const CHEERS_LOW = ['Bon début, continue sur ta lancée !', 'C’est parti, une case après l’autre.', 'La machine est lancée 🚀'];
const CHEERS = ['Belle lancée, continue !', 'Tu es dans le rythme 🔥', 'Ça avance, ne lâche rien.', 'Plus de la moitié, bravo !'];

// Phrases tirées de « Ma vision »
export function visionSentences() {
  const out = [];
  for (const b of S.vision.blocks) {
    for (const line of (b.text || '').split(/\n+/)) {
      for (const s of line.split(/(?<=[.!?…])\s+/)) {
        const t = s.replace(/^[-•*\s]+/, '').trim();
        if (t.length >= 8) out.push(t);
      }
    }
  }
  return out;
}

function hero(k, n, c) {
  const pct = n ? c / n : 0, R = 52, C = 2 * Math.PI * R;
  const st = globalStreak(), perfect = isPerfect(k), isToday = k === todayKey();
  const rnd = seeded(k);
  const msg = perfect ? 'Journée parfaite ! Tu es une machine 🏆'
    : c === 0 ? CHEERS0[Math.floor(rnd() * CHEERS0.length)]
    : n - c <= 2 ? `Plus que ${plural(n - c, 'case', 'cases')} pour une journée parfaite !`
    : pct < 0.5 ? CHEERS_LOW[Math.floor(rnd() * CHEERS_LOW.length)]
    : CHEERS[Math.floor(rnd() * CHEERS.length)];
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
        ${!isToday ? `<span class="chip-glass">✏️ ${fmtShort(parseKey(k))}</span>` : ''}
      </div>
    </div>
  </section>`;
}

function quote() {
  const all = visionSentences();
  if (!all.length) return `<button class="quote empty-q" data-act="tab" data-tab="vision"><span class="q-mark">✨</span><span>Écris ta vision : ce que tu veux devenir. Une de tes phrases s’affichera ici chaque jour.</span>${ico('chev')}</button>`;
  const i = Math.floor(seeded(todayKey() + (ui.quoteShift || 0))() * all.length);
  return `<button class="quote" data-act="shuffleQuote" title="Une autre phrase"><span class="q-mark">“</span><span class="q-txt">${esc(all[i])}</span></button>`;
}

export function render() {
  const k = ui.day, doms = activeDomains(), n = doms.length, c = dayCount(k);
  const t = today();
  const days = [[-2, 'Avant-hier'], [-1, 'Hier'], [0, 'Aujourd’hui']].map(([o, l]) => {
    const dk = key(addDays(t, o)), cnt = dayCount(dk);
    return `<button class="seg ${dk === k ? 'on' : ''}" data-act="day" data-k="${dk}"><span>${l}</span><small>${cnt}/${n}</small></button>`;
  }).join('');
  const tiles = doms.map(d => {
    const done = isDone(k, d.id), s = domainStreak(d.id).n;
    return `<button class="tile ${done ? 'on' : ''} ${ui.justDone === d.id ? 'pop' : ''}" style="--c:${d.color}" data-act="toggle" data-id="${d.id}" aria-pressed="${done}">
      <span class="t-emoji">${d.emoji}</span>
      <span class="t-body"><span class="t-name">${esc(d.name)}</span><span class="t-hint">${esc(d.hint || '')}</span></span>
      ${s > 0 ? `<span class="t-streak">🔥${s}</span>` : ''}
      <span class="t-check">${ico('check')}</span>
    </button>`;
  }).join('');
  const day = S.days[k];
  return `<header class="page-head hello">
      <div><p class="eyebrow">${fmtLong(parseKey(todayKey()))}</p><h1>Salut ${esc(S.profile.name || 'toi')} 👋</h1></div>
    </header>
    <div class="segs days">${days}</div>
    ${hero(k, n, c)}
    ${quote()}
    <div class="tiles">${tiles || '<p class="muted">Aucun domaine : ajoute-en dans Réglages.</p>'}</div>
    <section class="card note">
      <label class="note-label" for="note">✍️ Ma phrase ${k === todayKey() ? 'du jour' : 'du ' + fmtShort(parseKey(k))}</label>
      <input id="note" class="note-input" data-input="note" maxlength="160" autocomplete="off" placeholder="Une victoire, une pensée, un ressenti…" value="${esc(day && day.note || '')}">
    </section>`;
}

export const actions = {
  toggle(el) {
    const id = el.dataset.id, k = ui.day, was = isDone(k, id);
    const wasPerfect = isPerfect(k);
    setDone(k, id, !was);
    ui.justDone = was ? null : id;
    if (!was) {
      const d = activeDomains().find(x => x.id === id);
      burst(el, d ? d.color : '#9b6bff'); buzz(15);
    } else buzz(6);
    save();
    if (!was && !wasPerfect && isPerfect(k)) {
      setTimeout(() => { confetti(); buzz([30, 60, 30]); toast('🏆 Journée parfaite !'); }, 250);
    }
    setTimeout(() => { ui.justDone = null; }, 600);
  },
  day(el) { ui.day = el.dataset.k; },
  shuffleQuote() { ui.quoteShift = (ui.quoteShift || 0) + 1; },
};

export const inputs = {
  note(el) { setNote(ui.day, el.value.slice(0, 160)); save(); },
};
