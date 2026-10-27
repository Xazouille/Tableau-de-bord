// Découvertes : ce qui marche pour toi, d'après ton historique (liens entre domaines, humeur, jours de la semaine).
import { S, activeDomains, isDone, valOf } from './store.js';
import { dayCount, dayRatio } from './stats.js';
import { key, today, addDays, parseKey, esc } from './util.js';

const WD = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const avg = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const f1 = x => x.toFixed(1).replace('.', ',');
export const NEEDED_DAYS = 14;

// Les 120 derniers jours (sans aujourd'hui, pas encore fini)
function pastDays() {
  const first = Object.keys(S.days).sort()[0], out = [];
  if (!first) return out;
  for (let i = 1; i <= 120; i++) { const k = key(addDays(today(), -i)); if (k < first) break; out.push(k); }
  return out;
}

export function insights() {
  const doms = activeDomains(), n = doms.length, days = pastDays(), out = [];
  if (!n || days.length < NEEDED_DAYS) return { list: out, days: days.length };
  // Effet d'entraînement : les jours où tu fais un domaine, tu en fais plus ailleurs
  for (const d of doms) {
    const w = [], wo = [];
    for (const k of days) { const c = dayCount(k); if (isDone(k, d.id)) w.push(c - 1); else wo.push(c); }
    if (w.length < 5 || wo.length < 5) continue;
    const diff = avg(w) - avg(wo);
    if (diff >= 0.8) out.push({ s: diff, ico: d.emoji, txt: `Les jours où tu fais <b>${esc(d.name)}</b>, tu coches en moyenne <b>${f1(diff)} cases de plus</b> ailleurs.` });
  }
  // Humeur
  const md = days.filter(k => S.days[k] && S.days[k].mood), mood = k => S.days[k].mood;
  if (md.length >= 7) {
    for (const d of doms) {
      const w = md.filter(k => isDone(k, d.id)).map(mood), wo = md.filter(k => !isDone(k, d.id)).map(mood);
      if (w.length < 3 || wo.length < 3) continue;
      const diff = avg(w) - avg(wo);
      if (diff >= 0.4) out.push({ s: diff * 2.5, ico: d.emoji, txt: `Ton humeur est meilleure les jours de <b>${esc(d.name)}</b> : ${f1(avg(w))}/5 contre ${f1(avg(wo))}/5.` });
    }
    const hi = md.filter(k => dayRatio(k) >= 0.7).map(mood), lo = md.filter(k => dayRatio(k) < 0.4).map(mood);
    if (hi.length >= 3 && lo.length >= 3 && avg(hi) - avg(lo) >= 0.4) out.push({ s: 3, ico: '😄', txt: `Les jours bien remplis (70 % et plus), ton humeur monte à <b>${f1(avg(hi))}/5</b>, contre ${f1(avg(lo))}/5 les jours vides.` });
  }
  // Sommeil : une vraie nuit, et la journée qui suit
  const sl = doms.find(d => d.id === 'sommeil');
  if (sl) {
    const good = k => isDone(k, 'sommeil') && valOf(k, 'sommeil') >= 2;
    const w = days.filter(good).map(k => dayCount(k) - 1), wo = days.filter(k => !good(k)).map(k => dayCount(k) - (isDone(k, 'sommeil') ? 1 : 0));
    if (w.length >= 5 && wo.length >= 5 && avg(w) - avg(wo) >= 0.7) out.push({ s: avg(w) - avg(wo), ico: '😴', txt: `Après une nuit de 7 h et plus, tu coches <b>${f1(avg(w) - avg(wo))} cases de plus</b> dans la journée.` });
  }
  // Régularité : couché à son heure la veille
  if (sl) {
    const reg = days.filter(k => valOf(k, 'sleepreg') === 1), irr = days.filter(k => valOf(k, 'sleepreg') === 0);
    const c = k => dayCount(k) - (isDone(k, 'sommeil') ? 1 : 0);
    if (reg.length >= 5 && irr.length >= 5 && avg(reg.map(c)) - avg(irr.map(c)) >= 0.7) out.push({ s: avg(reg.map(c)) - avg(irr.map(c)), ico: '🌙', txt: `Les jours après un coucher à ton heure, tu coches <b>${f1(avg(reg.map(c)) - avg(irr.map(c)))} cases de plus</b>.` });
  }
  // Jours de la semaine
  const byWd = Array.from({ length: 7 }, () => []);
  for (const k of days) byWd[parseKey(k).getDay()].push(dayRatio(k));
  const wds = byWd.map((a, i) => ({ i, v: a.length >= 2 ? avg(a) : null })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
  if (wds.length >= 5 && wds[0].v - wds[wds.length - 1].v >= 0.1) {
    const b = wds[0], w = wds[wds.length - 1];
    out.push({ s: 1.5, ico: '📅', txt: `Ton meilleur jour : <b>${WD[b.i]}</b> (${Math.round(b.v * 100)} %). Le plus difficile : <b>${WD[w.i]}</b> (${Math.round(w.v * 100)} %).` });
  }
  // Tendance : les 14 derniers jours contre les 14 d'avant
  if (days.length >= 28) {
    const a = avg(days.slice(0, 14).map(k => dayRatio(k))), b = avg(days.slice(14, 28).map(k => dayRatio(k))), d = Math.round((a - b) * 100);
    if (Math.abs(d) >= 5) out.push({ s: Math.abs(d) / 10, ico: d > 0 ? '🚀' : '📉', txt: d > 0 ? `Tu progresses : <b>+${d} points</b> sur les 2 dernières semaines par rapport aux 2 d’avant.` : `Petit coup de mou : <b>${d} points</b> sur les 2 dernières semaines. Une case à la fois !` });
  }
  return { list: out.sort((x, y) => y.s - x.s).slice(0, 5), days: days.length };
}

// Humeur des 30 derniers jours (0 = pas notée)
export function moodSeries(n = 30) {
  return Array.from({ length: n }, (_, i) => { const k = key(addDays(today(), i - n + 1)); return [k, (S.days[k] && S.days[k].mood) || 0]; });
}
