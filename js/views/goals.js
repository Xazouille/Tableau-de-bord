// Écran « Objectifs » : chiffrés, à étapes ou simples, avec échéance et sous-objectifs.
import { S, save, upsert, remove, newId, COLORS } from '../store.js';
import { ui, ico, toast, openSheet, closeSheet, empty } from '../ui.js';
import { esc, todayKey, dayDiff, parseKey, fmtDate, plural } from '../util.js';
import { confetti, buzz } from '../fx.js';
import { goalProgress as progress, goalXP, STEP_XP } from '../game/rules.js';

export const HORIZONS = [['annee', 'Cette année'], ['trimestre', 'Ce trimestre'], ['mois', 'Ce mois-ci'], ['semaine', 'Cette semaine'], ['libre', 'Sans échéance']];
const TYPES = [['count', '🔢 Chiffré', 'Atteindre un nombre : 20 livres, 300 km…'], ['steps', '🪜 À étapes', 'Une liste d’étapes à valider'], ['simple', '✅ Simple', 'Fait ou pas fait']];
const EMOJIS = ['🎯', '📚', '🏃', '💰', '🎓', '♟️', '🧘', '💪', '🚀', '🏆', '✈️', '🍎', '💼', '🎸', '🧠', '❤️'];

const colorOf = g => COLORS[[...g.id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

// Met à jour l'état « atteint » et fête la réussite
function settle(g) {
  const p = progress(g), was = !!g.done;
  if (g.type !== 'simple') g.done = p >= 1;
  if (g.done && !was) {
    g.doneAt = todayKey();
    setTimeout(() => { confetti(); buzz([30, 60, 30]); toast(`🏆 Objectif atteint : ${g.title} · +${goalXP(g)} XP`); }, 150);
  }
  if (!g.done) g.doneAt = '';
  upsert('goals', g); save();
}

function dueLabel(g) {
  if (!g.due) return '';
  const n = dayDiff(todayKey(), g.due);
  if (g.done) return `📅 ${fmtDate(parseKey(g.due))}`;
  return n < 0 ? `<span class="late">⏰ en retard de ${plural(-n, 'jour', 'jours')}</span>` : n === 0 ? '<span class="late">⏰ c’est aujourd’hui</span>' : `⏳ J-${n}`;
}

function goalCard(g, child = false) {
  const p = progress(g), c = colorOf(g), pct = Math.round(p * 100);
  let body = '';
  if (g.type === 'count') {
    body = `<div class="g-count"><b>${g.value || 0}</b> / ${g.target} ${esc(g.unit || '')}</div>
      <div class="g-ctrl"><button class="btn sm" data-act="goalInc" data-id="${g.id}" data-n="-1" aria-label="Retirer 1">−1</button>
      <button class="btn sm tint" data-act="goalInc" data-id="${g.id}" data-n="1">+1</button>
      <form class="g-add" data-form="goalAdd" data-id="${g.id}"><input type="number" name="n" inputmode="decimal" step="any" placeholder="+ combien ?" aria-label="Ajouter une quantité"><button class="btn sm">OK</button></form></div>`;
  } else if (g.type === 'steps') {
    body = `<ul class="g-steps">${(g.steps || []).map(s => `<li><button class="g-step ${s.done ? 'on' : ''}" data-act="goalStep" data-id="${g.id}" data-s="${s.id}"><span class="box">${ico('check')}</span><span>${esc(s.text)}</span></button></li>`).join('')}</ul>
      <form class="g-add" data-form="goalStepAdd" data-id="${g.id}"><input name="text" placeholder="Ajouter une étape…" autocomplete="off"><button class="btn sm">${ico('plus')}</button></form>`;
  } else {
    body = `<button class="btn ${g.done ? 'done' : 'tint'} full" data-act="goalSimple" data-id="${g.id}">${g.done ? '✓ Atteint ! (annuler)' : 'Marquer comme atteint'}</button>`;
  }
  const kids = S.goals.filter(x => x.parent === g.id);
  const horizon = (HORIZONS.find(h => h[0] === g.horizon) || HORIZONS[4])[1];
  return `<article class="goal ${g.done ? 'is-done' : ''} ${child ? 'child' : ''}" style="--c:${c}">
    <div class="g-head"><span class="g-emoji">${g.emoji || '🎯'}</span>
      <div class="g-title"><h3>${esc(g.title)}</h3><span class="g-meta">${[child ? '' : horizon, dueLabel(g), g.done ? '🏆 atteint' : ''].filter(Boolean).join(' · ')}</span></div>
      <button class="icon-btn" data-act="goalEdit" data-id="${g.id}" aria-label="Modifier">${ico('edit')}</button></div>
    <div class="g-prog"><div class="g-bar"><span style="width:${pct}%"></span></div><b>${pct} %</b></div>
    <p class="g-xp">${g.done ? '✓' : '🎁'} ${goalXP(g)} XP${g.type === 'steps' ? ` · +${STEP_XP} XP par étape` : ''}</p>
    ${body}
    ${kids.length ? `<div class="g-kids"><p class="eyebrow">Sous-objectifs</p>${kids.map(k => goalCard(k, true)).join('')}</div>` : ''}
  </article>`;
}

export function render() {
  const done = ui.goalFilter === 'done';
  const nOpen = S.goals.filter(g => !g.done).length, nDone = S.goals.length - nOpen;
  const ids = new Set(S.goals.map(g => g.id));
  // Les sous-objectifs s'affichent sous leur parent
  const top = S.goals.filter(g => !!g.done === done && !(g.parent && ids.has(g.parent)));
  let list = '';
  for (const [h, label] of HORIZONS) {
    const gs = top.filter(g => (g.horizon || 'libre') === h).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
    if (gs.length) list += `<h2 class="sec">${label}</h2><div class="goals">${gs.map(g => goalCard(g)).join('')}</div>`;
  }
  if (!list) list = done ? empty('🏆', 'Pas encore d’objectif atteint', 'Tes victoires s’afficheront ici.')
    : empty('🎯', 'Fixe ton premier objectif', 'Un nombre à atteindre, des étapes à franchir ou juste un défi à relever.', '<button class="btn primary" data-act="goalNew">+ Nouvel objectif</button>');
  return `<header class="page-head row-head"><div><h1>Objectifs</h1><p class="eyebrow">${plural(nOpen, 'en cours', 'en cours')} · ${plural(nDone, 'atteint', 'atteints')}</p></div>
      <button class="btn primary" data-act="goalNew">${ico('plus')} Nouveau</button></header>
    <div class="segs"><button class="seg ${!done ? 'on' : ''}" data-act="goalFilter" data-f="open">En cours <small>${nOpen}</small></button><button class="seg ${done ? 'on' : ''}" data-act="goalFilter" data-f="done">Atteints <small>${nDone}</small></button></div>
    ${list}`;
}

export function sheet(s) {
  const g = s.id ? S.goals.find(x => x.id === s.id) : null;
  const v = g || { type: 'count', horizon: 'mois', emoji: '🎯', title: '', target: '', unit: '', due: '', parent: '', steps: [] };
  // Un objectif ne peut pas être rangé sous lui-même ou sous un de ses sous-objectifs
  const banned = new Set(g ? [g.id] : []);
  let grew = true;
  while (grew) { grew = false; for (const x of S.goals) if (x.parent && banned.has(x.parent) && !banned.has(x.id)) { banned.add(x.id); grew = true; } }
  const parents = S.goals.filter(x => !banned.has(x.id) && !x.done);
  return `<form class="form" data-form="goal" data-type="${v.type}">
    <h2>${g ? 'Modifier l’objectif' : 'Nouvel objectif'}</h2>
    <label class="f">Objectif<input name="title" required maxlength="80" placeholder="Ex. Lire 20 livres" value="${esc(v.title)}"></label>
    <div class="f"><span>Emoji</span><div class="emoji-pick">${EMOJIS.map(e => `<label><input type="radio" name="emoji" value="${e}" ${v.emoji === e ? 'checked' : ''}><span>${e}</span></label>`).join('')}</div></div>
    <div class="f"><span>Type</span><div class="type-pick">${TYPES.map(([id, l, d]) => `<label><input type="radio" name="type" value="${id}" data-input="goalType" ${v.type === id ? 'checked' : ''}><span><b>${l}</b><small>${d}</small></span></label>`).join('')}</div></div>
    <div class="grid2 if-count"><label class="f">Cible<input type="number" name="target" min="1" step="any" inputmode="decimal" placeholder="20" value="${esc(v.target)}"></label>
      <label class="f">Unité<input name="unit" maxlength="20" placeholder="livres, km, €…" value="${esc(v.unit)}"></label></div>
    <label class="f if-steps">Étapes <small>(une par ligne)</small><textarea name="steps" rows="4" placeholder="Valider l’UE 1&#10;Valider l’UE 2">${esc((v.steps || []).map(x => x.text).join('\n'))}</textarea></label>
    <div class="grid2"><label class="f">Horizon<select name="horizon">${HORIZONS.map(([id, l]) => `<option value="${id}" ${v.horizon === id ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">Échéance <small>(facultatif)</small><input type="date" name="due" value="${esc(v.due)}"></label></div>
    ${parents.length ? `<label class="f">Fait partie de <small>(facultatif)</small><select name="parent"><option value="">— Objectif principal —</option>${parents.map(p => `<option value="${p.id}" ${v.parent === p.id ? 'selected' : ''}>${p.emoji || '🎯'} ${esc(p.title)}</option>`).join('')}</select></label>` : ''}
    <div class="row"><button class="btn primary">${g ? 'Enregistrer' : 'Créer l’objectif'}</button>
      ${g ? `<button type="button" class="btn danger ghost" data-act="goalDelete" data-id="${g.id}">${ico('trash')} Supprimer</button>` : ''}</div>
  </form>`;
}

const find = id => S.goals.find(g => g.id === id);
export const actions = {
  goalFilter(el) { ui.goalFilter = el.dataset.f; },
  goalNew() { openSheet({ kind: 'goal' }); },
  goalEdit(el) { openSheet({ kind: 'goal', id: el.dataset.id }); },
  goalInc(el) { const g = find(el.dataset.id); g.value = Math.max(0, +((g.value || 0) + Number(el.dataset.n)).toFixed(2)); buzz(8); settle(g); },
  goalStep(el) { const g = find(el.dataset.id), s = g.steps.find(x => x.id === el.dataset.s); s.done = !s.done; buzz(8); settle(g); },
  goalSimple(el) {
    const g = find(el.dataset.id); g.done = !g.done;
    if (g.done) { g.doneAt = todayKey(); confetti(); buzz([30, 60, 30]); toast(`🏆 Objectif atteint : ${g.title} · +${goalXP(g)} XP`); } else g.doneAt = '';
    upsert('goals', g); save();
  },
  goalDelete(el) {
    const g = find(el.dataset.id);
    if (!confirm(`Supprimer « ${g.title} » ?`)) return;
    S.goals.forEach(x => { if (x.parent === g.id) { x.parent = g.parent || ''; upsert('goals', x); } });
    remove('goals', g.id); closeSheet(); save();
  },
};

export const inputs = {
  goalType(el) { el.form.dataset.type = el.value; },
};

export const forms = {
  goal(f, form) {
    const old = ui.sheet.id ? find(ui.sheet.id) : null;
    const g = old ? { ...old } : { id: newId(), value: 0, steps: [], done: false, created: todayKey() };
    Object.assign(g, { title: f.title.trim(), emoji: f.emoji || '🎯', type: f.type || 'count', horizon: f.horizon, due: f.due || '', parent: f.parent || '' });
    if (!g.title) return false;
    if (g.type === 'count') {
      g.target = Number(f.target) || 0; g.unit = (f.unit || '').trim();
      if (!g.target) { toast('Indique une cible (un nombre)'); form.target.focus(); return false; }
    }
    if (g.type === 'steps') {
      const prev = old && old.steps || [];
      g.steps = (f.steps || '').split('\n').map(t => t.trim()).filter(Boolean).map(text => prev.find(s => s.text === text) || { id: newId(), text, done: false });
    }
    ui.sheet = null;
    settle(g);
    toast(old ? 'Objectif modifié' : 'Objectif créé 🎯');
  },
  goalAdd(f, form) {
    const n = Number(f.n); if (!n) return;
    const g = find(form.dataset.id); g.value = Math.max(0, +((g.value || 0) + n).toFixed(2)); settle(g);
  },
  goalStepAdd(f, form) {
    const t = (f.text || '').trim(); if (!t) return;
    const g = find(form.dataset.id); g.steps = g.steps || []; g.steps.push({ id: newId(), text: t, done: false }); settle(g);
  },
};
