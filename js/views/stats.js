// Écran « Stats » : scores, calendrier façon GitHub, séries par domaine, journal.
import { S, activeDomains, isDone } from '../store.js';
import { dayCount, isPerfect, isJoker, globalStreak, globalBest, domainStreak, domainBest, domainRate, periodScore, weekScore, monthScore, totalChecks } from '../stats.js';
import { ui, empty } from '../ui.js';
import { key, today, addDays, weekStart, parseKey, fmtLong, fmtShort, esc, MONTHS_SHORT, plural, todayKey } from '../util.js';

function statTile(label, value, sub, cls = '') {
  return `<div class="stat ${cls}"><span class="s-label">${label}</span><span class="s-val">${value}</span><span class="s-sub">${sub}</span></div>`;
}

function heatmap() {
  const doms = activeDomains(), n = doms.length, sel = ui.heatDom;
  const dom = doms.find(d => d.id === sel);
  const t = today(), first = addDays(weekStart(t), -52 * 7);
  let cols = '', months = '', lastMonth = -1;
  for (let w = 0; w <= 52; w++) {
    const ws = addDays(first, w * 7);
    const m = ws.getMonth();
    months += `<span>${m !== lastMonth && ws.getDate() <= 7 ? MONTHS_SHORT[m] : ''}</span>`;
    if (ws.getDate() <= 7) lastMonth = m;
    let cells = '';
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), k = key(d);
      if (d > t) { cells += '<i class="h-cell future"></i>'; continue; }
      let lvl;
      if (dom) lvl = isDone(k, dom.id) ? 4 : 0;
      else { const r = n ? dayCount(k) / n : 0; lvl = r === 0 ? 0 : r < 0.3 ? 1 : r < 0.55 ? 2 : r < 0.8 ? 3 : 4; }
      const extra = (!dom && isPerfect(k) ? ' perfect' : '') + (!dom && isJoker(k) ? ' joker' : '') + (k === ui.heatSel ? ' sel' : '') + (k === todayKey() ? ' now' : '');
      cells += `<i class="h-cell l${lvl}${extra}" data-act="heatSel" data-k="${k}"></i>`;
    }
    cols += `<div class="h-col">${cells}</div>`;
  }
  const chips = [`<button class="chip ${sel === 'all' ? 'on' : ''}" data-act="heatDom" data-id="all">Tous</button>`]
    .concat(doms.map(d => `<button class="chip ${sel === d.id ? 'on' : ''}" style="--c:${d.color}" data-act="heatDom" data-id="${d.id}">${d.emoji} ${esc(d.name)}</button>`)).join('');
  let info = '<span class="muted">Touche une case pour voir le détail.</span>';
  if (ui.heatSel) {
    const k = ui.heatSel, day = S.days[k], done = doms.filter(d => isDone(k, d.id));
    info = `<b>${fmtLong(parseKey(k))}</b> · ${done.length}/${n}${isJoker(k) ? ' · 🃏 joker' : ''} ${done.map(d => d.emoji).join(' ')}${day && day.note ? `<br><span class="muted">« ${esc(day.note)} »</span>` : ''}`;
  }
  return `<section class="card" style="--c:${dom ? dom.color : 'var(--accent)'}">
    <div class="c-head"><h2>Ta régularité</h2><span class="muted small">12 derniers mois</span></div>
    <div class="chips scroll-x">${chips}</div>
    <div class="heat-scroll" data-scroll-end><div class="heat">
      <div class="h-months">${months}</div>
      <div class="h-grid"><div class="h-days"><span></span><span>lun.</span><span></span><span>mer.</span><span></span><span>ven.</span><span></span></div>${cols}</div>
    </div></div>
    <div class="h-foot"><div class="h-info">${info}</div>
      <div class="h-legend">Moins <i class="h-cell l0"></i><i class="h-cell l1"></i><i class="h-cell l2"></i><i class="h-cell l3"></i><i class="h-cell l4"></i> Plus</div></div>
  </section>`;
}

function weeksChart() {
  const t = today(), bars = [];
  for (let i = 11; i >= 0; i--) {
    const ws = addDays(weekStart(t), -7 * i);
    const sc = periodScore(ws, addDays(ws, 6));
    bars.push(`<div class="bar ${i === 0 ? 'cur' : ''}" title="Semaine du ${fmtShort(ws)} : ${sc.pct} %"><span class="b-track"><span class="b-fill" style="height:${Math.max(sc.pct, 2)}%"><span class="b-val">${sc.pct}</span></span></span><span class="b-lab">${ws.getDate()}/${ws.getMonth() + 1}</span></div>`);
  }
  return `<section class="card"><div class="c-head"><h2>Semaine par semaine</h2><span class="muted small">score en %</span></div><div class="bars">${bars.join('')}</div></section>`;
}

function domainsCard() {
  const rows = activeDomains().map(d => {
    const s = domainStreak(d.id), b = domainBest(d.id), r = domainRate(d.id, 30);
    return `<div class="d-row" style="--c:${d.color}">
      <span class="d-emoji">${d.emoji}</span>
      <div class="d-main"><div class="d-top"><b>${esc(d.name)}</b><span class="d-nums"><span class="${s.n ? 'fire' : 'muted'}">🔥 ${s.n}</span><span class="muted">🏆 ${b}</span></span></div>
        <div class="d-bar"><span style="width:${r}%"></span></div><span class="muted small">${r} % des 30 derniers jours</span></div>
    </div>`;
  }).join('');
  return `<section class="card"><div class="c-head"><h2>Par domaine</h2><span class="muted small">🔥 série · 🏆 record</span></div>${rows}</section>`;
}

function journal() {
  const notes = Object.entries(S.days).filter(([, d]) => d.note && d.note.trim()).sort((a, b) => a[0] < b[0] ? 1 : -1);
  const shown = notes.slice(0, ui.journalAll ? 365 : 8);
  const list = shown.map(([k, d]) => `<li><span class="j-date">${fmtShort(parseKey(k))}</span><span class="j-txt">${esc(d.note)}</span><span class="j-n">${dayCount(k)}/${activeDomains().length}</span></li>`).join('');
  return `<section class="card"><div class="c-head"><h2>Mon journal</h2><span class="muted small">${plural(notes.length, 'phrase', 'phrases')}</span></div>
    ${notes.length ? `<ul class="journal">${list}</ul>${notes.length > shown.length ? '<button class="btn ghost full" data-act="journalAll">Tout afficher</button>' : ''}` : '<p class="muted">Tes phrases du jour apparaîtront ici.</p>'}</section>`;
}

export function render() {
  const t = today(), n = activeDomains().length;
  const d = { c: dayCount(key(t)) }, w = weekScore(), m = monthScore(), st = globalStreak(), best = globalBest();
  if (!Object.keys(S.days).length) {
    return `<header class="page-head"><h1>Stats</h1></header>` + empty('📊', 'Pas encore de stats', 'Coche tes premières cases sur l’écran Aujourd’hui : ton calendrier, tes séries et tes scores apparaîtront ici.', '<button class="btn primary" data-act="tab" data-tab="today">C’est parti</button>');
  }
  return `<header class="page-head"><h1>Stats</h1><p class="eyebrow">${plural(totalChecks(), 'case cochée', 'cases cochées')} au total</p></header>
    <div class="stats-grid">
      ${statTile('Aujourd’hui', `${n ? Math.round(d.c / n * 100) : 0}<small>%</small>`, `${d.c}/${n} cases`, 'g1')}
      ${statTile('Semaine', `${w.pct}<small>%</small>`, `${w.done}/${w.max} cases`, 'g2')}
      ${statTile('Mois', `${m.pct}<small>%</small>`, `${m.done}/${m.max} cases`, 'g3')}
      ${statTile('Série', `🔥 ${st.n}`, `record : ${plural(best, 'jour', 'jours')}`, 'g4')}
    </div>
    <p class="muted small center">Une journée compte pour la série si au moins ${Math.round((S.settings.threshold || 0.5) * 100)} % des cases sont cochées.</p>
    ${heatmap()}
    <div class="two stats-two">${weeksChart()}${domainsCard()}${journal()}</div>`;
}

export const actions = {
  heatDom(el) { ui.heatDom = el.dataset.id; },
  heatSel(el) { ui.heatSel = ui.heatSel === el.dataset.k ? null : el.dataset.k; },
  journalAll() { ui.journalAll = true; },
};
