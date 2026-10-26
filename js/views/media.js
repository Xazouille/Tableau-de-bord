// Écran « Médiathèque » : films, livres, mangas, animés, séries — note, avis, liste « à voir ».
import { S, save, upsert, remove, newId } from '../store.js';
import { ui, ico, toast, openSheet, closeSheet, stars, empty } from '../ui.js';
import { esc, todayKey, parseKey, fmtDate, norm, plural } from '../util.js';
import { confetti } from '../fx.js';

export const MTYPES = {
  film: { label: 'Film', many: 'Films', emoji: '🎬', color: '#ff5a5f' },
  livre: { label: 'Livre', many: 'Livres', emoji: '📖', color: '#ff8a3d' },
  manga: { label: 'Manga', many: 'Mangas', emoji: '📕', color: '#ff4fa3' },
  anime: { label: 'Animé', many: 'Animés', emoji: '🍥', color: '#9b6bff' },
  serie: { label: 'Série', many: 'Séries', emoji: '📺', color: '#4f8cff' },
};
const STATUS = [['done', 'Terminés', 'Terminé'], ['doing', 'En cours', 'En cours'], ['todo', 'À voir', 'À voir plus tard']];

function cover(m, big = false) {
  const t = MTYPES[m.type] || MTYPES.film;
  return `<div class="cover ${big ? 'big' : ''}" style="--c:${t.color}">
    ${m.cover ? `<img src="${esc(m.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}
    <span class="cv-emoji">${t.emoji}</span><span class="cv-title">${esc(m.title)}</span>
  </div>`;
}

export function render() {
  const q = norm(ui.mediaQ || '');
  const st = ui.mediaStatus, ty = ui.mediaType;
  const base = S.media.filter(m => (ty === 'all' || m.type === ty) && (!q || norm(m.title).includes(q)));
  const counts = Object.fromEntries(STATUS.map(([id]) => [id, base.filter(m => m.status === id).length]));
  const items = base.filter(m => m.status === st).sort((a, b) => st === 'done' ? ((a.date || '') < (b.date || '') ? 1 : -1) : (a.created < b.created ? 1 : -1));
  const year = String(new Date().getFullYear());
  const yDone = S.media.filter(m => m.status === 'done' && (m.date || '').startsWith(year));
  const rated = yDone.filter(m => m.rating);
  const avg = rated.length ? (rated.reduce((a, m) => a + m.rating, 0) / rated.length).toFixed(1).replace('.', ',') : null;
  const typeChips = [`<button class="chip ${ty === 'all' ? 'on' : ''}" data-act="mediaType" data-t="all">Tout</button>`]
    .concat(Object.entries(MTYPES).map(([id, t]) => `<button class="chip ${ty === id ? 'on' : ''}" style="--c:${t.color}" data-act="mediaType" data-t="${id}">${t.emoji} ${t.many}</button>`)).join('');
  const grid = items.length ? `<div class="media-grid">${items.map(m => `<button class="m-card" data-act="mediaOpen" data-id="${m.id}">
      ${cover(m)}<span class="m-info"><span class="m-title">${esc(m.title)}</span>${m.status === 'done' ? stars(m.rating || 0) : `<span class="muted small">${MTYPES[m.type].label}</span>`}</span></button>`).join('')}</div>`
    : S.media.length ? `<p class="muted center pad">Rien ici pour l’instant.</p>`
    : empty('🍿', 'Ta médiathèque est vide', 'Note chaque film, livre, manga, animé ou série que tu termines, et garde une liste de ce que tu veux voir.', '<button class="btn primary" data-act="mediaNew">+ Ajouter</button>');
  return `<header class="page-head row-head"><div><h1>Médiathèque</h1><p class="eyebrow">${year} : ${plural(yDone.length, 'terminé', 'terminés')}${avg ? ` · ★ ${avg} de moyenne` : ''}</p></div>
      <button class="btn primary" data-act="mediaNew">${ico('plus')} Ajouter</button></header>
    <div class="segs">${STATUS.map(([id, l]) => `<button class="seg ${st === id ? 'on' : ''}" data-act="mediaStatus" data-s="${id}">${l} <small>${counts[id]}</small></button>`).join('')}</div>
    <div class="chips scroll-x">${typeChips}</div>
    ${S.media.length > 6 ? `<input class="search" type="search" data-input="mediaQ" placeholder="🔎 Rechercher un titre…" value="${esc(ui.mediaQ || '')}">` : ''}
    ${grid}`;
}

export function sheet(s) {
  const m = s.id ? S.media.find(x => x.id === s.id) : null;
  if (s.view && m) {
    const t = MTYPES[m.type];
    return `<div class="m-detail">${cover(m, true)}
      <div><p class="eyebrow">${t.emoji} ${t.label} · ${STATUS.find(x => x[0] === m.status)[2]}${m.status === 'done' && m.date ? ' le ' + fmtDate(parseKey(m.date)) : ''}</p>
      <h2>${esc(m.title)}</h2>${m.status === 'done' ? stars(m.rating || 0) : ''}
      ${m.review ? `<p class="review">${esc(m.review).replace(/\n/g, '<br>')}</p>` : '<p class="muted">Pas encore d’avis.</p>'}
      <div class="row">${m.status !== 'done' ? `<button class="btn primary" data-act="mediaFinish" data-id="${m.id}">✓ Terminé !</button>` : ''}
        <button class="btn" data-act="mediaEdit" data-id="${m.id}">${ico('edit')} Modifier</button></div></div></div>`;
  }
  const v = m ? (s.finish ? { ...m, status: 'done', date: todayKey() } : m) : { type: ui.mediaType !== 'all' ? ui.mediaType : 'film', title: '', status: ui.mediaStatus, rating: 0, review: '', date: todayKey(), cover: '' };
  return `<form class="form" data-form="media">
    <h2>${m ? 'Modifier' : 'Ajouter à ma médiathèque'}</h2>
    <div class="f"><span>Type</span><div class="pills">${Object.entries(MTYPES).map(([id, t]) => `<label><input type="radio" name="type" value="${id}" ${v.type === id ? 'checked' : ''}><span>${t.emoji} ${t.label}</span></label>`).join('')}</div></div>
    <label class="f">Titre<input name="title" required maxlength="120" value="${esc(v.title)}" placeholder="Ex. One Piece"></label>
    <div class="f"><span>Statut</span><div class="pills">${STATUS.map(([id, , l]) => `<label><input type="radio" name="status" value="${id}" ${v.status === id ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>
    <div class="f"><span>Ma note</span><div class="rate">${[5, 4, 3, 2, 1].map(i => `<input type="radio" id="r${i}" name="rating" value="${i}" ${v.rating === i ? 'checked' : ''}><label for="r${i}" aria-label="${i} étoiles">★</label>`).join('')}</div></div>
    <label class="f">Mon avis<textarea name="review" rows="4" maxlength="3000" placeholder="Ce que j’en ai pensé, ce que je retiens…">${esc(v.review)}</textarea></label>
    <div class="grid2"><label class="f">Terminé le<input type="date" name="date" value="${esc(v.date)}"></label>
      <label class="f">Image <small>(lien, facultatif)</small><input type="url" name="cover" placeholder="https://…" value="${esc(v.cover)}"></label></div>
    <div class="row"><button class="btn primary">${m ? 'Enregistrer' : 'Ajouter'}</button>
      ${m ? `<button type="button" class="btn danger ghost" data-act="mediaDelete" data-id="${m.id}">${ico('trash')} Supprimer</button>` : ''}</div>
  </form>`;
}

const find = id => S.media.find(m => m.id === id);
export const actions = {
  mediaStatus(el) { ui.mediaStatus = el.dataset.s; },
  mediaType(el) { ui.mediaType = el.dataset.t; },
  mediaNew() { openSheet({ kind: 'media' }); },
  mediaOpen(el) { openSheet({ kind: 'media', id: el.dataset.id, view: true }); },
  mediaEdit(el) { openSheet({ kind: 'media', id: el.dataset.id }); },
  mediaFinish(el) { const m = find(el.dataset.id); openSheet({ kind: 'media', id: m.id, finish: true }); },
  mediaDelete(el) {
    const m = find(el.dataset.id);
    if (!confirm(`Supprimer « ${m.title} » ?`)) return;
    remove('media', m.id); closeSheet(); save();
  },
};
export const inputs = { mediaQ(el) { ui.mediaQ = el.value; } };

export const forms = {
  media(f) {
    const old = ui.sheet.id ? find(ui.sheet.id) : null;
    const m = old ? { ...old } : { id: newId(), created: Date.now() };
    Object.assign(m, { type: f.type || 'film', title: (f.title || '').trim(), status: f.status || 'done', rating: Number(f.rating) || 0, review: (f.review || '').trim(), date: f.date || '', cover: (f.cover || '').trim() });
    if (!m.title) return false;
    const finished = m.status === 'done' && (!old || old.status !== 'done');
    if (finished && !m.date) m.date = todayKey();
    upsert('media', m);
    ui.sheet = null; ui.mediaStatus = m.status;
    save();
    if (finished) { confetti(70); toast(`${MTYPES[m.type].emoji} « ${m.title} » terminé · +50 XP`); }
    else toast(old ? 'Modifié' : 'Ajouté ✓');
  },
};
