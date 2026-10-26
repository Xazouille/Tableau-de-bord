// Boss : un méchant à la fois, à battre en 7 jours maximum avec les cases cochées.
// Battu plus tôt ? Le suivant arrive dès le lendemain. Raté ? Il s'enfuit et reviendra plus tard.
// Tout est recalculé à partir de l'historique, depuis le jour où les boss ont commencé (S.game.since).
import { S, activeDomains } from '../store.js';
import { key, parseKey, addDays, dayDiff, seeded } from '../util.js';
import { isPerfect } from '../stats.js';
import { LINES, FORMS } from './roster.js';

// [famille de la carte, domaine faible, petite phrase]
const NORMAL = [
  ['db-raditz', 'sport', 'Il méprise les faibles : montre-lui ta forme physique.'],
  ['na-zabuza', 'sport', 'Le démon du brouillard ne supporte pas l’endurance.'],
  ['on-arlong', 'ecole', 'Il exploitait Nami pour ses cartes : le savoir le fait plier.'],
  ['db-nappa', 'echecs', 'Tout en muscles, rien dans la tête : la stratégie le terrasse.'],
  ['na-kakuzu', 'argent', 'Il ne pense qu’à l’argent : chaque point sur tes comptes le blesse.'],
  ['on-crocodile', 'argent', 'Le patron de Baroque Works perd ses moyens face à un budget tenu.'],
  ['db-capitaine-ginyu', 'culture', 'Ses poses ne valent rien face à un esprit cultivé.'],
  ['na-orochimaru', 'sommeil', 'Il rôde la nuit : une vraie nuit de sommeil le repousse.'],
  ['on-ener', 'ecran', 'Le dieu de la foudre se nourrit de tes écrans allumés.'],
  ['db-freezer', 'medit', 'Sa colère est sa faiblesse : reste calme et médite.'],
  ['na-deidara', 'culture', 'Pour lui, l’art est une explosion : la vraie culture le désarme.'],
  ['on-rob-lucci', 'sport', 'Le tueur du CP9 ne lâche rien… sauf face à plus endurant.'],
  ['db-cell', 'ecole', 'Il a copié les meilleurs : seul le travail personnel le surpasse.'],
  ['na-sasori', 'echecs', 'Le marionnettiste anticipe tout, sauf une vraie stratégie.'],
  ['on-gecko-moria', 'sommeil', 'Il vole les ombres la nuit : dors bien pour lui échapper.'],
  ['db-boubou', 'alim', 'Il transforme tout en bonbons : mange sainement pour le contrer.'],
  ['na-hidan', 'medit', 'Ses rituels sont violents : la sérénité le fait fuir.'],
  ['on-doflamingo', 'scroll', 'Il tire les ficelles comme un fil d’actualité infini.'],
  ['db-cooler', 'sommeil', 'Le grand frère de Freezer frappe les esprits fatigués.'],
  ['na-kisame', 'alim', 'Le requin de la brume dévore tout : choisis bien ton assiette.'],
  ['on-charlotte-katakuri', 'alim', 'Il cache sa bouche pour manger ses donuts : reste sain.'],
  ['db-janemba', 'scroll', 'Né du mal accumulé, il grossit à chaque scroll.'],
  ['na-pain', 'medit', 'Il veut te faire connaître la douleur : réponds par la paix.'],
  ['on-caesar-clown', 'ecole', 'Ce scientifique fou ne résiste pas à un vrai savoir.'],
  ['db-goku-black', 'ecran', 'Il vient d’un futur envahi par les écrans.'],
  ['na-kabuto', 'ecole', 'Il a tout appris des autres : apprends plus vite que lui.'],
  ['on-akainu', 'medit', 'Sa justice brûle tout : le calme intérieur l’éteint.'],
  ['db-broly-legendaire', 'medit', 'Sa rage est sans limite : seule la sérénité l’apaise.'],
  ['na-danzo', 'ecran', 'Il surveille tout depuis l’ombre, comme un écran allumé.'],
  ['on-queen', 'sport', 'Ce colosse déteste ceux qui bougent plus que lui.'],
  ['na-obito-masque', 'scroll', 'Il t’enferme dans un rêve sans fin, comme le scroll.'],
  ['on-jack', 'echecs', 'La Sécheresse fonce sans réfléchir : sois plus malin.'],
];
const LEGEND = [
  ['na-madara', 'medit', 'Le plus grand Uchiha. Seule une volonté de fer le fait plier.'],
  ['on-kaido', 'sport', 'La créature la plus forte du monde. Il faudra tout donner.'],
  ['db-jiren', 'sport', 'Le plus fort de l’univers 11 ne respecte que la persévérance.'],
  ['pk150', 'echecs', 'Le Pokémon le plus puissant ne craint qu’un esprit affûté.'],
  ['na-kaguya', 'sommeil', 'La déesse lapin plonge le monde dans un sommeil éternel.'],
  ['on-charlotte-linlin', 'alim', 'Big Mom engloutit tout : une alimentation saine la ruine.'],
  ['db-beerus', 'alim', 'Le dieu de la destruction ne pense qu’à manger…'],
  ['pk384', 'ecran', 'Le gardien du ciel déteste la lumière bleue des écrans.'],
  ['on-marshall-d-teach', 'scroll', 'Barbe Noire avale tout dans ses ténèbres, comme un fil sans fin.'],
  ['na-obito-jinchuriki-de-jubi', 'scroll', 'Le Jinchûriki de Jûbi veut un rêve éternel pour tous.'],
  ['db-freezer-ressuscite', 'medit', 'Revenu des enfers, plus fort que jamais : reste zen.'],
  ['pk491', 'sommeil', 'Darkrai hante les nuits : un bon sommeil le dissipe.'],
  ['db-goku-black-zamasu', 'ecran', 'Les deux visages du chaos. Coupe les écrans.'],
  ['pk487', 'medit', 'Le maître du monde distorsion : garde l’esprit clair.'],
];
const mk = ([line, weak, why]) => ({ line, weak, why });
const valid = list => list.map(mk).filter(b => LINES[b.line] && FORMS[LINES[b.line].base]);
export const BOSSES = valid(NORMAL), LEGENDS = valid(LEGEND);
export const bossName = b => FORMS[LINES[b.line].base].name;
export const bossImg = b => FORMS[LINES[b.line].base].img;

const DAY = 864e5;
const nextKey = k => key(addDays(parseKey(k), 1));
function shuffle(list, rnd) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Dégâts d'un jour : l'XP des cases cochées, ×2 sur le point faible, ×1,5 pour une journée parfaite (coup critique)
export function dayDamage(k, weak, per) {
  let x = 0;
  for (const [id, v] of Object.entries(per || {})) x += id === weak ? v * 2 : v;
  return Math.round(isPerfect(k) ? x * 1.5 : x);
}

// Points de vie calés sur tes 4 dernières semaines : une semaine normale suffit à peine, une bonne semaine le bat
function hpFor(start, legendary, caseXPs, first, doms) {
  let sum = 0, n = 0;
  for (let i = 1; i <= 28; i++) {
    const k = key(addDays(parseKey(start), -i));
    if (!first || k < first) break;
    n++;
    for (const v of Object.values(caseXPs[k] || {})) sum += v;
  }
  const fallback = doms.reduce((a, d) => a + (Number(d.xp) || 0), 0) * 0.55;
  const avg = n >= 7 ? sum / n : fallback;
  return Math.max(100, Math.round(avg * 7 * 0.95 * (legendary ? 1.35 : 1) / 10) * 10);
}

function weakOf(b, doms, start) {
  const d = doms.find(x => x.id === b.weak);
  return d ? d.id : doms[Math.floor(seeded(b.line + start)() * doms.length)].id;
}

// Rejoue tous les combats depuis le début : boss battus ou enfuis, et le combat en cours
export function runBosses(caseXPs, tk) {
  const doms = activeDomains(), since = S.game.since;
  if (!since || !doms.length || !BOSSES.length) return { history: [], current: null, nextStart: since };
  const first = Object.keys(S.days).sort()[0];
  const qN = shuffle(BOSSES, seeded('boss-n' + since)), qL = shuffle(LEGENDS, seeded('boss-l' + since));
  const history = [];
  let d = since, i = 0, current = null;
  while (d <= tk && i < 1000) {
    const legendary = LEGENDS.length > 0 && (i + 1) % 4 === 0;
    const q = legendary ? qL : qN;
    if (!q.length) q.push(...shuffle(legendary ? LEGENDS : BOSSES, seeded('boss-r' + i)));
    const b = q.shift();
    const weak = weakOf(b, doms, d), hp = hpFor(d, legendary, caseXPs, first, doms);
    const end = key(addDays(parseKey(d), 6));
    let dmg = 0, won = null;
    const days = [];
    for (let k = d; k <= end && k <= tk; k = nextKey(k)) {
      const x = dayDamage(k, weak, caseXPs[k]);
      dmg += x; days.push([k, x]);
      if (dmg >= hp) { won = k; break; }
    }
    const f = { n: i, ...b, name: bossName(b), img: bossImg(b), legendary, hp, weak, start: d, end, days, dmg: Math.min(dmg, hp) };
    if (won) { history.push({ ...f, won: true, endDay: won, t: parseKey(won).getTime() + DAY / 2 }); d = nextKey(won); }
    else if (end < tk) { history.push({ ...f, won: false, endDay: end }); q.splice(Math.min(3, q.length), 0, b); d = nextKey(end); }
    else { current = { ...f, dayNo: dayDiff(d, tk) + 1, left: dayDiff(tk, end) }; break; }
    i++;
  }
  return { history, current, nextStart: current ? null : d };
}
