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
  for (let i = 120; i >= 1; i--) {
    const k = key(addDays(t, -i)), c = {}, x = {};
    const motivation = 0.55 + 0.35 * (1 - i / 120);       // de plus en plus régulier
    for (const dom of d.domains.list) {
      if (rnd() > motivation) continue;
      c[dom.id] = 1;
      if (dom.m.kind === 'levels') x[dom.id] = Math.min(dom.m.opts.length - 1, Math.floor(rnd() * dom.m.opts.length + 0.4));
      if (dom.m.kind === 'list') x[dom.id] = dom.m.items.map((_, j) => j).filter(() => rnd() < 0.7);
      if (dom.m.kind === 'money') { money = Math.round(money + (rnd() - 0.3) * 60); x[dom.id] = money; }
    }
    d.days[k] = { c, x, note: i % 5 === 0 ? NOTES[i % NOTES.length] : '', u: 1 };
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
  // Une carte de chaque famille (ouvertes dans une seule « box » pour laisser des box à ouvrir), toutes les évolutions visibles
  d.game.pulls = Object.values(LINES).map((l, i) => ({ id: uid(), b: 'demo', l: l.id, r: l.rarity, t: i + 1 }));
  d.game.unlockAll = true;
  const comp = LINES['db-gohan-namek'] ? 'db-gohan-namek' : Object.keys(LINES)[0];
  d.game.comp = [{ id: uid(), line: 'pk390', from: ago(90), t: 1 }, { id: uid(), line: comp, from: ago(30), t: 2 }]
    .filter(c => LINES[c.line] && FORMS[LINES[c.line].base]);
  d.game.rewards = [{ id: uid(), level: 10, text: 'Un resto japonais', claimed: true, u: 1 }, { id: uid(), level: 25, text: 'Un nouveau jeu vidéo', claimed: false, u: 1 },
    { id: uid(), level: 40, text: 'Un week-end à la mer', claimed: false, u: 1 }];
  d.game.u = 1;
  return d;
}
