// Écrans « Plus » (sur téléphone) et « Réglages » : profil, domaines, synchro, sauvegarde.
import { S, save, touch, sync, enableSync, disableSync, syncNow, replaceAll, resetAll, COLORS, DEMO } from '../store.js';
import { ui, ico, toast, openSheet, closeSheet } from '../ui.js';
import { esc, todayKey, uid, fmtShort } from '../util.js';
import { TIME_MEASURE } from '../measures.js';
import { perfectNeed } from '../stats.js';
import { UIS, LAYOUTS, uiOf, curLayout, preview, loadFonts } from '../looks.js';
import { G } from '../game/rules.js';
import { worn, LOOKS, unlockCtx, isUnlocked } from '../game/cosmetics.js';

// Apparence : le thème porté (choisi dans Jeu → Personnaliser), la disposition et le mode clair / sombre
const modeSegs = (act = 'theme') => { const th = S.settings.theme || 'auto'; return `<div class="segs">${[['auto', '🌗 Auto'], ['light', '☀️ Clair'], ['dark', '🌙 Sombre']].map(([id, l]) => `<button class="seg ${th === id ? 'on' : ''}" data-act="${act}" data-t="${id}">${l}</button>`).join('')}</div>`; };
const curTheme = () => uiOf(worn(G()).theme.id);
function uiCard() {
  const u = curTheme(), lay = LAYOUTS.find(l => l.id === curLayout(u.id)), c = unlockCtx(G());
  const n = LOOKS.filter(l => isUnlocked(l.need, c)).length;
  return `<section class="card ui-card"><h2>🎨 Apparence</h2>
    <div class="ui-now">${preview(u, lay.id)}<span><b>${u.name}</b><small>${u.desc}</small><small class="ui-lay">Disposition : ${lay.name}</small>
      <small>${n}/${LOOKS.length} thèmes débloqués</small></span></div>
    <div class="row"><button class="btn sm" data-act="lookThemes">🎨 Changer de thème</button><button class="btn sm" data-act="uiOpen">📐 Changer de disposition</button></div>
    <div class="f"><span>Mode</span>${modeSegs()}</div>
    <div class="ui-icon"><img src="icons/t/${u.id}-192.png" alt="" width="48" height="48"><p class="muted small"><b>Icône de l’appli</b> : l’onglet prend tout de suite celle du thème. Sur l’écran d’accueil, l’icône est celle du thème porté au moment de l’installation ; pour la changer, supprime l’appli puis réinstalle-la. ⚠️ Sur iPhone, supprimer l’appli efface ses données : vérifie d’abord que la synchro est active ou exporte une sauvegarde.</p></div></section>`;
}
export function uiSheet() {
  const cur = curTheme(), lay = curLayout(cur.id);
  loadFonts([cur]);
  return `<div class="ui-sheet"><h2>📐 Disposition</h2>
    <p class="muted small">Touche une disposition : l’appli change tout de suite. Elle est gardée pour le thème <b>${cur.name}</b> ; chaque thème a la sienne.</p>
    ${modeSegs('uiMode')}
    <div class="ui-grid">${LAYOUTS.map(l => `<button class="ui-opt ${l.id === lay ? 'on' : ''}" data-act="layoutSet" data-id="${l.id}" aria-pressed="${l.id === lay}">${preview(cur, l.id)}<b>${l.name}</b><small>${l.desc}</small></button>`).join('')}</div>
    <button class="btn ghost full" data-act="lookThemes">🎨 Changer de thème (Personnaliser)</button>
    <button class="btn primary full" data-act="closeSheet">C’est bon</button></div>`;
}

export function renderMore() {
  const item = (tab, emoji, title, sub, c) => `<button class="hub" style="--c:${c}" data-act="tab" data-tab="${tab}"><span class="hub-emoji">${emoji}</span><span><b>${title}</b><small>${sub}</small></span>${ico('chev')}</button>`;
  return `<header class="page-head"><h1>Plus</h1></header>
    <div class="hubs">
      ${item('media', '🍿', 'Médiathèque', `${S.media.length} films, livres, mangas, animés, séries`, '#ff4fa3')}
      ${item('growth', '🌱', 'Progrès', 'Qui je suis, victoires, compétences, habitudes, bilans', '#22c55e')}
      ${item('vision', '🌅', 'Ma vision', 'Ce que je pense, qui je veux devenir', '#ff8a3d')}
      ${item('settings', '⚙️', 'Réglages', 'Domaines, thème, synchro, sauvegarde', '#4f8cff')}
    </div>`;
}

const ago = ts => {
  const s = Math.round((Date.now() - ts) / 1000);
  return s < 60 ? 'à l’instant' : s < 3600 ? `il y a ${Math.round(s / 60)} min` : s < 86400 ? `il y a ${Math.round(s / 3600)} h` : 'le ' + fmtShort(new Date(ts));
};

function syncCard() {
  if (DEMO) return '<section class="card"><h2>🔄 Synchro PC ↔ téléphone</h2><p class="muted">Désactivée en mode démo : rien n’est envoyé sur GitHub.</p></section>';
  if (sync && sync.on) {
    return `<section class="card"><h2>🔄 Synchro PC ↔ téléphone</h2>
      <p class="muted">${sync.err ? `<span class="late">${esc(sync.err)}</span>` : `✓ Active avec <b>${esc(sync.repo)}</b> · dernière synchro ${sync.last ? ago(sync.last) : 'en cours…'}`}</p>
      <p class="muted small">Chaque modification part toute seule quelques secondes après ; les données de tes autres appareils arrivent à chaque ouverture.</p>
      <div class="row"><button class="btn" data-act="syncManual">${ico('sync')} Synchroniser</button><button class="btn danger ghost" data-act="syncOff">Désactiver ici</button></div></section>`;
  }
  return `<section class="card"><h2>🔄 Synchro PC ↔ téléphone</h2>
    <p class="muted">Les mêmes données sur ton PC et ton téléphone, grâce à un dépôt GitHub privé. Réglage à faire une seule fois, puis tu colles la même clé sur chaque appareil.</p>
    <ol class="steps-list">
      <li>Ouvre <a href="https://github.com/new" target="_blank" rel="noopener">github.com/new</a> : nom <b>tableau-donnees</b>, coche <b>Private</b>, puis <b>Create repository</b>. <span class="muted">(Déjà fait pour l’ancienne version ? Réutilise-le.)</span></li>
      <li>Ouvre <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens/new</a>.</li>
      <li>Nom : <i>Tableau de bord</i>. Expiration : la plus longue. <b>Repository access</b> : <i>Only select repositories</i> → <b>tableau-donnees</b>.</li>
      <li><b>Permissions</b> → <b>Contents</b> : <i>Read and write</i>. Puis <b>Generate token</b> et copie la clé (<code>github_pat_…</code>).</li>
      <li>Colle-la ci-dessous sur ton PC, puis sur ton téléphone.</li>
    </ol>
    <form data-form="sync" class="form"><div class="grid2">
      <label class="f">Dépôt<input name="repo" placeholder="ton-pseudo/tableau-donnees" autocapitalize="off" autocorrect="off" spellcheck="false" value="${esc(sync && sync.repo || '')}"></label>
      <label class="f">Clé GitHub<input type="password" name="token" placeholder="github_pat_…" autocomplete="off" value="${esc(sync && sync.token || '')}"></label></div>
      ${sync && sync.err ? `<p class="late small">${esc(sync.err)}</p>` : ''}
      <div class="row"><button class="btn primary">Activer la synchro</button></div></form>
    <p class="muted small">La clé reste uniquement sur cet appareil et n’ouvre que ce dépôt.</p></section>`;
}

function domainsCard() {
  const list = S.domains.list, act = list.filter(d => !d.archived), arch = list.filter(d => d.archived);
  const row = (d, i) => `<div class="dom-row" style="--c:${d.color}"><span class="dom-emoji">${d.emoji}</span><span class="dom-name">${esc(d.name)}<small>${d.xp} XP · ${esc(d.hint || '')}</small></span>
    ${d.archived ? `<button class="btn sm" data-act="domRestore" data-id="${d.id}">Remettre</button>` : `
    <button class="icon-btn" data-act="domMove" data-id="${d.id}" data-d="-1" ${i === 0 ? 'disabled' : ''} aria-label="Monter">${ico('up')}</button>
    <button class="icon-btn" data-act="domMove" data-id="${d.id}" data-d="1" ${i === act.length - 1 ? 'disabled' : ''} aria-label="Descendre">${ico('down')}</button>
    <button class="icon-btn" data-act="domEdit" data-id="${d.id}" aria-label="Modifier">${ico('edit')}</button>`}</div>`;
  return `<section class="card"><div class="c-head"><h2>🧩 Mes domaines</h2><span class="muted small">${act.length} cases par jour</span></div>
    ${act.map(row).join('')}
    <button class="btn ghost full" data-act="domNew">${ico('plus')} Ajouter un domaine</button>
    ${arch.length ? `<p class="eyebrow" style="margin-top:14px">Masqués (historique conservé)</p>${arch.map(row).join('')}` : ''}</section>`;
}

export function render() {
  const thr = Math.round((S.settings.threshold || 0.5) * 100);
  const nDom = S.domains.list.filter(d => !d.archived).length, pNeed = perfectNeed(nDom);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const install = standalone ? '<p class="muted">✓ Tu utilises l’appli installée. Elle marche aussi sans internet.</p>'
    : ui.install ? '<p class="muted">Installe la page comme une appli : icône sur l’écran d’accueil, plein écran, hors ligne.</p><div class="row"><button class="btn primary" data-act="installApp">Installer l’appli</button></div>'
    : ios ? '<p class="muted">Dans Safari : bouton <b>Partager</b> → <b>Sur l’écran d’accueil</b>. L’appli s’ouvrira en plein écran et marchera hors ligne.</p>'
    : '<p class="muted">Dans Chrome : menu <b>⋮</b> → <b>Installer l’application</b> (ou « Ajouter à l’écran d’accueil »).</p>';
  return `<header class="page-head"><h1>Réglages</h1></header>
    <div class="two">
    <div>
    ${uiCard()}
    <section class="card"><h2>👤 Profil</h2>
      <label class="f">Prénom<input data-input="name" maxlength="30" value="${esc(S.profile.name)}"></label>
      <label class="f">Une journée compte pour la série 🔥 à partir de <b>${thr} %</b> des cases
        <input type="range" min="10" max="100" step="10" value="${thr}" data-input="threshold"></label>
      <label class="f">Journée parfaite 🏆 à partir de <b>${pNeed} cases sur ${nDom}</b>
        <input type="range" min="${Math.ceil(nDom / 2)}" max="${nDom}" step="1" value="${pNeed}" data-input="perfectAt"></label>
    </section>
    ${domainsCard()}
    </div><div>
    ${syncCard()}
    <section class="card"><h2>📱 Appli</h2>${install}</section>
    <section class="card"><h2>💾 Sauvegarde</h2>
      <p class="muted">${sync && sync.on ? 'Avec la synchro, tout est déjà sauvegardé dans ton dépôt GitHub. Tu peux aussi exporter un fichier.' : 'Sans synchro, tout est enregistré dans ce navigateur, sur cet appareil uniquement. Exporte une sauvegarde de temps en temps.'}</p>
      <div class="row"><button class="btn" data-act="exportData">Exporter</button><button class="btn" data-act="importData">Importer</button></div></section>
    ${DEMO ? '' : `<section class="card"><h2>🧪 Mode démo</h2><p class="muted">Découvre l’appli avec un compte déjà bien avancé : 4 mois d’historique, toutes les cartes et évolutions débloquées, des box à ouvrir. Tes vraies données restent de côté et ne sont pas touchées.</p>
      <div class="row"><button class="btn" data-act="demoOn">Lancer la démo</button></div></section>`}
    <section class="card"><h2>🧨 Repartir de zéro</h2><p class="muted">Efface toutes les cases, objectifs, médiathèque, vision et progression du jeu.</p>
      <div class="row"><button class="btn danger" data-act="resetData">Tout effacer</button></div></section>
    </div></div>`;
}

const EMOJI_IDEAS = ['🎓', '♟️', '🏃', '💰', '📚', '🥗', '🧘', '😴', '📵', '🙅', '💧', '🎸', '🗣️', '🧹', '🙏', '✍️', '🎨', '💻', '🚭', '🌳'];
export function sheet(s) {
  const d = s.id ? S.domains.list.find(x => x.id === s.id) : null;
  const v = d || { name: '', emoji: '⭐', hint: '', color: COLORS[S.domains.list.length % COLORS.length], xp: 15, m: { kind: 'none' } };
  const m = v.m || { kind: 'none' };
  const custom = (m.kind === 'levels' && JSON.stringify(m.opts) !== JSON.stringify(TIME_MEASURE.opts)) || m.kind === 'skill';
  const kind = custom ? 'keep' : m.kind === 'levels' ? 'time' : m.kind;
  const kinds = [...(custom ? [['keep', m.kind === 'skill' ? 'Compétence travaillée + temps passé' : `Réglage actuel : ${m.opts.map(o => o[0]).join(' / ')}`]] : []), ['none', 'Juste une case'], ['time', 'Temps passé (15 min → 2 h et +)'], ['list', 'Liste d’objectifs à cocher'], ['money', 'Montant en €']];
  return `<form class="form" data-form="domain" data-type="${kind}">
    <h2>${d ? 'Modifier le domaine' : 'Nouveau domaine'}</h2>
    <div class="grid2 emoji-name"><label class="f">Emoji<input name="emoji" class="emoji-in" maxlength="8" value="${esc(v.emoji)}" required></label>
      <label class="f">Nom<input name="name" maxlength="30" required value="${esc(v.name)}" placeholder="Ex. Boire 2 L d’eau"></label></div>
    <div class="emoji-ideas">${EMOJI_IDEAS.map(e => `<button type="button" data-act="pickEmoji" data-e="${e}">${e}</button>`).join('')}</div>
    <label class="f">Petite phrase <small>(facultatif)</small><input name="hint" maxlength="50" value="${esc(v.hint)}" placeholder="Ce qui compte comme « fait »"></label>
    <div class="grid2"><label class="f">🧭 Si (quand) <small>(facultatif)</small><input name="pwhen" maxlength="60" value="${esc((v.plan || {}).when || '')}" placeholder="Ex. après le dîner"></label>
      <label class="f">Alors je…<input name="pthen" maxlength="60" value="${esc((v.plan || {}).then || '')}" placeholder="Ex. 15 min de révision"></label></div>
    <div class="grid2"><label class="f">XP de base<input type="number" name="xp" min="0" max="500" inputmode="numeric" value="${esc(v.xp)}"></label>
      <label class="f">En cochant, je précise…<select name="mkind" data-input="domKind">${kinds.map(([id, l]) => `<option value="${id}" ${kind === id ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label></div>
    <label class="f if-list">Objectifs <small>(un par ligne)</small><textarea name="items" rows="4">${esc(m.kind === 'list' ? m.items.join('\n') : '')}</textarea></label>
    <div class="f"><span>Couleur</span><div class="colors">${COLORS.map(c => `<label style="--c:${c}"><input type="radio" name="color" value="${c}" ${v.color === c ? 'checked' : ''}><span></span></label>`).join('')}</div></div>
    <div class="row"><button class="btn primary">${d ? 'Enregistrer' : 'Ajouter'}</button>
      ${d ? `<button type="button" class="btn danger ghost" data-act="domArchive" data-id="${d.id}">Masquer ce domaine</button>` : ''}</div>
  </form>`;
}

async function exportData() {
  const name = `tableau-de-bord-${todayKey()}.json`;
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  // Sur téléphone, le téléchargement direct ne marche pas toujours : on passe par le menu de partage
  if (/iphone|ipad|ipod|android/i.test(navigator.userAgent) && navigator.canShare) {
    const file = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Sauvegarde du tableau de bord' }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function importFile(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d || d.v !== 2 || typeof d.days !== 'object') throw 0;
      if (!confirm('Remplacer les données actuelles par cette sauvegarde ?')) return;
      replaceAll(d); toast('Sauvegarde restaurée');
    } catch (e) { toast('Ce fichier n’est pas une sauvegarde valide'); }
  };
  r.readAsText(file);
}

const dom = id => S.domains.list.find(d => d.id === id);
const domSave = () => { touch(S.domains); save(); };
export const actions = {
  theme(el) { S.settings.theme = el.dataset.t; touch(S.settings); save(); },
  uiOpen() { openSheet({ kind: 'ui' }); },
  lookThemes() { ui.lookTab = 'theme'; openSheet({ kind: 'look' }); },
  uiMode(el) { S.settings.theme = el.dataset.t; touch(S.settings); save(); ui.sheet = { ...ui.sheet }; },
  layoutSet(el) { S.settings.layouts = { ...(S.settings.layouts || {}), [curTheme().id]: el.dataset.id }; touch(S.settings); save(); ui.sheet = { ...ui.sheet }; },
  domNew() { openSheet({ kind: 'domain' }); },
  domEdit(el) { openSheet({ kind: 'domain', id: el.dataset.id }); },
  domMove(el) {
    const act = S.domains.list.filter(d => !d.archived), i = act.findIndex(d => d.id === el.dataset.id), j = i + Number(el.dataset.d);
    if (j < 0 || j >= act.length) return;
    [act[i], act[j]] = [act[j], act[i]];
    S.domains.list = act.concat(S.domains.list.filter(d => d.archived));
    domSave();
  },
  domArchive(el) { const d = dom(el.dataset.id); d.archived = true; closeSheet(); domSave(); toast(`${d.emoji} ${d.name} masqué`); },
  domRestore(el) { dom(el.dataset.id).archived = false; domSave(); },
  pickEmoji(el) { const i = el.form && el.form.emoji; if (i) i.value = el.dataset.e; },
  syncManual() { syncNow().then(() => toast(sync && sync.err ? sync.err : 'Synchro faite ✓')); },
  syncOff() { if (confirm('Désactiver la synchro sur cet appareil ? Tes données restent ici et sur GitHub.')) disableSync(); },
  installApp() { if (ui.install) { ui.install.prompt(); ui.install = null; } },
  exportData() { exportData(); },
  importData() { document.getElementById('importFile').click(); },
  resetData() {
    if (!confirm('Tout effacer ? Cette action est définitive (sauf si tu as une sauvegarde).')) return;
    if (!confirm('Vraiment sûr ? Toute ta progression sera perdue.')) return;
    resetAll(); toast('Tout est effacé. Nouveau départ 🚀');
  },
};
export const inputs = {
  domKind(el) { el.form.dataset.type = el.value; },
  name(el) { S.profile.name = el.value.trim(); touch(S.profile); save(); },
  threshold(el) { S.settings.threshold = Number(el.value) / 100; touch(S.settings); save(); },
  // Journée parfaite : enregistrée en proportion (12 sur 15 = 80 %), pour rester juste si on ajoute des cases
  perfectAt(el) { const n = S.domains.list.filter(d => !d.archived).length; S.settings.perfect = Number(el.value) / n; touch(S.settings); save(); },
};
export const forms = {
  domain(f) {
    const d = ui.sheet.id ? dom(ui.sheet.id) : null;
    const v = { name: (f.name || '').trim(), emoji: (f.emoji || '⭐').trim(), hint: (f.hint || '').trim(), color: f.color || COLORS[0], xp: Math.max(0, Math.round(Number(f.xp) || 0)) };
    if (!v.name) return false;
    const items = (f.items || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (f.mkind === 'list' && !items.length) { toast('Ajoute au moins un objectif à la liste'); return false; }
    if (f.mkind !== 'keep') v.m = f.mkind === 'time' ? { ...TIME_MEASURE, q: `Combien de temps pour « ${v.name} » ?` }
      : f.mkind === 'list' ? { kind: 'list', q: 'Qu’as-tu réussi aujourd’hui ?', items }
      : f.mkind === 'money' ? { kind: 'money', q: 'Total de tous mes comptes' } : { kind: 'none' };
    const when = (f.pwhen || '').trim(), then = (f.pthen || '').trim();
    v.plan = when ? { when, then } : undefined;
    if (d) { Object.assign(d, v); if (!when) delete d.plan; }
    else S.domains.list.splice(S.domains.list.filter(x => !x.archived).length, 0, { id: uid(), archived: false, from: todayKey(), ...v });
    ui.sheet = null; domSave(); toast(d ? 'Domaine modifié' : `${v.emoji} ${v.name} ajouté`);
  },
  sync(f) {
    const repo = (f.repo || '').trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/+$/, ''), token = (f.token || '').trim();
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) { toast('Le dépôt doit ressembler à pseudo/tableau-donnees'); return false; }
    if (!token) { toast('Colle ta clé GitHub'); return false; }
    toast('Connexion à GitHub…');
    enableSync(repo, token).then(() => toast(sync && sync.err ? sync.err : 'Synchro activée ✓'));
  },
};
