// Compte de démonstration : 4 mois d'historique, toutes les cartes débloquées, des box à ouvrir.
import { defaults } from './store.js';
import { key, today, addDays, uid } from './util.js';
import { LINES, FORMS } from './game/roster.js';

const NOTES = ['Grosse séance de sport ce matin 💪', 'Journée calme, mais j’ai tenu bon.', 'Révisions UE 4 bouclées !', 'Pas de scroll de la journée, ça fait du bien.',
  'Bonne nuit de sommeil, enfin.', 'J’ai fini mon livre.', 'Méditation de 20 minutes, esprit clair.', 'Petite victoire : pas de soda.'];

export function makeDemo() {
  const d = defaults();
  const t = today(), start = addDays(t, -120);
  d.profile.start = key(start);
  const rnd = Math.random;
  let money = 1450;
  d.skills = [['Anglais', '🇬🇧', 3], ['Guitare', '🎸', 2], ['Code', '💻', 4]].map(([name, emoji, stars], i) => ({ id: 'sk' + i, name, emoji, stars, created: key(start), u: 1 }));
  d.habits = [{ id: 'hb0', name: 'Sucre', emoji: '🍬', start: key(addDays(t, -50)), resets: [key(addDays(t, -20))], u: 1 }, { id: 'hb1', name: 'Réseaux le soir', emoji: '📱', start: key(addDays(t, -9)), resets: [], u: 1 }];
  for (let i = 120; i >= 1; i--) {
    const k = key(addDays(t, -i)), c = {}, x = {};
    const motivation = 0.55 + 0.35 * (1 - i / 120);       // de plus en plus régulier
    for (const dom of d.domains.list) {
      if (rnd() > motivation) continue;
      c[dom.id] = 1;
      if (dom.m.kind === 'levels') x[dom.id] = Math.min(dom.m.opts.length - 1, Math.floor(rnd() * dom.m.opts.length + 0.4));
      if (dom.m.kind === 'list') x[dom.id] = dom.m.items.map((_, j) => j).filter(() => rnd() < 0.7);
      if (dom.m.kind === 'skill') x[dom.id] = { s: 'sk' + Math.floor(rnd() * 3), v: Math.floor(rnd() * 3) };
      if (dom.m.kind === 'money') { money = Math.round(money + (rnd() - 0.3) * 60); x[dom.id] = money; }
    }
    if (c.sommeil) x.sleepreg = rnd() < 0.65 ? 1 : 0;
    // Humeur : meilleure les jours bien remplis (pas notée tous les jours)
    const ratio = Object.keys(c).length / d.domains.list.length;
    const mood = rnd() < 0.8 ? Math.max(1, Math.min(5, Math.round(1.2 + 3.6 * ratio + (rnd() - 0.5) * 1.6))) : 0;
    d.days[k] = Object.assign({ c, x, note: i % 5 === 0 ? NOTES[i % NOTES.length] : '', u: 1 }, mood ? { mood } : {});
    d.game.visits[k] = 1;
  }
  const ago = n => key(addDays(t, -n)), soon = n => key(addDays(t, n));
  d.goals = [
    { id: uid(), title: 'Obtenir le DCG', emoji: '🎓', type: 'steps', horizon: 'annee', due: soon(240), created: ago(100), parent: '', value: 0, done: false, u: 1,
      steps: ['UE 1 Droit', 'UE 4 Fiscal', 'UE 9 Compta', 'UE 10 Compta approfondie'].map((text, i) => ({ id: uid(), text, done: i < 2 })) },
    { id: uid(), title: 'Lire 20 livres', emoji: '📚', type: 'count', horizon: 'annee', due: soon(66), created: ago(300), target: 20, unit: 'livres', value: 13, parent: '', done: false, steps: [], u: 1 },
    { id: uid(), title: 'Courir un 10 km', emoji: '🏃', type: 'simple', horizon: 'mois', due: soon(20), created: ago(10), parent: '', value: 0, done: false, steps: [], u: 1 },
    { id: uid(), title: 'Épargner 1 000 €', emoji: '💰', type: 'count', horizon: 'trimestre', due: ago(5), created: ago(95), target: 1000, unit: '€', value: 1000, parent: '', done: true, doneAt: ago(5), steps: [], u: 1 },
  ];
  const media = [['anime', 'Naruto Shippuden', 5], ['anime', 'Dragon Ball Z', 5], ['manga', 'One Piece', 5], ['film', 'Interstellar', 4], ['livre', 'Atomic Habits', 5],
    ['serie', 'Breaking Bad', 5], ['film', 'Dragon Ball Super : Broly', 4], ['manga', 'Jujutsu Kaisen', 4], ['livre', 'Père riche, père pauvre', 4]];
  d.media = media.map(([type, title, rating], i) => ({ id: uid(), type, title, status: 'done', rating, review: '', date: ago(5 + i * 9), cover: '', created: i, u: 1 }))
    .concat([{ id: uid(), type: 'anime', title: 'Hunter x Hunter', status: 'doing', rating: 0, review: '', date: '', cover: '', created: 20, u: 1 },
      { id: uid(), type: 'film', title: 'Your Name', status: 'todo', rating: 0, review: '', date: '', cover: '', created: 21, u: 1 }]);
  d.vision.blocks[0].text = 'Je veux devenir quelqu’un de discipliné, qui tient ses promesses envers lui-même.\nObtenir mon DCG et être fier du chemin parcouru.';
  d.vision.blocks[1].text = 'La régularité bat le talent. Chaque petite victoire compte.';
  // Plans « si… alors… », heure de coucher, victoires notées, bilan du mois dernier
  const plans = { ecole: ['après le dîner', '15 min de révision active'], sport: ['en rentrant à la maison', 'je pars courir 20 min'], medit: ['juste après le réveil', '5 min de respiration'], culture: ['au lit, avant de dormir', '10 pages'] };
  for (const dom of d.domains.list) if (plans[dom.id]) dom.plan = { when: plans[dom.id][0], then: plans[dom.id][1] };
  d.settings.bedtime = '23:00';
  d.wins = [{ id: uid(), k: ago(2), emoji: '⭐', text: '10 min de conversation en anglais sans bloquer', u: 1 }, { id: uid(), k: ago(12), emoji: '⭐', text: 'Premier 5 km couru sans m’arrêter', u: 1 }];
  const pm = new Date(t.getFullYear(), t.getMonth() - 1, 1), pmk = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`;
  d.reviews[pmk] = { good: 'Le sport 4 fois par semaine', bad: 'Le téléphone le soir', focus: 'Réviser le DCG tous les jours', why: 'deux', u: 1 };
  // Une carte de chaque famille (ouvertes dans une seule « box » pour laisser des box à ouvrir), toutes les évolutions visibles
  const lines = Object.values(LINES);
  d.game.pulls = lines.map((l, i) => Object.assign({ id: uid(), b: 'demo', l: l.id, r: l.rarity, t: i + 1 }, i % 37 === 0 ? { s: 1 } : {}));
  // Des doublons à fusionner ou échanger, quelques brillantes, et deux cartes déjà éveillées
  for (let i = 0; i < 120; i++) { const l = lines[Math.floor(rnd() * lines.length)]; d.game.pulls.push(Object.assign({ id: uid(), b: 'demo2', l: l.id, r: l.rarity, t: 5000 + i }, i % 15 === 0 ? { s: 1 } : {})); }
  const fused = [['na-itachi', 9], ['db-goku', 4], ['on-luffy', 3]].filter(([l]) => LINES[l]);
  for (const [l, n] of fused) for (let i = 0; i < n; i++) d.game.pulls.push({ id: uid(), b: 'demo3', l, r: LINES[l].rarity, t: 6000 + i });
  // Une carte prête à fusionner (4 doublons)
  if (LINES['na-kakashi']) for (let i = 0; i < 4; i++) d.game.pulls.push({ id: uid(), b: 'demo3', l: 'na-kakashi', r: LINES['na-kakashi'].rarity, t: 6500 + i });
  d.game.fusions = fused.filter(([, n]) => n >= 3).flatMap(([l, n], j) => [{ id: uid(), l, lv: 1, t: 7000 + j * 2 }].concat(n >= 8 ? [{ id: uid(), l, lv: 2, t: 7001 + j * 2 }] : []));
  d.game.dupFrom = 0;
  // Boss, bilans et rangs de maîtrise depuis le début de la démo
  d.game.since = key(start);
  d.game.unlockAll = true;
  const comp = LINES['db-gohan-namek'] ? 'db-gohan-namek' : Object.keys(LINES)[0];
  d.game.comp = [{ id: uid(), line: 'pk390', from: ago(90), t: 1 }, { id: uid(), line: comp, from: ago(30), t: 2 }]
    .filter(c => LINES[c.line] && FORMS[LINES[c.line].base]);
  d.game.rewards = [{ id: uid(), level: 10, text: 'Un resto japonais', claimed: true, u: 1 }, { id: uid(), level: 25, text: 'Un nouveau jeu vidéo', claimed: false, u: 1 },
    { id: uid(), level: 40, text: 'Un week-end à la mer', claimed: false, u: 1 }];
  d.game.u = 1;
  return d;
}
