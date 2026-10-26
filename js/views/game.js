// Écran « Jeu » : niveau, box, compagnon, défis, jokers, récompenses, collection et badges.
import { S, save, touch, newId } from '../store.js';
import { G, badgeDefs, compThreshold, JOKER_MAX, FRAG } from '../game/rules.js';
import { LINES, FORMS, SERIES, RARITY } from '../game/roster.js';
import { cardHTML, tradeFragments, setCompanion, chestHTML } from '../game/gacha.js';
import { startBox } from '../game/opening.js';
import { TIERS, TIER_KEYS, PITY4, PITY5 } from '../game/tiers.js';
import { ui, ico, toast, openSheet, closeSheet } from '../ui.js';
import { esc, plural, fmtShort, parseKey } from '../util.js';

const nf = n => Math.round(n).toLocaleString('fr-FR');

export function levelCard(compact = false) {
  const g = G(), c = g.companion;
  const pct = Math.round(g.lvl.into / g.lvl.need * 100);
  return `<section class="lv-card ${compact ? 'compact' : ''}" ${compact ? 'data-act="tab" data-tab="game"' : ''}>
    <div class="lv-avatar">${c ? `<img src="${esc(c.form.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<span>🎁</span>'}</div>
    <div class="lv-main">
      <div class="lv-top"><span class="lv-num">Niv. ${g.lvl.level}</span><span class="lv-title">${esc(g.title)}</span></div>
      <div class="xpbar"><span style="width:${pct}%"></span></div>
      <div class="lv-sub">${nf(g.lvl.into)} / ${nf(g.lvl.need)} XP${compact ? '' : ` · ${nf(g.xp)} XP au total`}</div>
    </div>
    ${compact && g.boxes.total ? `<span class="lv-box">${chestHTML(['g', 'c', 'p'].find(k => g.boxes[k]), 'mini')}<b>${g.boxes.total}</b></span>` : ''}
  </section>`;
}

// Les trois box : combien il en reste à ouvrir, et comment en gagner
function boxesCard() {
  const g = G(), b = g.boxes;
  return `<section class="card boxes-card ${b.total ? 'has' : ''}">
    <div class="c-head"><h2>🎁 Mes box</h2><button class="link-btn" data-act="oddsOpen">Taux et garanties ›</button></div>
    <div class="bx-list">${['p', 'c', 'g'].map(k => {
      const T = TIERS[k], n = b[k];
      return `<button class="bx t-${k} ${n ? 'on' : ''}" style="--tc:${T.color}" data-act="${n ? 'openBox' : 'oddsOpen'}" data-k="${k}">
        ${chestHTML(k)}<b>${T.name}</b><small>${plural(T.cards, 'carte', 'cartes')}</small><span class="bx-n">${n ? `×${n}` : '0'}</span></button>`;
    }).join('')}</div>
    ${b.total ? `<button class="btn primary full summon-btn" data-act="openBox">✨ Invoquer · ${plural(b.total, 'box', 'box')}</button>`
      : `<p class="muted small center">Prochaine grande box au niveau ${g.lvl.level + 1} · encore ${nf(g.lvl.need - g.lvl.into)} XP</p>`}
  </section>`;
}

function companionCard() {
  const g = G(), c = g.companion;
  if (!c) {
    const n = Object.keys(g.owned).length;
    return `<section class="card comp-card empty-comp"><h2>🐾 Ton compagnon</h2>
      <p class="muted">${n ? 'Choisis un compagnon dans ta collection : il grandira avec ta régularité et évoluera.' : 'Ouvre ta première box pour obtenir un compagnon. Il grandira avec ta régularité et évoluera.'}</p>
      ${n ? '<button class="btn primary" data-act="gameTab" data-t="collection">Choisir dans ma collection</button>' : ''}</section>`;
  }
  const L = LINES[c.line], pct = c.maxed ? 100 : Math.min(100, Math.round(c.into / c.need * 100));
  // Chemin d'évolution : les formes déjà atteintes, puis les suivantes possibles
  const chain = [];
  for (let i = 0; i <= L.depth; i++) {
    const id = c.path[i];
    if (id) chain.push(`<span class="ch-step on ${i === c.stage ? 'cur' : ''}"><img src="${esc(FORMS[id].img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></span>`);
    else chain.push('<span class="ch-step">?</span>');
  }
  const nextNames = c.maxed ? '' : FORMS[c.form.id].next.map(id => g.forms.has(id) ? FORMS[id].name : '???').join(' ou ');
  const warn = c.badStreak >= 1 ? `<p class="comp-warn">⚠️ Hier était un jour sans (pas de révision, moins de 7 h de sommeil, rien en alimentation). Encore un aujourd’hui et ${esc(c.form.name)} ${c.stage ? 'redescend d’un stade' : 'perd sa progression'}.</p>` : '';
  return `<section class="card comp-card" style="--rc:${RARITY[L.rarity].color}">
    <div class="comp-art"><img src="${esc(c.form.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></div>
    <div class="comp-body">
      <p class="eyebrow">🐾 Ton compagnon · ${'★'.repeat(L.rarity)}</p>
      <h2>${esc(c.form.name)}</h2>
      <div class="chain">${chain.join('<span class="ch-arrow">›</span>')}</div>
      ${c.maxed ? '<p class="muted small">Forme finale atteinte 🏆 Garde le rythme pour qu’il reste à ce stade.</p>'
        : `<div class="xpbar alt"><span style="width:${pct}%"></span></div><p class="muted small">${nf(c.into)} / ${nf(c.need)} XP avant d’évoluer en ${esc(nextNames)}</p>`}
      ${warn}
      <button class="btn sm" data-act="gameTab" data-t="collection">Changer de compagnon</button>
    </div></section>`;
}

function challengesCard() {
  const ch = G().challenges, n = ch.filter(c => c.done).length;
  return `<section class="card"><div class="c-head"><h2>🎯 Défis de la semaine</h2><span class="muted small">${n}/${ch.length} réussis</span></div>
    ${ch.map(c => `<div class="chal ${c.done ? 'done' : ''}" style="--tc:${TIERS[c.box].color}"><span class="chal-emoji">${c.done ? '✅' : c.emoji}</span>
      <div class="chal-main"><div class="chal-top"><b>${esc(c.text)}</b><span class="chal-lv">${c.label}</span></div>
      <div class="d-bar"><span style="width:${Math.min(100, Math.round(c.value / c.goal * 100))}%"></span></div>
      <span class="muted small">${nf(Math.min(c.value, c.goal))}${c.unit} / ${nf(c.goal)}${c.unit}</span></div>
      <span class="chal-rw" title="${TIERS[c.box].name}">${chestHTML(c.box, 'mini')}<small>+${c.xp} XP</small></span></div>`).join('')}
  </section>`;
}

function resourcesCard() {
  const g = G();
  return `<div class="res-row">
    <div class="res"><span class="res-emoji">🃏</span><b>${g.jokers}<small>/${JOKER_MAX}</small></b><span>Jokers</span><small class="muted">1 gagné par semaine réussie</small></div>
    <div class="res"><span class="res-emoji">💎</span><b>${nf(g.frags)}</b><span>Fragments</span>
      <button class="btn sm ${g.frags >= TIERS.p.cost ? 'primary' : ''}" data-act="shopOpen">Boutique</button></div>
  </div>`;
}

function rewardsCard() {
  const L = G().lvl.level;
  const list = [...S.game.rewards].sort((a, b) => a.level - b.level);
  return `<section class="card"><div class="c-head"><h2>🎁 Mes récompenses</h2><span class="muted small">à m’offrir en vrai</span></div>
    ${list.map(r => {
      const ok = L >= r.level;
      return `<div class="rew ${ok ? 'ok' : ''} ${r.claimed ? 'claimed' : ''}"><span class="rew-lv">Niv. ${r.level}</span><span class="rew-txt">${esc(r.text)}</span>
        ${r.claimed ? '<span class="rew-state">✓ Offerte</span>' : ok ? `<button class="btn sm primary" data-act="rewardClaim" data-id="${r.id}">Je me l’offre !</button>` : `<span class="rew-state muted">🔒 ${r.level - L} niv.</span>`}
        <button class="icon-btn" data-act="rewardDel" data-id="${r.id}" aria-label="Supprimer">${ico('trash')}</button></div>`;
    }).join('') || '<p class="muted">Fixe-toi des récompenses : « Niveau 10 = un resto », « Niveau 20 = un nouveau jeu »…</p>'}
    <form class="g-add rew-form" data-form="reward"><input type="number" name="level" min="2" max="200" inputmode="numeric" placeholder="Niv." required>
      <input name="text" placeholder="Ma récompense…" maxlength="80" required><button class="btn sm">${ico('plus')}</button></form>
  </section>`;
}

function xpCard() {
  const b = G().breakdown;
  const rows = [['✅', 'Cases cochées', b.cases], ['⭐', 'Bonus (journées parfaites, phrases, connexion)', b.bonus], ['🎯', 'Objectifs', b.goals], ['🍿', 'Médiathèque', b.media], ['🏅', 'Badges', b.badges], ['📅', 'Défis', b.challenges]];
  return `<section class="card"><h2>⚡ D’où vient ton XP</h2>${rows.map(([e, l, v]) => `<div class="xp-row"><span>${e} ${l}</span><b>${nf(v)}</b></div>`).join('')}</section>`;
}

function profil() {
  return `${levelCard()}${boxesCard()}<div class="two"><div>${companionCard()}${challengesCard()}</div><div>${resourcesCard()}${rewardsCard()}${xpCard()}</div></div>`;
}

function collection() {
  const g = G();
  const all = Object.values(FORMS);
  const ownedForms = all.filter(f => g.forms.has(f.id)).length;
  const ser = ui.collSeries || 'all', rar = ui.collRarity || 0, only = !!ui.collOwned;
  let list = all.filter(f => (ser === 'all' || f.series === ser) && (!rar || LINES[f.line].rarity === rar) && (!only || g.forms.has(f.id)));
  const total = list.length, limit = ui.collLimit || 120;
  list = list.slice(0, limit);
  const serChips = [['all', 'Toutes', '#9b6bff']].concat(Object.entries(SERIES).map(([k, s]) => [k, `${s.emoji} ${s.name}`, s.color]))
    .map(([k, l, c]) => `<button class="chip ${ser === k ? 'on' : ''}" style="--c:${c}" data-act="collSeries" data-s="${k}">${esc(l)}</button>`).join('');
  const rarChips = [0, 1, 2, 3, 4, 5].map(r => `<button class="chip ${rar === r ? 'on' : ''}" style="--c:${r ? RARITY[r].color : '#9b6bff'}" data-act="collRarity" data-r="${r}">${r ? '★'.repeat(r) : 'Toutes'}</button>`).join('');
  return `<section class="coll-head"><div><b>${ownedForms}</b> / ${all.length} cartes</div><div class="xpbar"><span style="width:${Math.round(ownedForms / all.length * 100)}%"></span></div></section>
    <div class="chips scroll-x">${serChips}</div>
    <div class="chips scroll-x">${rarChips}<button class="chip ${only ? 'on' : ''}" data-act="collOwned">✓ Obtenues</button></div>
    ${list.length ? `<div class="coll-grid">${list.map(f => `<button class="coll-item" data-act="cardOpen" data-id="${f.id}">${cardHTML(f.id, { known: g.forms.has(f.id), size: 'sm', badge: g.companion && g.companion.form.id === f.id ? '🐾' : '' })}</button>`).join('')}</div>`
      : '<p class="muted center pad">Aucune carte ici pour l’instant. Ouvre des box !</p>'}
    ${total > limit ? `<button class="btn ghost full" data-act="collMore">Afficher plus (${total - limit})</button>` : ''}`;
}

function badges() {
  const got = S.game.badges, defs = badgeDefs();
  const cats = [...new Set(defs.map(b => b.cat))];
  const n = defs.filter(b => got[b.id]).length;
  return `<p class="muted center">${n} / ${defs.length} badges · chaque badge rapporte de l’XP, certains une box</p>` + cats.map(c => `<h2 class="sec">${c}</h2><div class="badges">${defs.filter(b => b.cat === c).map(b => `
    <div class="badge ${got[b.id] ? 'on' : ''}"><span class="b-emoji">${b.emoji}</span><b>${esc(b.name)}</b><small>${esc(b.desc)}</small>
      <span class="b-xp">${got[b.id] ? `✓ ${fmtShort(parseKey(got[b.id]))}` : `+${b.xp} XP${b.box ? ` · ${TIERS[b.box].name}` : ''}`}</span></div>`).join('')}</div>`).join('');
}

export function render() {
  const t = ui.gameTab || 'profil';
  const tabs = [['profil', '🎮 Profil'], ['collection', '🎴 Collection'], ['badges', '🏅 Badges']];
  return `<header class="page-head"><h1>Jeu</h1></header>
    <div class="segs">${tabs.map(([id, l]) => `<button class="seg ${t === id ? 'on' : ''}" data-act="gameTab" data-t="${id}">${l}</button>`).join('')}</div>
    ${t === 'collection' ? collection() : t === 'badges' ? badges() : profil()}`;
}

export function sheet(s) {
  const f = FORMS[s.id], L = LINES[f.line], g = G();
  const own = g.owned[L.id];
  const known = g.forms.has(f.id);
  const isComp = g.companion && g.companion.line === L.id;
  return `<div class="card-sheet">
    ${cardHTML(f.id, { known, size: 'lg' })}
    <div class="cs-info">
      <p class="eyebrow">${SERIES[f.series].emoji} ${esc(SERIES[f.series].name)} · ${'★'.repeat(L.rarity)} ${RARITY[L.rarity].name}</p>
      <h2>${known ? esc(f.name) : '???'}</h2>
      ${own ? `<p class="muted">Obtenue ${own.count > 1 ? `${own.count} fois` : '1 fois'}</p>` : '<p class="muted">Pas encore obtenue : elle peut sortir d’une box.</p>'}
      ${L.forms.length > 1 ? `<p class="eyebrow" style="margin-top:12px">Famille</p><div class="fam">${L.forms.map(id => `<button class="fam-item ${g.forms.has(id) ? '' : 'unknown'} ${id === f.id ? 'cur' : ''}" data-act="cardOpen" data-id="${id}"><img src="${esc(FORMS[id].img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><small>${g.forms.has(id) ? esc(FORMS[id].name) : '???'}</small></button>`).join('')}</div>
        <p class="muted small">On obtient toujours le premier stade. Les évolutions se débloquent en faisant grandir le compagnon (${nf(compThreshold(L.id))} XP par stade).</p>` : ''}
      ${own ? (isComp ? '<p class="tag-ok">🐾 C’est ton compagnon</p>' : `<button class="btn primary" data-act="compSet" data-line="${L.id}">🐾 Choisir comme compagnon</button>`) : ''}
    </div></div>`;
}

// Taux de chaque box, comment les gagner, et où en sont les garanties
export function oddsSheet() {
  const g = G();
  const bar = (left, max) => `<div class="xpbar alt"><span style="width:${Math.round((max - left) / max * 100)}%"></span></div>`;
  const left4 = Math.max(1, PITY4 - g.since4), left5 = Math.max(1, PITY5 - g.since5);
  return `<div class="odds-sheet"><h2>Taux des box</h2>
    <p class="muted small">Chance d’obtenir chaque rareté, pour chaque carte.</p>
    <div class="odds-wrap"><table class="odds"><thead><tr><th></th>${[1, 2, 3, 4, 5].map(r => `<th style="color:${RARITY[r].color}">${r}★</th>`).join('')}</tr></thead>
      <tbody>${TIER_KEYS.map(k => `<tr><th><span class="od-name">${chestHTML(k, 'mini')}${TIERS[k].name}</span></th>${TIERS[k].odds.map(o => `<td>${o ? `${o} %` : '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="odds-how">${TIER_KEYS.map(k => {
      const T = TIERS[k];
      return `<div class="oh" style="--tc:${T.color}">${chestHTML(k)}<div><b>${T.name} · ${plural(T.cards, 'carte', 'cartes')}</b>
        ${T.min > 1 ? `<small>Au moins une carte ${T.min}★ garantie</small>` : '<small>Pas de 5★ dedans</small>'}
        <ul>${T.how.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div></div>`;
    }).join('')}</div>
    <p class="eyebrow">Garanties des box classiques et grandes</p>
    <div class="pity"><div class="pity-row"><span>Une 4★ ou mieux</span>${bar(left4, PITY4)}<small>dans ${plural(left4, 'carte', 'cartes')} max</small></div>
      <div class="pity-row"><span>Une 5★</span>${bar(left5, PITY5)}<small>dans ${plural(left5, 'carte', 'cartes')} max</small></div></div>
  </div>`;
}

// Boutique : fragments (gagnés avec les doublons) contre des box
export function shopSheet() {
  const g = G();
  return `<div class="shop-sheet"><h2>💎 Boutique</h2>
    <p class="muted">Chaque doublon te donne des fragments. Échange-les contre une box.</p>
    <p class="shop-bal">💎 <b>${nf(g.frags)}</b> fragments</p>
    <div class="shop-list">${TIER_KEYS.map(k => {
      const T = TIERS[k], ok = g.frags >= T.cost;
      return `<div class="shop-item ${ok ? '' : 'off'}" style="--tc:${T.color}">${chestHTML(k)}<span class="si-txt"><b>${T.name}</b><small>${plural(T.cards, 'carte', 'cartes')}</small></span>
        <button class="btn sm ${ok ? 'primary' : ''}" ${ok ? `data-act="trade" data-k="${k}"` : 'disabled'}>💎 ${T.cost}</button></div>`;
    }).join('')}</div>
    <p class="muted small">Un doublon rapporte ${[1, 2, 3, 4, 5].map(r => `${FRAG[r]} 💎 en ${r}★`).join(', ')}.</p>
  </div>`;
}

export const actions = {
  gameTab(el) { ui.gameTab = el.dataset.t; ui.tab = 'game'; },
  openBox(el) { startBox(el.dataset.k); },
  oddsOpen() { openSheet({ kind: 'odds' }); },
  shopOpen() { openSheet({ kind: 'shop' }); },
  trade(el) { const k = el.dataset.k; if (tradeFragments(k)) { closeSheet(); startBox(k); } },
  collSeries(el) { ui.collSeries = el.dataset.s; ui.collLimit = 120; },
  collRarity(el) { ui.collRarity = Number(el.dataset.r); ui.collLimit = 120; },
  collOwned() { ui.collOwned = !ui.collOwned; ui.collLimit = 120; },
  collMore() { ui.collLimit = (ui.collLimit || 120) + 240; },
  cardOpen(el) { openSheet({ kind: 'card', id: el.dataset.id }); },
  compSet(el) { setCompanion(el.dataset.line); closeSheet(); ui.gameTab = 'profil'; toast('🐾 Nouveau compagnon !'); },
  rewardClaim(el) { const r = S.game.rewards.find(x => x.id === el.dataset.id); r.claimed = true; touch(r); touch(S.game); save(); toast('🎉 Profite bien !'); },
  rewardDel(el) {
    if (!confirm('Supprimer cette récompense ?')) return;
    S.game.rewards = S.game.rewards.filter(x => x.id !== el.dataset.id); S.dead[el.dataset.id] = Date.now(); touch(S.game); save();
  },
};
export const forms = {
  reward(f) {
    const level = Math.round(Number(f.level)), text = (f.text || '').trim();
    if (!level || !text) return false;
    S.game.rewards.push({ id: newId(), level, text, claimed: false, u: Date.now() }); touch(S.game); save();
    toast('Récompense ajoutée 🎁');
  },
};
