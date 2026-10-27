// Écran « Jeu » : profil (niveau, boss, box, compagnon, défis…), cartes et albums, maîtrise, badges.
import { S, save, touch, newId, activeDomains } from '../store.js';
import { G, badgeDefs, compThreshold, JOKER_MAX, FRAG, FUSE_COST, AWAKEN, chalOpen, chalPick } from '../game/rules.js';
import { LINES, FORMS, SERIES, RARITY } from '../game/roster.js';
import { cardHTML, tradeFragments, setCompanion, chestHTML, fuse, recycle, recycleValue } from '../game/gacha.js';
import { startBox, showFusion } from '../game/opening.js';
import { TIERS, TIER_KEYS, PITY4, PITY5 } from '../game/tiers.js';
import { RANKS, MAX_LEVEL } from '../game/mastery.js';
import { worn, LOOKS, FRAMES, titleList, unlockCtx, isUnlocked, howTo } from '../game/cosmetics.js';
import { UIS, uiOf, curLayout, preview, loadFonts } from '../looks.js';
import { dayCount, visionSentences, perfectNeed } from '../stats.js';
import { nudges } from '../nudges.js';
import { speech, burst } from '../fx.js';
import { ui, ico, toast, openSheet, closeSheet, pref, setPref } from '../ui.js';
import { esc, plural, fmtShort, parseKey, norm, todayKey, key, today, weekStart } from '../util.js';

const nf = n => Math.round(n).toLocaleString('fr-FR');

/* ---------- Compagnon : humeur du moment, réaction quand on le touche ---------- */
const MOOD_ICO = { joy: '🤩', happy: '😊', calm: '🙂', worried: '😟', sleep: '💤' };
export function compMood(g = G()) {
  if (!g.companion) return 'none';
  const n = activeDomains().length, c = dayCount(todayKey()), h = new Date().getHours(), r = n ? c / n : 0;
  if (n && c >= perfectNeed(n)) return 'joy';
  if (h >= 23 || h < 6) return 'sleep';
  if (r >= 0.5) return 'happy';
  if (h >= 18 && r < 0.3) return 'worried';
  return 'calm';
}
export function avatar(g = G(), w = worn(g)) {
  const c = g.companion, mood = compMood(g);
  return `<button class="lv-avatar fr-${w.frame.id} mood-${mood}" data-act="pet" aria-label="${c ? `Toucher ${esc(c.form.name)}` : 'Médaillon'}">
    <span class="av-frame"></span>${c ? `<img src="${esc(c.form.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<span>🎁</span>'}
    ${c ? `<span class="mood-ico">${MOOD_ICO[mood]}</span>` : ''}</button>`;
}
// Ce que dit le compagnon : une phrase de ta vision, un encouragement ou ce qui est à portée de main
function petLine(g) {
  const c = g.companion, mood = compMood(g), pick = a => a[Math.floor(Math.random() * a.length)];
  const vs = visionSentences(), nd = nudges();
  const name = S.profile.name || 'toi';
  const byMood = {
    joy: ['Journée parfaite ! Je suis trop fier de toi 🤩', `Tu es une machine, ${name} !`],
    happy: ['Ça avance bien aujourd’hui ! 💪', 'On est sur une bonne lancée !'],
    calm: [`Coucou ${name} ! On fait quoi aujourd’hui ?`, 'Une case après l’autre, on y va ?'],
    worried: ['On n’a pas encore fait grand-chose aujourd’hui… on s’y met ? 🥺', 'Il est encore temps de sauver la journée !'],
    sleep: ['Zzz… Bonne nuit, demain on remet ça 😴', 'Je dors à moitié… Va te coucher, toi aussi 💤'],
  };
  const pool = [...(byMood[mood] || byMood.calm)];
  if (vs.length) pool.push(`« ${pick(vs)} »`, `« ${pick(vs)} »`);
  if (nd.length) pool.push(nd[0].txt + ' !');
  if (c && !c.maxed) pool.push(`Encore ${nf(c.need - c.into)} XP et j’évolue !`);
  const b = g.boss.current;
  if (b) pool.push(`${b.name} n’a plus que ${Math.round((b.hp - b.dmg) / b.hp * 100)} % de vie, on l’achève ? ⚔️`);
  return pick(pool);
}

export function levelCard(compact = false) {
  const g = G(), w = worn(g);
  const pct = Math.round(g.lvl.into / g.lvl.need * 100);
  return `<section class="lv-card ${compact ? 'compact' : ''}" ${compact ? 'data-act="tab" data-tab="game"' : ''}>
    ${avatar(g, w)}
    <div class="lv-main">
      <div class="lv-top"><span class="lv-num">Niv. ${g.lvl.level}</span><span class="lv-title">${esc(w.title)}</span></div>
      <div class="xpbar"><span style="width:${pct}%"></span></div>
      <div class="lv-sub">${nf(g.lvl.into)} / ${nf(g.lvl.need)} XP${compact ? '' : ` · ${nf(g.xp)} XP au total`}</div>
    </div>
    ${compact && g.boxes.total ? `<span class="lv-box">${chestHTML(['g', 'c', 'p'].find(k => g.boxes[k]), 'mini')}<b>${g.boxes.total}</b></span>` : ''}
  </section>`;
}

/* ---------- Boss ---------- */
export function bossCard(compact = false) {
  const g = G(), b = g.boss.current;
  if (!b) {
    const last = g.boss.history[g.boss.history.length - 1];
    if (!last) return '';
    return `<button class="boss-card idle ${compact ? 'compact' : ''}" data-act="bossOpen"><span class="bc-ico">${last.won ? '🏆' : '💨'}</span>
      <span class="bc-main"><b>${last.won ? `${esc(last.name)} est K.O. !` : `${esc(last.name)} s’est enfui…`}</b><small>Le prochain boss arrive demain.</small></span></button>`;
  }
  const left = Math.max(0, b.hp - b.dmg), pct = Math.round(left / b.hp * 100);
  const wd = S.domains.list.find(d => d.id === b.weak);
  return `<button class="boss-card ${b.legendary ? 'legend' : ''} ${compact ? 'compact' : ''}" data-act="bossOpen" aria-label="Boss : ${esc(b.name)}">
    <span class="bc-portrait"><img src="${esc(b.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></span>
    <span class="bc-main">
      <span class="bc-top"><b>${esc(b.name)}</b>${b.legendary ? '<span class="bc-leg">Légendaire</span>' : ''}<span class="bc-day">Jour ${b.dayNo}/7</span></span>
      <span class="bc-hp"><span class="bc-fill" style="width:${pct}%"></span><i>${nf(left)} / ${nf(b.hp)} PV</i></span>
      <span class="bc-sub">Point faible : ${wd ? `${wd.emoji} ${esc(wd.name)}` : '?'} ×2 · ${b.left ? `${plural(b.left, 'jour', 'jours')} restants` : 'dernier jour !'}</span>
    </span></button>`;
}
export function bossSheet() {
  const g = G(), b = g.boss.current, hist = [...g.boss.history].reverse();
  const won = g.boss.history.filter(x => x.won).length;
  const wd = b && S.domains.list.find(d => d.id === b.weak);
  const head = b ? `<div class="bs-head ${b.legendary ? 'legend' : ''}"><span class="bc-portrait big"><img src="${esc(b.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></span>
      <div><p class="eyebrow">${b.legendary ? '🐉 Boss légendaire' : '⚔️ Boss'} · jour ${b.dayNo}/7</p><h2>${esc(b.name)}</h2><p class="muted small">${esc(b.why)}</p></div></div>
      <div class="bc-hp big"><span class="bc-fill" style="width:${Math.round((b.hp - b.dmg) / b.hp * 100)}%"></span><i>${nf(b.hp - b.dmg)} / ${nf(b.hp)} PV</i></div>
      <div class="bs-days">${Array.from({ length: 7 }, (_, i) => { const d = b.days[i]; return `<span class="${d ? 'on' : ''}"><b>${d ? nf(d[1]) : '·'}</b><small>J${i + 1}</small></span>`; }).join('')}</div>`
    : '<h2>Boss</h2><p class="muted">Le prochain boss arrive demain. Repose-toi… ou prends de l’avance !</p>';
  return `<div class="boss-sheet">${head}
    <ul class="bs-rules">
      <li>⚔️ Chaque case cochée lui fait autant de dégâts que son XP.</li>
      ${wd ? `<li>${wd.emoji} Point faible : <b>${esc(wd.name)}</b>, dégâts ×2.</li>` : ''}
      <li>💥 Journée parfaite : coup critique, dégâts ×1,5.</li>
      <li>⏳ 7 jours maximum. Battu plus tôt : le suivant arrive dès le lendemain.</li>
      <li>🎁 Victoire : grande box (deux pour un légendaire), sa carte et de l’XP. Un boss sur 4 est légendaire.</li>
    </ul>
    <p class="eyebrow">Tableau de chasse · ${plural(won, 'victoire', 'victoires')}</p>
    ${hist.length ? `<div class="bs-hist">${hist.slice(0, 30).map(x => `<div class="bh ${x.won ? 'won' : 'lost'}"><span class="bh-img"><img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"></span>
      <span class="bh-txt"><b>${esc(x.name)}${x.legendary ? ' 🐉' : ''}</b><small>${x.won ? `Vaincu en ${plural(x.days.length, 'jour', 'jours')}` : 'S’est enfui (il reviendra)'} · ${fmtShort(parseKey(x.endDay))}</small></span><span>${x.won ? '✅' : '💨'}</span></div>`).join('')}</div>`
      : '<p class="muted small">Ton premier combat est en cours.</p>'}
  </div>`;
}

/* ---------- Box ---------- */
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
  const aw = g.awaken[c.line] || 0, mood = compMood(g);
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
    <button class="comp-art mood-${mood} ${g.owned[c.line] && g.owned[c.line].shiny ? 'shiny' : ''}" data-act="pet" aria-label="Toucher ${esc(c.form.name)}"><img src="${esc(c.form.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><span class="mood-ico">${MOOD_ICO[mood]}</span></button>
    <div class="comp-body">
      <p class="eyebrow">🐾 Ton compagnon · ${'★'.repeat(L.rarity)}${aw ? ` · ${AWAKEN[aw].name}` : ''}</p>
      <h2>${esc(c.form.name)}</h2>
      <div class="chain">${chain.join('<span class="ch-arrow">›</span>')}</div>
      ${c.maxed ? '<p class="muted small">Forme finale atteinte 🏆 Garde le rythme pour qu’il reste à ce stade.</p>'
        : `<div class="xpbar alt"><span style="width:${pct}%"></span></div><p class="muted small">${nf(c.into)} / ${nf(c.need)} XP avant d’évoluer en ${esc(nextNames)}${aw ? ` · grandit ${Math.round((AWAKEN[aw].mult - 1) * 100)} % plus vite` : ''}</p>`}
      ${warn}
      <p class="muted small">Touche-le pour lui parler 💬</p>
      <button class="btn sm" data-act="gameTab" data-t="collection">Changer de compagnon</button>
    </div></section>`;
}

function challengesCard() {
  const ch = G().challenges, n = ch.filter(c => c.done).length, open = chalOpen();
  return `<section class="card"><div class="c-head"><h2>🎯 Défis de la semaine</h2>${open ? '<button class="btn sm primary" data-act="chalOpen">Choisir</button>' : `<span class="muted small">${n}/${ch.length} réussis</span>`}</div>
    ${open ? '<p class="muted small">Tu choisis tes défis jusqu’à mardi soir. Ensuite, ils sont fixés pour la semaine.</p>' : ''}
    ${ch.map(c => `<div class="chal ${c.done ? 'done' : ''}" style="--tc:${TIERS[c.box].color}"><span class="chal-emoji">${c.done ? '✅' : c.emoji}</span>
      <div class="chal-main"><div class="chal-top"><b>${esc(c.text)}</b><span class="chal-lv">${c.label}</span></div>
      <div class="d-bar"><span style="width:${Math.min(100, Math.round(c.value / c.goal * 100))}%"></span></div>
      <span class="muted small">${nf(Math.min(c.value, c.goal))}${c.unit} / ${nf(c.goal)}${c.unit}</span></div>
      <span class="chal-rw" title="${TIERS[c.box].name}">${chestHTML(c.box, 'mini')}<small>+${c.xp} XP</small></span></div>`).join('')}
  </section>`;
}

// Choisir ses défis : un par niveau, parmi 3 (avoir le choix motive plus qu'un défi imposé)
export function chalSheet() {
  const g = G(), ws = weekStart(today()), pick = chalPick(ws), open = chalOpen(ws);
  return `<div class="chal-sheet"><h2>🎯 Choisis tes défis</h2>
    <p class="muted small">${open ? 'Un défi par niveau. Tu peux changer d’avis jusqu’à mardi soir ; ensuite, ils sont fixés pour la semaine.' : 'Le choix est fermé pour cette semaine : rendez-vous lundi pour les prochains.'}</p>
    ${g.chalOptions.map((opts, lv) => { const c0 = opts[0]; return c0 ? `<p class="eyebrow chs-lv">${c0.label} · ${TIERS[c0.box].name.toLowerCase()} + ${c0.xp} XP</p>
      <div class="chs-opts">${opts.map((c, i) => `<button class="chs-opt ${(pick[lv] || 0) === i ? 'on' : ''}" style="--tc:${TIERS[c.box].color}" ${open ? `data-act="chalPick" data-lv="${lv}" data-i="${i}"` : 'disabled'}>
        <span class="chs-emoji">${c.emoji}</span><b>${esc(c.text)}</b><small class="muted">${nf(Math.min(c.value, c.goal))}${c.unit} / ${nf(c.goal)}${c.unit}</small></button>`).join('')}</div>` : ''; }).join('')}
    <button class="btn primary full" data-act="chalConfirm">${open ? 'C’est parti !' : 'Fermer'}</button></div>`;
}

function resourcesCard() {
  const g = G(), dups = Object.values(g.dups).reduce((a, b) => a + b, 0);
  return `<div class="res-row three">
    <div class="res"><span class="res-emoji">🃏</span><b>${g.jokers}<small>/${JOKER_MAX}</small></b><span>Jokers</span><small class="muted">1 par semaine réussie</small></div>
    <div class="res"><span class="res-emoji">🔮</span><b>${nf(dups)}</b><span>Doublons</span><button class="btn sm" data-act="collFilter" data-f="dups">Fusionner</button></div>
    <div class="res"><span class="res-emoji">💎</span><b>${nf(Math.max(0, g.frags))}</b><span>Fragments</span>
      <button class="btn sm ${g.frags >= TIERS.p.cost ? 'primary' : ''}" data-act="shopOpen">Boutique</button></div>
  </div>`;
}

// Personnaliser : titre, cadre du médaillon, thème de couleur
function lookCard() {
  const g = G(), w = worn(g), c = unlockCtx(g);
  const nT = titleList(g).filter(t => t.ok).length, nF = FRAMES.filter(f => isUnlocked(f.need, c)).length, nL = LOOKS.filter(l => isUnlocked(l.need, c)).length;
  return `<section class="card look-card"><div class="c-head"><h2>🎨 Personnaliser</h2><button class="link-btn" data-act="lookOpen">Modifier ›</button></div>
    <div class="lk-now">${avatar(g, w)}<div><b>${esc(w.title)}</b><small>Cadre ${esc(w.frame.name)} · thème ${esc(w.theme.name)}</small></div></div>
    <p class="muted small">${plural(nT, 'titre', 'titres')}, ${plural(nF, 'cadre', 'cadres')} et ${plural(nL, 'thème', 'thèmes')} débloqués. Les autres s’obtiennent avec les niveaux, les albums, les boss, la maîtrise et les badges.</p>
  </section>`;
}
export function lookSheet() {
  const g = G(), c = unlockCtx(g), L = S.settings.look || {}, tab = ui.lookTab || 'title', w = worn(g);
  const tabs = [['title', '🏷️ Titres'], ['frame', '🖼️ Cadres'], ['theme', '🎨 Thèmes']];
  let body = '';
  if (tab === 'title') {
    const list = titleList(g).sort((a, b) => b.ok - a.ok);
    body = `<button class="lk-item ${!L.title ? 'on' : ''}" data-act="lookSet" data-kind="title" data-id=""><b>Automatique</b><small>Le titre de ton niveau : ${esc(g.title)}</small></button>`
      + list.map(t => `<button class="lk-item ${L.title === t.id ? 'on' : ''} ${t.ok ? '' : 'locked'}" ${t.ok ? `data-act="lookSet" data-kind="title" data-id="${t.id}"` : 'disabled'}><b>${esc(t.name)}</b><small>${t.ok ? 'Débloqué' : `🔒 ${esc(t.how)}`}</small></button>`).join('');
  } else if (tab === 'frame') {
    body = `<div class="lk-grid">${FRAMES.map(f => { const ok = isUnlocked(f.need, c); return `<button class="lk-frame ${w.frame.id === f.id ? 'on' : ''} ${ok ? '' : 'locked'}" ${ok ? `data-act="lookSet" data-kind="frame" data-id="${f.id}"` : 'disabled'}>
      <span class="lv-avatar fr-${f.id} demo"><span class="av-frame"></span>${g.companion ? `<img src="${esc(g.companion.form.img)}" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<span>🐾</span>'}</span><b>${esc(f.name)}</b><small>${ok ? 'Débloqué' : `🔒 ${esc(howTo(f.need))}`}</small></button>`; }).join('')}</div>`;
  } else {
    // Thèmes complets avec un aperçu de l'écran d'accueil (dans la disposition choisie pour chacun)
    loadFonts(UIS);
    body = `<p class="muted small">Chaque thème change les couleurs, la police, les arrondis et l’icône de l’appli. La disposition se règle dans Réglages → Apparence (l’icône de l’écran d’accueil aussi y est expliquée).</p>
      <div class="lk-grid th-grid">${LOOKS.map(t => { const ok = isUnlocked(t.need, c); return `<button class="lk-theme ${w.theme.id === t.id ? 'on' : ''} ${ok ? '' : 'locked'}" ${ok ? `data-act="lookSet" data-kind="theme" data-id="${t.id}"` : 'disabled'}>
      ${preview(uiOf(t.id), curLayout(t.id))}<b>${ok ? '' : '🔒 '}${esc(t.name)}</b><small>${ok ? esc(t.desc) : esc(howTo(t.need))}</small></button>`; }).join('')}</div>`;
  }
  return `<div class="look-sheet"><h2>🎨 Personnaliser</h2>
    <div class="segs">${tabs.map(([id, l]) => `<button class="seg ${tab === id ? 'on' : ''}" data-act="lookTab" data-t="${id}">${l}</button>`).join('')}</div>
    <div class="lk-list">${body}</div></div>`;
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
  const rows = [['✅', 'Cases cochées', b.cases], ['⭐', 'Bonus (journées parfaites, phrases, connexion)', b.bonus], ['🎯', 'Objectifs', b.goals], ['🍿', 'Médiathèque', b.media], ['🏅', 'Badges', b.badges], ['📅', 'Défis', b.challenges], ['⚔️', 'Boss', b.boss], ['🌱', 'Compétences et habitudes', b.growth], ['🪪', 'Identités', b.identity], ['🗓️', 'Bilans du mois', b.reviews]];
  return `<section class="card"><h2>⚡ D’où vient ton XP</h2>${rows.map(([e, l, v]) => `<div class="xp-row"><span>${e} ${l}</span><b>${nf(v)}</b></div>`).join('')}</section>`;
}

function profil() {
  return `${levelCard()}${bossCard()}${boxesCard()}<div class="two"><div>${companionCard()}${challengesCard()}</div><div>${resourcesCard()}${lookCard()}${rewardsCard()}${xpCard()}</div></div>`;
}

/* ---------- Cartes : recherche, tri, filtres ; albums ---------- */
// Familles obtenues depuis la dernière visite de la collection
export function newCards(g = G(), since = Number(pref('collSeen') || Date.now())) {
  return Object.keys(g.owned).filter(l => g.owned[l].t > since);
}
function collection() {
  const g = G();
  // Les cartes « nouvelles » restent marquées pendant toute la visite, puis plus jamais
  if (ui.collNewSince == null) { const seen = pref('collSeen'); ui.collNewSince = seen == null ? Date.now() : Number(seen); setPref('collSeen', Date.now()); }
  const mode = ui.collMode || 'cards', done = g.albums.filter(a => a.done).length;
  return `<div class="chips coll-modes"><button class="chip ${mode === 'cards' ? 'on' : ''}" data-act="collMode" data-m="cards">🎴 Cartes</button>
    <button class="chip ${mode === 'albums' ? 'on' : ''}" data-act="collMode" data-m="albums">📚 Albums ${done}/${g.albums.length}</button></div>
    ${mode === 'albums' ? albumsView(g) : cardsView(g)}`;
}
const SORTS = [['num', 'Ordre'], ['rare', 'Rareté'], ['recent', 'Récentes'], ['name', 'Nom'], ['dups', 'Doublons']];
function cardsView(g) {
  const all = Object.values(FORMS);
  const ownedForms = all.filter(f => g.forms.has(f.id)).length;
  const ser = ui.collSeries || 'all', rar = ui.collRarity || 0, fil = ui.collFilter || '', sort = ui.collSort || 'num', q = norm(ui.collQ || '');
  const since = ui.collNewSince || 0, isBase = f => LINES[f.line].base === f.id;
  const o = f => g.owned[f.line];
  const test = {
    '': () => true, owned: f => g.forms.has(f.id), new: f => isBase(f) && !!o(f) && o(f).t > since,
    shiny: f => !!o(f) && o(f).shiny, dups: f => isBase(f) && (g.dups[f.line] || 0) > 0, aw: f => (g.awaken[f.line] || 0) > 0,
  };
  let list = all.filter(f => (ser === 'all' || f.series === ser) && (!rar || LINES[f.line].rarity === rar) && (test[fil] || test[''])(f) && (!q || norm(f.name).includes(q)));
  const by = {
    rare: (a, b) => LINES[b.line].rarity - LINES[a.line].rarity || a.name.localeCompare(b.name, 'fr'),
    recent: (a, b) => ((o(b) && o(b).t) || 0) - ((o(a) && o(a).t) || 0),
    name: (a, b) => a.name.localeCompare(b.name, 'fr'),
    dups: (a, b) => (g.dups[b.line] || 0) - (g.dups[a.line] || 0),
  };
  if (by[sort]) list.sort(by[sort]);
  const total = list.length, limit = ui.collLimit || 120;
  list = list.slice(0, limit);
  const nNew = all.filter(test.new).length, nDup = Object.keys(g.dups).length, nAw = Object.keys(g.awaken).length;
  const serChips = [['all', 'Toutes', '#9b6bff']].concat(Object.entries(SERIES).map(([k, s]) => [k, `${s.emoji} ${s.name}`, s.color]))
    .map(([k, l, c]) => `<button class="chip ${ser === k ? 'on' : ''}" style="--c:${c}" data-act="collSeries" data-s="${k}">${esc(l)}</button>`).join('');
  const rarChips = [0, 1, 2, 3, 4, 5].map(r => `<button class="chip ${rar === r ? 'on' : ''}" style="--c:${r ? RARITY[r].color : '#9b6bff'}" data-act="collRarity" data-r="${r}">${r ? '★'.repeat(r) : 'Toutes'}</button>`).join('');
  const filChips = [['', 'Tout'], ['owned', '✓ Obtenues'], ['new', `🆕 Nouvelles ${nNew}`], ['shiny', `✨ Brillantes ${g.shinies}`], ['dups', `🃏 Doublons ${nDup}`], ['aw', `🔮 Éveillées ${nAw}`]]
    .map(([k, l]) => `<button class="chip ${fil === k ? 'on' : ''}" data-act="collFilter" data-f="${k}">${l}</button>`).join('');
  return `<section class="coll-head"><div><b>${ownedForms}</b> / ${all.length} cartes${g.shinies ? ` · ✨ ${g.shinies} brillantes` : ''}</div><div class="xpbar"><span style="width:${Math.round(ownedForms / all.length * 100)}%"></span></div></section>
    <div class="coll-tools"><input class="coll-search" type="search" data-input="collQ" value="${esc(ui.collQ || '')}" placeholder="🔎 Chercher une carte (Goku, Itachi, Pikachu…)" autocomplete="off">
      <div class="chips scroll-x">${SORTS.map(([k, l]) => `<button class="chip ${sort === k ? 'on' : ''}" data-act="collSort" data-s="${k}">${k === sort ? '⇅ ' : ''}${l}</button>`).join('')}</div></div>
    <div class="chips scroll-x">${filChips}</div>
    <div class="chips scroll-x">${serChips}</div>
    <div class="chips scroll-x">${rarChips}</div>
    ${list.length ? `<div class="coll-grid">${list.map(f => {
      const ow = o(f), known = g.forms.has(f.id), base = isBase(f);
      return `<button class="coll-item" data-act="cardOpen" data-id="${f.id}">${cardHTML(f.id, { known, size: 'sm', badge: g.companion && g.companion.form.id === f.id ? '🐾' : '',
        shiny: ow && ow.shiny, aw: g.awaken[f.line] || 0, dup: base ? g.dups[f.line] || 0 : 0, isNew: base && !!ow && ow.t > since })}</button>`;
    }).join('')}</div>`
      : `<p class="muted center pad">${q ? 'Aucune carte à ce nom.' : 'Aucune carte ici pour l’instant. Ouvre des box !'}</p>`}
    ${total > limit ? `<button class="btn ghost full" data-act="collMore">Afficher plus (${total - limit})</button>` : ''}`;
}
function albumsView(g) {
  const list = [...g.albums].sort((a, b) => (a.done - b.done) || (b.have / b.lines.length - a.have / a.lines.length));
  return `<p class="muted small center">Complète un album : <b>une grande box</b> et un <b>titre</b> à porter.</p>
    <div class="albums">${list.map(a => `<section class="album ${a.done ? 'done' : ''}">
      <div class="al-head"><span class="al-emoji">${a.emoji}</span><div class="al-t"><b>${esc(a.name)}</b><small>${a.done ? `✓ Complété · titre « ${esc(a.title)} »` : `Titre « ${esc(a.title)} » + grande box`}</small></div><span class="al-n">${a.have}/${a.lines.length}</span></div>
      <div class="d-bar"><span style="width:${Math.round(a.have / a.lines.length * 100)}%"></span></div>
      <div class="al-cards">${a.lines.map(l => { const own = g.owned[l], f = FORMS[l]; return `<button class="al-card ${own ? 'on' : ''} ${own && own.shiny ? 'shiny' : ''}" data-act="cardOpen" data-id="${l}" style="--rc:${RARITY[LINES[l].rarity].color}">
        <img src="${esc(f.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><small>${own ? esc(f.name) : '???'}</small></button>`; }).join('')}</div>
    </section>`).join('')}</div>`;
}

/* ---------- Maîtrise ---------- */
function masteryView() {
  const g = G(), doms = activeDomains().map(d => ({ d, m: g.mastery[d.id] })).filter(x => x.m).sort((a, b) => b.m.points - a.m.points);
  const total = doms.reduce((a, x) => a + x.m.level, 0);
  return `<section class="card ms-intro"><h2>⭐ Maîtrise</h2>
      <p class="muted">Chaque jour où tu fais un domaine, il gagne des points (jusqu’à 3 fois plus quand tu y passes du temps). <b>100 niveaux</b> par domaine, un <b>nouveau rang tous les 10 niveaux</b> : chaque rang rapporte une grande box, et certains un titre. Il faut environ 3 ans de régularité pour le niveau 100.</p>
      <div class="ms-ranks">${RANKS.map(([n, c, e], i) => `<span style="--rk:${c}" title="Niveaux ${i * 10 + 1} à ${i * 10 + 10}">${e}<small>${n}</small></span>`).join('')}</div>
      <p class="muted small center">Total : ${nf(total)} niveaux de maîtrise</p></section>
    <div class="ms-list">${doms.map(({ d, m }) => {
      const r = RANKS[m.rank], nx = RANKS[m.rank + 1], pct = m.need ? Math.round(m.into / m.need * 100) : 100;
      return `<div class="ms-row" style="--rk:${r[1]};--c:${d.color}">
        <span class="ms-emblem r${m.rank}"><b>${m.level}</b></span>
        <div class="ms-main"><div class="ms-top"><b>${d.emoji} ${esc(d.name)}</b><span class="ms-rank">${r[2]} ${r[0]}</span></div>
          <div class="xpbar alt"><span style="width:${pct}%"></span></div>
          <small class="muted">${m.level >= MAX_LEVEL ? 'Niveau maximum atteint 🌌' : `${m.into} / ${m.need} pts vers le niveau ${m.level + 1}`}${nx ? ` · rang ${nx[0]} au niveau ${(m.rank + 1) * 10 + 1}` : ''} · ${plural(m.days, 'jour', 'jours')}</small></div>
      </div>`;
    }).join('')}</div>`;
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
  const t = ui.gameTab || 'profil', nNew = t === 'collection' ? 0 : newCards().length;
  // En quittant la collection, la prochaine visite marquera les cartes obtenues entre-temps
  if (t !== 'collection') ui.collNewSince = null;
  const tabs = [['profil', '🎮 Profil'], ['collection', `🎴 Cartes${nNew ? ` <i class="seg-dot">${nNew}</i>` : ''}`], ['mastery', '⭐ Maîtrise'], ['badges', '🏅 Badges']];
  return `<header class="page-head"><h1>Jeu</h1></header>
    <div class="segs game-segs">${tabs.map(([id, l]) => `<button class="seg ${t === id ? 'on' : ''}" data-act="gameTab" data-t="${id}">${l}</button>`).join('')}</div>
    ${t === 'collection' ? collection() : t === 'mastery' ? masteryView() : t === 'badges' ? badges() : profil()}`;
}

/* ---------- Fiche d'une carte : famille, doublons, fusion, échange ---------- */
export function sheet(s) {
  const f = FORMS[s.id], L = LINES[f.line], g = G();
  const own = g.owned[L.id];
  const known = g.forms.has(f.id);
  const isComp = g.companion && g.companion.line === L.id;
  const dup = g.dups[L.id] || 0, aw = g.awaken[L.id] || 0, nextLv = aw + 1, cost = FUSE_COST[nextLv];
  const dupBox = own ? `<div class="dup-box">
      <p class="eyebrow">Doublons</p>
      <p class="dup-n">🃏 <b>${plural(dup, 'doublon', 'doublons')}</b>${aw ? ` · 🔮 ${AWAKEN[aw].name}` : ''}${own.shiny ? ' · ✨ brillante' : ''}</p>
      ${cost ? `<button class="btn ${dup >= cost ? 'primary' : ''} full" ${dup >= cost ? `data-act="fuse" data-line="${L.id}"` : 'disabled'}>🔮 Fusionner ${cost} doublons → ${AWAKEN[nextLv].name}${dup < cost ? ` (${dup}/${cost})` : ''}</button>`
        : '<p class="tag-ok">🌈 Stade ultime atteint</p>'}
      ${dup ? `<button class="btn full" data-act="recycle" data-line="${L.id}">💎 Échanger ${plural(dup, 'doublon', 'doublons')} → +${recycleValue(g, L.id)} fragments</button>` : ''}
      <p class="muted small">3 doublons → éveillée (cadre doré), puis 5 → ultime (arc-en-ciel). Un compagnon éveillé grandit plus vite.</p>
    </div>` : '';
  return `<div class="card-sheet">
    ${cardHTML(f.id, { known, size: 'lg', shiny: own && own.shiny, aw })}
    <div class="cs-info">
      <p class="eyebrow">${SERIES[f.series].emoji} ${esc(SERIES[f.series].name)} · ${'★'.repeat(L.rarity)} ${RARITY[L.rarity].name}</p>
      <h2>${known ? esc(f.name) : '???'}</h2>
      ${own ? `<p class="muted">Obtenue ${own.count > 1 ? `${own.count} fois` : '1 fois'}</p>` : '<p class="muted">Pas encore obtenue : elle peut sortir d’une box.</p>'}
      ${L.forms.length > 1 ? `<p class="eyebrow" style="margin-top:12px">Famille</p><div class="fam">${L.forms.map(id => `<button class="fam-item ${g.forms.has(id) ? '' : 'unknown'} ${id === f.id ? 'cur' : ''}" data-act="cardOpen" data-id="${id}"><img src="${esc(FORMS[id].img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'"><small>${g.forms.has(id) ? esc(FORMS[id].name) : '???'}</small></button>`).join('')}</div>
        <p class="muted small">On obtient toujours le premier stade. Les évolutions se débloquent en faisant grandir le compagnon (${nf(compThreshold(L.id))} XP par stade).</p>` : ''}
      ${own ? (isComp ? '<p class="tag-ok">🐾 C’est ton compagnon</p>' : `${g.compStates[L.id] && g.compStates[L.id].stage ? `<p class="tag-ok">🐾 Il t’attend au stade ${g.compStates[L.id].stage + 1} (${esc(g.compStates[L.id].form.name)}) : il repartira de là.</p>` : ''}<button class="btn primary" data-act="compSet" data-line="${L.id}">🐾 Choisir comme compagnon</button>`) : ''}
      ${dupBox}
    </div></div>`;
}

// Taux de chaque box, comment les gagner, et où en sont les garanties
export function oddsSheet() {
  const g = G();
  const bar = (left, max) => `<div class="xpbar alt"><span style="width:${Math.round((max - left) / max * 100)}%"></span></div>`;
  const left4 = Math.max(1, PITY4 - g.since4), left5 = Math.max(1, PITY5 - g.since5);
  return `<div class="odds-sheet"><h2>Taux des box</h2>
    <p class="muted small">Chance d’obtenir chaque rareté, pour chaque carte. Chaque carte a aussi 1 chance sur 50 d’être brillante (1 sur 30 dans une grande box).</p>
    <div class="odds-wrap"><table class="odds"><thead><tr><th></th>${[1, 2, 3, 4, 5].map(r => `<th style="color:${RARITY[r].color}">${r}★</th>`).join('')}</tr></thead>
      <tbody>${TIER_KEYS.map(k => `<tr><th><span class="od-name">${chestHTML(k, 'mini')}${TIERS[k].name}</span></th>${TIERS[k].odds.map(o => `<td>${o ? `${o} %` : '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    <div class="odds-how">${TIER_KEYS.map(k => {
      const T = TIERS[k];
      return `<div class="oh" style="--tc:${T.color}">${chestHTML(k)}<div><b>${T.name} · ${plural(T.cards, 'carte', 'cartes')}</b>
        ${T.min > 1 ? `<small>Au moins une carte ${T.min}★ garantie</small>` : '<small>Pas de 5★ dedans</small>'}
        <ul>${T.how.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div></div>`;
    }).join('')}</div>
    <p class="muted small">Grandes box aussi : chaque boss battu, chaque album complété, chaque nouveau rang de maîtrise, et la note S au bilan de la semaine (A : box classique, B : petite box).</p>
    <p class="eyebrow">Garanties des box classiques et grandes</p>
    <div class="pity"><div class="pity-row"><span>Une 4★ ou mieux</span>${bar(left4, PITY4)}<small>dans ${plural(left4, 'carte', 'cartes')} max</small></div>
      <div class="pity-row"><span>Une 5★</span>${bar(left5, PITY5)}<small>dans ${plural(left5, 'carte', 'cartes')} max</small></div></div>
  </div>`;
}

// Boutique : échanger des doublons contre des fragments, puis des fragments contre des box
export function shopSheet() {
  const g = G();
  const pick = max => Object.entries(g.dups).filter(([l]) => g.rarityOf(l) <= max);
  const low = pick(2), mid = pick(3);
  const sumN = l => l.reduce((a, [, n]) => a + n, 0), sumV = l => l.reduce((a, [k, n]) => a + recycleValue(g, k, n), 0);
  return `<div class="shop-sheet"><h2>💎 Boutique</h2>
    <p class="muted">Tes doublons restent sur leurs cartes : fusionne-les, ou échange-les ici contre des fragments, puis des box.</p>
    <p class="shop-bal">💎 <b>${nf(Math.max(0, g.frags))}</b> fragments</p>
    <div class="shop-list">${TIER_KEYS.map(k => {
      const T = TIERS[k], ok = g.frags >= T.cost;
      return `<div class="shop-item ${ok ? '' : 'off'}" style="--tc:${T.color}">${chestHTML(k)}<span class="si-txt"><b>${T.name}</b><small>${plural(T.cards, 'carte', 'cartes')}</small></span>
        <button class="btn sm ${ok ? 'primary' : ''}" ${ok ? `data-act="trade" data-k="${k}"` : 'disabled'}>💎 ${T.cost}</button></div>`;
    }).join('')}</div>
    <p class="eyebrow">Échanger des doublons</p>
    <div class="shop-recycle">
      <button class="btn full" ${low.length ? 'data-act="recycleBulk" data-max="2"' : 'disabled'}>🃏 Tous les doublons 1★ et 2★ (${sumN(low)}) → +${sumV(low)} 💎</button>
      <button class="btn full" ${mid.length > low.length ? 'data-act="recycleBulk" data-max="3"' : 'disabled'}>🃏 Jusqu’aux 3★ (${sumN(mid)}) → +${sumV(mid)} 💎</button>
      <p class="muted small">Les 4★ et 5★ s’échangent une par une depuis leur fiche, pour ne pas sacrifier une fusion. Un doublon vaut ${[1, 2, 3, 4, 5].map(r => `${FRAG[r]} 💎 en ${r}★`).join(', ')}.</p>
    </div>
  </div>`;
}

export const actions = {
  gameTab(el) { ui.gameTab = el.dataset.t; ui.tab = 'game'; if (el.dataset.t === 'collection') ui.collNewSince = null; },
  openBox(el) { startBox(el.dataset.k); },
  oddsOpen() { openSheet({ kind: 'odds' }); },
  shopOpen() { openSheet({ kind: 'shop' }); },
  bossOpen() { openSheet({ kind: 'boss' }); },
  lookOpen() { openSheet({ kind: 'look' }); },
  chalPick(el) {
    const ws = weekStart(today()), wk = key(ws);
    if (!chalOpen(ws)) return;
    const pick = [...(chalPick(ws).length ? chalPick(ws) : [0, 0, 0])];
    pick[Number(el.dataset.lv)] = Number(el.dataset.i);
    S.game.chal[wk] = { pick, u: Date.now() }; touch(S.game); save();
    burst(el, '#f5b700'); ui.sheet = { ...ui.sheet };
  },
  // Valider : les défis par défaut comptent comme choisis (le rappel du lundi disparaît)
  chalConfirm() {
    const ws = weekStart(today()), wk = key(ws);
    if (chalOpen(ws) && !S.game.chal[wk]) { S.game.chal[wk] = { pick: [0, 0, 0], u: Date.now() }; touch(S.game); save(); }
    closeSheet();
  },
  lookTab(el) { ui.lookTab = el.dataset.t; ui.sheet = { ...ui.sheet }; },
  lookSet(el) {
    S.settings.look = { ...(S.settings.look || {}), [el.dataset.kind]: el.dataset.id };
    touch(S.settings); save(); ui.sheet = { ...ui.sheet };
  },
  trade(el) { const k = el.dataset.k; if (tradeFragments(k)) { closeSheet(); startBox(k); } },
  pet(el) {
    const g = G();
    el.classList.remove('pet'); void el.offsetWidth; el.classList.add('pet');
    if (!g.companion) { speech(el, 'Ouvre une box pour obtenir ton compagnon 🎁'); return; }
    speech(el, petLine(g));
    burst(el, '#ff6ad5');
  },
  fuse(el) { const l = el.dataset.line, lv = fuse(l); if (lv) { closeSheet(); showFusion(l, lv); } },
  recycle(el) {
    const l = el.dataset.line, g = G(), n = g.dups[l] || 0, v = recycleValue(g, l);
    if (!n || !confirm(`Échanger ${plural(n, 'doublon', 'doublons')} de ${FORMS[l].name} contre ${v} fragments ?`)) return;
    const got = recycle([[l, n]]);
    if (got) { toast(`💎 +${got} fragments`); ui.sheet = { ...ui.sheet }; }
  },
  recycleBulk(el) {
    const g = G(), max = Number(el.dataset.max), list = Object.entries(g.dups).filter(([l]) => g.rarityOf(l) <= max);
    const n = list.reduce((a, [, x]) => a + x, 0);
    if (!n || !confirm(`Échanger ${plural(n, 'doublon', 'doublons')} (cartes ${max === 2 ? '1★ et 2★' : '1★ à 3★'}) contre des fragments ?`)) return;
    const got = recycle(list);
    if (got) { toast(`💎 +${got} fragments`); ui.sheet = { ...ui.sheet }; }
  },
  collSeries(el) { ui.collSeries = el.dataset.s; ui.collLimit = 120; },
  collRarity(el) { ui.collRarity = Number(el.dataset.r); ui.collLimit = 120; },
  collFilter(el) {
    if (ui.tab !== 'game' || ui.gameTab !== 'collection') ui.collNewSince = null;
    ui.collFilter = el.dataset.f; ui.collLimit = 120; ui.collMode = 'cards'; ui.tab = 'game'; ui.gameTab = 'collection';
  },
  collSort(el) { ui.collSort = el.dataset.s; },
  collMode(el) { ui.collMode = el.dataset.m; },
  collMore() { ui.collLimit = (ui.collLimit || 120) + 240; },
  cardOpen(el) { openSheet({ kind: 'card', id: el.dataset.id }); },
  compSet(el) { setCompanion(el.dataset.line); closeSheet(); ui.gameTab = 'profil'; toast('🐾 Nouveau compagnon !'); },
  rewardClaim(el) { const r = S.game.rewards.find(x => x.id === el.dataset.id); r.claimed = true; touch(r); touch(S.game); save(); toast('🎉 Profite bien !'); },
  rewardDel(el) {
    if (!confirm('Supprimer cette récompense ?')) return;
    S.game.rewards = S.game.rewards.filter(x => x.id !== el.dataset.id); S.dead[el.dataset.id] = Date.now(); touch(S.game); save();
  },
};
export const inputs = {
  collQ(el) { ui.collQ = el.value; ui.collLimit = 120; },
};
export const forms = {
  reward(f) {
    const level = Math.round(Number(f.level)), text = (f.text || '').trim();
    if (!level || !text) return false;
    S.game.rewards.push({ id: newId(), level, text, claimed: false, u: Date.now() }); touch(S.game); save();
    toast('Récompense ajoutée 🎁');
  },
};
