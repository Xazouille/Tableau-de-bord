// Rappels « presque ! » : ce qui est à portée de main aujourd'hui, du plus motivant au moins urgent.
import { S, activeDomains, isDone } from './store.js';
import { dayCount, globalStreak, periodScore, perfectNeed } from './stats.js';
import { G } from './game/rules.js';
import { GRADES } from './game/weekly.js';
import { RANKS, rankOf } from './game/mastery.js';
import { todayKey, today, weekStart, addDays, plural } from './util.js';

export function nudges() {
  const g = G(), k = todayKey(), doms = activeDomains(), n = doms.length, c = dayCount(k), out = [];
  if (!n) return out;
  const hour = new Date().getHours(), sAt = g.smallAt;
  if (c < sAt && sAt - c <= 2) out.push({ key: 'small', p: 90, ico: '🎁', left: sAt - c, txt: `Plus que ${plural(sAt - c, 'case', 'cases')} pour ta petite box` });
  const pn = perfectNeed(n);
  if (c >= sAt && c < pn && pn - c <= 2) out.push({ key: 'perfect', p: 86, ico: '🏆', left: pn - c, txt: `Plus que ${plural(pn - c, 'case', 'cases')} pour une journée parfaite (box classique)` });

  const b = g.boss.current;
  if (b) {
    const pct = Math.round((b.hp - b.dmg) / b.hp * 100), wd = doms.find(d => d.id === b.weak);
    if (pct <= 25) out.push({ key: 'boss', p: 95, ico: '⚔️', pct, txt: `${b.name} n’a plus que ${pct} % de vie : achève-le !` });
    else if (!b.left) out.push({ key: 'bosslast', p: 82, ico: '⏳', txt: `Dernier jour pour battre ${b.name} (encore ${pct} % de vie)` });
    if (wd && !isDone(k, wd.id) && pct > 25) out.push({ key: 'weak', p: 38, ico: wd.emoji, txt: `${wd.name} fait double dégâts à ${b.name}` });
  }

  const st = globalStreak();
  if (hour >= 17 && st.n >= 3 && !st.today) {
    const need = Math.max(1, Math.ceil((S.settings.threshold || 0.5) * n - 1e-9) - c);
    out.push({ key: 'streak', p: 88, ico: '🔥', txt: `Ta série de ${st.n} jours est en jeu : encore ${plural(need, 'case', 'cases')}` });
  }

  // Note de la semaine : le dimanche, ce qui manque pour la note au-dessus
  if (new Date().getDay() === 0) {
    const ws = weekStart(today()), sc = periodScore(ws, addDays(ws, 6));
    const next = GRADES.slice().reverse().find(x => x.min > sc.pct);
    const need = next ? Math.ceil(next.min / 100 * 7 * n - 1e-9) - sc.done : 0;
    if (next && need > 0 && need <= Math.min(3, n - c)) out.push({ key: 'grade', p: 92, ico: '📅', txt: `Encore ${plural(need, 'case', 'cases')} aujourd’hui pour la note ${next.g} de la semaine` });
  }

  const toLv = g.lvl.need - g.lvl.into;
  if (toLv <= 80) out.push({ key: 'level', p: 70, ico: '⭐', txt: `Encore ${toLv} XP pour le niveau ${g.lvl.level + 1} (grande box)` });

  // Maîtrise : un domaine à une séance d'un nouveau niveau (ou d'un nouveau rang)
  let ms = null;
  for (const d of doms) {
    const m = g.mastery[d.id];
    if (!m || !m.need || isDone(k, d.id) || m.need - m.into > 10) continue;
    const up = rankOf(m.level + 1) > m.rank;
    if (!ms || up) ms = { d, m, up };
  }
  if (ms) out.push({ key: 'mastery', p: ms.up ? 75 : 50, ico: ms.d.emoji, txt: `${ms.d.name} : coche-le aujourd’hui et tu passes niveau ${ms.m.level + 1}${ms.up ? ` (rang ${RANKS[rankOf(ms.m.level + 1)][0]})` : ''}` });

  for (const ch of g.challenges) if (!ch.done && !ch.unit && ch.goal - ch.value === 1) { out.push({ key: 'chal', p: 45, ico: ch.emoji, txt: `Défi « ${ch.text} » : plus qu’un !` }); break; }

  // Heure de coucher dans moins d'une heure
  const bt = /^(\d\d):(\d\d)$/.exec(S.settings.bedtime || '');
  if (bt && doms.some(d => d.id === 'sommeil')) {
    const now = new Date(), left = ((Number(bt[1]) * 60 + Number(bt[2])) - (now.getHours() * 60 + now.getMinutes()) + 1440) % 1440;
    if (left <= 60) out.push({ key: 'bed', p: 80, ico: '🌙', txt: left <= 5 ? `C’est l’heure d’aller te coucher (${S.settings.bedtime})` : `Coucher à ${S.settings.bedtime} : dans ${left} min, prépare-toi` });
  }
  return out.sort((a, b) => b.p - a.p);
}
