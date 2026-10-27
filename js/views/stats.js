// Écran « Stats » : scores, calendrier façon GitHub, séries par domaine, journal.
import { S, activeDomains, isDone, valOf } from '../store.js';
import { dayCount, dayRatio, dayTotal, isPerfect, isJoker, globalStreak, globalBest, domainStreak, domainBest, domainRate, periodScore, weekScore, monthScore, totalChecks } from '../stats.js';
import { ui, empty } from '../ui.js';
import { G } from '../game/rules.js';
import { RANKS } from '../game/mastery.js';
import { records, weekRecap, recapReady } from '../game/weekly.js';
import { showRecap } from '../game/opening.js';
import { insights, moodSeries, NEEDED_DAYS } from '../insights.js';
import { MOODS } from './today.js';
import { fmtMoney } from '../measures.js';
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
      else { const r = dayRatio(k); lvl = r === 0 ? 0 : r < 0.3 ? 1 : r < 0.55 ? 2 : r < 0.8 ? 3 : 4; }
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

// Sommeil : nuits où tu t'es couché à ton heure, sur les 14 dernières
function regLine() {
  let n = 0, any = false;
  for (let i = 0; i < 14; i++) { const v = valOf(key(addDays(today(), -i)), 'sleepreg'); if (v === 1) n++; if (v != null) any = true; }
  return any ? ` · 🌙 ${n}/14 nuits à l’heure` : '';
}
function domainsCard() {
  const g = G();
  const rows = activeDomains().map(d => {
    const s = domainStreak(d.id), b = domainBest(d.id), r = domainRate(d.id, 30), m = g.mastery[d.id];
    return `<div class="d-row" style="--c:${d.color}">
      <span class="d-emoji">${d.emoji}</span>
      <div class="d-main"><div class="d-top"><b>${esc(d.name)}${m ? ` <span class="d-ms" style="--rk:${RANKS[m.rank][1]}">niv. ${m.level}</span>` : ''}</b><span class="d-nums"><span class="${s.n ? 'fire' : 'muted'}">🔥 ${s.n}</span><span class="muted">🏆 ${b}</span></span></div>
        <div class="d-bar"><span style="width:${r}%"></span></div><span class="muted small">${r} % des 30 derniers jours${d.id === 'sommeil' ? regLine() : ''}</span></div>
    </div>`;
  }).join('');
  return `<section class="card"><div class="c-head"><h2>Par domaine</h2><span class="muted small">🔥 série · 🏆 record</span></div>${rows}</section>`;
}

// Courbe du total des comptes (une seule série : pas de légende, le titre la nomme)
function moneyChart() {
  const pts = G().money;
  if (!pts.length) return '';
  const last = pts[pts.length - 1][1], first = pts[0][1];
  const ago = key(addDays(today(), -30)), before = pts.filter(([k]) => k <= ago).pop();
  const d30 = before ? last - before[1] : null;
  const sign = n => (n > 0 ? '+' : '') + fmtMoney(n);
  if (pts.length < 2) {
    return `<section class="card"><div class="c-head"><h2>💰 Mon argent</h2></div><div class="money-now">${fmtMoney(last)}</div><p class="muted small">La courbe apparaîtra dès ton deuxième point.</p></section>`;
  }
  const W = 600, H = 170, t0 = parseKey(pts[0][0]).getTime(), t1 = parseKey(pts[pts.length - 1][0]).getTime() || t0 + 1;
  let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1]));
  const pad = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 10;
  lo -= pad; hi += pad;
  const X = k => ((parseKey(k).getTime() - t0) / ((t1 - t0) || 1)) * W, Y = v => H - ((v - lo) / (hi - lo)) * H;
  const line = pts.map(([k, v], i) => `${i ? 'L' : 'M'}${X(k).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const area = `${line}L${W},${H}L0,${H}Z`;
  const data = esc(JSON.stringify(pts.map(([k, v]) => [X(k) / W, Y(v) / H, fmtShort(parseKey(k)), fmtMoney(v)])));
  return `<section class="card"><div class="c-head"><h2>💰 Mon argent</h2><span class="muted small">total de mes comptes</span></div>
    <div class="money-row"><div class="money-now">${fmtMoney(last)}</div>
      ${d30 != null ? `<span class="m-delta ${d30 >= 0 ? 'up' : 'down'}">${d30 >= 0 ? '▲' : '▼'} ${sign(d30)} en 30 jours</span>` : ''}
      <span class="muted small">Depuis le début : ${sign(last - first)}</span></div>
    <div class="mchart" data-pts="${data}">
      <span class="mc-y top">${fmtMoney(Math.round(hi))}</span><span class="mc-y bot">${fmtMoney(Math.round(lo))}</span>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ok)" stop-opacity=".28"/><stop offset="1" stop-color="var(--ok)" stop-opacity="0"/></linearGradient></defs>
        <path d="${area}" fill="url(#mg)"/><path d="${line}" fill="none" stroke="var(--ok)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>
      <i class="mc-dot"></i><i class="mc-cross"></i><div class="mc-tip"></div>
    </div>
    <div class="mc-x"><span>${fmtShort(parseKey(pts[0][0]))}</span><span>${fmtShort(parseKey(pts[pts.length - 1][0]))}</span></div>
  </section>`;
}
// Survol de la courbe : point le plus proche + infobulle
export function chartHover(e) {
  const c = e.target.closest && e.target.closest('.mchart');
  document.querySelectorAll('.mchart.hover').forEach(x => { if (x !== c) x.classList.remove('hover'); });
  if (!c || e.type === 'pointerleave') return;
  const pts = JSON.parse(c.dataset.pts), r = c.getBoundingClientRect();
  const fx = (e.clientX - r.left) / r.width;
  let best = pts[0];
  for (const p of pts) if (Math.abs(p[0] - fx) < Math.abs(best[0] - fx)) best = p;
  const x = best[0] * r.width, y = best[1] * r.height;
  c.classList.add('hover');
  c.querySelector('.mc-dot').style.cssText = `left:${x}px;top:${y}px`;
  c.querySelector('.mc-cross').style.left = x + 'px';
  const tip = c.querySelector('.mc-tip');
  tip.innerHTML = `<b>${best[3]}</b><span>${best[2]}</span>`;
  tip.style.left = Math.min(Math.max(x, 60), r.width - 60) + 'px';
}

function journal() {
  const notes = Object.entries(S.days).filter(([, d]) => d.note && d.note.trim()).sort((a, b) => a[0] < b[0] ? 1 : -1);
  const shown = notes.slice(0, ui.journalAll ? 365 : 8);
  const list = shown.map(([k, d]) => `<li><span class="j-date">${fmtShort(parseKey(k))}</span><span class="j-txt">${esc(d.note)}</span><span class="j-n">${dayCount(k)}/${dayTotal(k)}</span></li>`).join('');
  return `<section class="card"><div class="c-head"><h2>Mon journal</h2><span class="muted small">${plural(notes.length, 'phrase', 'phrases')}</span></div>
    ${notes.length ? `<ul class="journal">${list}</ul>${notes.length > shown.length ? '<button class="btn ghost full" data-act="journalAll">Tout afficher</button>' : ''}` : '<p class="muted">Tes phrases du jour apparaîtront ici.</p>'}</section>`;
}

// Records personnels
function recordsCard() {
  const g = G(), r = records(g), best = globalBest();
  const doms = activeDomains().map(d => ({ d, n: domainBest(d.id) })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 3);
  const rows = [
    r.day.v ? ['⚡', 'Meilleure journée', `${r.day.v} XP`, fmtShort(parseKey(r.day.k))] : null,
    r.week.v ? ['📈', 'Meilleure semaine', `${r.week.v.toLocaleString('fr-FR')} XP`, `sem. du ${fmtShort(parseKey(r.week.k))}`] : null,
    best ? ['🔥', 'Plus longue série', plural(best, 'jour', 'jours'), ''] : null,
    r.cases.v ? ['✅', 'Le plus de cases en un jour', `${r.cases.v}`, fmtShort(parseKey(r.cases.k))] : null,
    r.money.v ? ['💰', 'Plus gros total d’argent', fmtMoney(r.money.v), fmtShort(parseKey(r.money.k))] : null,
    ...doms.map(({ d, n }) => [d.emoji, `${d.name} d’affilée`, plural(n, 'jour', 'jours'), '']),
  ].filter(Boolean);
  return `<section class="card"><div class="c-head"><h2>🏆 Mes records</h2><span class="muted small">battus en direct</span></div>
    ${rows.map(([e, l, v, d]) => `<div class="rec-row"><span>${e} ${esc(l)}</span><b>${v}</b><small class="muted">${d}</small></div>`).join('')}</section>`;
}

// Humeur des 30 derniers jours et découvertes
function insightsCard() {
  const ins = insights(), ms = moodSeries(30), rated = ms.filter(([, v]) => v);
  const chart = rated.length ? `<div class="mood-chart" aria-label="Humeur des 30 derniers jours">${ms.map(([k, v]) => `<span class="mc-bar m${v}" style="height:${v ? 18 + v * 16 : 6}%" title="${fmtShort(parseKey(k))}${v ? ' · ' + MOODS[v] : ''}"></span>`).join('')}</div>
    <p class="muted small">Humeur moyenne sur 30 jours : <b>${MOODS[Math.round(rated.reduce((a, [, v]) => a + v, 0) / rated.length)]} ${(rated.reduce((a, [, v]) => a + v, 0) / rated.length).toFixed(1).replace('.', ',')}/5</b> (${plural(rated.length, 'jour noté', 'jours notés')})</p>`
    : '<p class="muted small">Note ton humeur chaque jour (sous tes cases) pour voir ce qui te fait du bien.</p>';
  return `<section class="card"><div class="c-head"><h2>💡 Découvertes</h2><span class="muted small">ce qui marche pour toi</span></div>
    ${chart}
    ${ins.list.length ? `<ul class="insights">${ins.list.map(x => `<li><span>${x.ico}</span><p>${x.txt}</p></li>`).join('')}</ul>`
      : `<p class="muted">${ins.days < NEEDED_DAYS ? `Encore ${plural(NEEDED_DAYS - ins.days, 'jour', 'jours')} d’historique pour tes premières découvertes.` : 'Rien de marquant pour l’instant : continue, les liens apparaîtront.'}</p>`}
  </section>`;
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
    <div class="recap-row"><button class="btn tint recap-btn" data-act="recapOpen">📅 Bilan de la semaine · note ${weekRecap(weekStart(t), G()).grade.g}</button>
      <button class="btn tint recap-btn" data-act="monthOpen">🗓️ Bilan du mois</button></div>
    ${heatmap()}
    ${moneyChart()}
    <div class="two stats-two">${weeksChart()}${domainsCard()}${recordsCard()}${insightsCard()}${journal()}</div>`;
}

export const actions = {
  heatDom(el) { ui.heatDom = el.dataset.id; },
  heatSel(el) { ui.heatSel = ui.heatSel === el.dataset.k ? null : el.dataset.k; },
  journalAll() { ui.journalAll = true; },
  recapOpen() {
    const ws = weekStart(today());
    showRecap({ ...weekRecap(ws, G()), live: true, provisional: !recapReady(ws) });
  },
};
