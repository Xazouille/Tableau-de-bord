// Écran « Ma vision » : ce que je pense, ce que je veux devenir.
import { S, save, touch, newId, activeDomains } from '../store.js';
import { G } from '../game/rules.js';
import { ui, ico, toast } from '../ui.js';
import { esc, fmtDate } from '../util.js';

// Qui je suis déjà : les identités gagnées par la pratique, en face de qui je veux devenir
function already() {
  const g = G(), list = activeDomains().map(d => ({ d, id: g.identity[d.id] })).filter(x => x.id && x.id.stage).sort((a, b) => b.id.stage - a.id.stage);
  if (!list.length) return '';
  return `<button class="v-already" data-act="tab" data-tab="growth"><span class="eyebrow">✨ Qui je suis déjà</span>
    <span class="id-now">${list.slice(0, 8).map(x => `<span class="id-chip" style="--c:${x.d.color}">${x.d.emoji} ${esc(x.id.name)}</span>`).join('')}</span>
    <small class="muted">Gagné jour après jour, par ce que tu fais vraiment ›</small></button>`;
}

export function render() {
  const blocks = S.vision.blocks;
  if (ui.visionEdit) {
    return `<header class="page-head"><h1>Ma vision</h1><p class="eyebrow">Écris librement. Chaque phrase pourra s’afficher sur ton écran d’accueil.</p></header>
      <form class="form vision-form" data-form="vision">
        ${blocks.map((b, i) => `<section class="card v-edit">
          <div class="v-edit-head"><input class="v-title-in" name="t${i}" value="${esc(b.title)}" maxlength="60" aria-label="Titre de la partie">
            ${blocks.length > 1 ? `<button type="button" class="icon-btn" data-act="visionDel" data-i="${i}" aria-label="Supprimer cette partie">${ico('trash')}</button>` : ''}</div>
          <textarea name="x${i}" rows="7" placeholder="${i === 0 ? 'Dans un an, je veux être quelqu’un qui…' : 'Ce que je crois, ce qui compte pour moi…'}">${esc(b.text)}</textarea>
        </section>`).join('')}
        <button type="button" class="btn ghost full" data-act="visionAdd">${ico('plus')} Ajouter une partie</button>
        <div class="row sticky-actions"><button class="btn primary">Enregistrer</button><button type="button" class="btn" data-act="visionCancel">Annuler</button></div>
      </form>`;
  }
  const filled = blocks.filter(b => b.text.trim());
  const body = filled.length ? filled.map((b, i) => `<section class="v-block" style="--i:${i}">
      <h2>${esc(b.title)}</h2>
      <div class="v-text">${esc(b.text).split(/\n+/).map(p => `<p>${p}</p>`).join('')}</div></section>`).join('')
    : `<div class="v-empty"><div class="e-emoji">🌅</div><h2>Qui veux-tu devenir ?</h2>
        <p>Écris ce que tu penses, tes valeurs, la personne que tu construis jour après jour. C’est ton cap : relis-le quand la motivation baisse.</p>
        <button class="btn primary" data-act="visionEditOn">✍️ Écrire ma vision</button></div>`;
  return `<header class="page-head row-head"><div><h1>Ma vision</h1>${S.vision.u ? `<p class="eyebrow">Mise à jour le ${fmtDate(new Date(S.vision.u))}</p>` : ''}</div>
      ${filled.length ? `<button class="btn" data-act="visionEditOn">${ico('edit')} Modifier</button>` : ''}</header>
    ${already()}
    <div class="vision">${body}</div>`;
}

// Reprend ce qui est en cours de saisie avant d'ajouter ou supprimer une partie
function readForm() {
  const f = document.querySelector('form[data-form="vision"]');
  if (!f) return;
  S.vision.blocks.forEach((b, i) => { if (f[`t${i}`]) b.title = f[`t${i}`].value; if (f[`x${i}`]) b.text = f[`x${i}`].value; });
}

export const actions = {
  visionEditOn() { ui.visionEdit = true; ui.visionBackup = JSON.stringify(S.vision.blocks); },
  visionCancel() { if (ui.visionBackup) S.vision.blocks = JSON.parse(ui.visionBackup); ui.visionEdit = false; },
  visionAdd() { readForm(); S.vision.blocks.push({ id: newId(), title: 'Nouvelle partie', text: '' }); },
  visionDel(el) {
    readForm();
    const i = Number(el.dataset.i);
    if (S.vision.blocks[i].text.trim() && !confirm('Supprimer cette partie ?')) return;
    S.vision.blocks.splice(i, 1);
  },
};

export const forms = {
  vision(f) {
    S.vision.blocks = S.vision.blocks.map((b, i) => ({ ...b, title: (f[`t${i}`] || '').trim() || 'Sans titre', text: (f[`x${i}`] || '').trim() }));
    touch(S.vision); ui.visionEdit = false; save(); toast('Vision enregistrée ✨');
    scrollTo({ top: 0, behavior: 'smooth' });
  },
};
