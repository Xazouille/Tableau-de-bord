// Identités « Je suis… » : chaque domaine a 11 paliers qui se débloquent avec le nombre de jours pratiqués.
// Une identité se construit et ne se perd jamais (dire « je suis un lecteur » motive plus que « je lis »).
import { isDone } from '../store.js';

// 11 paliers : de 3 jours à 1 500 jours (environ 4 ans), pour qu'il reste toujours quelqu'un à devenir
export const IDENT_AT = [3, 10, 25, 50, 100, 200, 365, 500, 730, 1000, 1500];
export const IDENT_XP = [15, 30, 60, 100, 175, 300, 500, 650, 800, 1000, 1500];
const NAMES = {
  ecole: ['Élève', 'Élève régulier', 'Étudiant sérieux', 'Bosseur', 'Travailleur acharné', 'Esprit affûté', 'Expert en devenir', 'Expert', 'Maître du savoir', 'Sommité', 'Légende du savoir'],
  echecs: ['Joueur d’échecs', 'Amateur éclairé', 'Tacticien', 'Stratège', 'Fin stratège', 'Maître tacticien', 'Grand stratège', 'Maître d’échecs', 'Grand maître', 'Génie de l’échiquier', 'Légende des échecs'],
  sport: ['Actif', 'Sportif', 'Sportif régulier', 'Athlète', 'Athlète discipliné', 'Corps d’acier', 'Machine de guerre', 'Athlète d’élite', 'Force de la nature', 'Titan', 'Légende du sport'],
  argent: ['Attentif à son argent', 'Gestionnaire', 'Bon gestionnaire', 'Épargnant', 'Épargnant discipliné', 'Investisseur avisé', 'Maître de ses finances', 'Bâtisseur de patrimoine', 'Stratège financier', 'Rentier en devenir', 'Légende de l’épargne'],
  culture: ['Curieux', 'Lecteur', 'Lecteur assidu', 'Grand lecteur', 'Esprit cultivé', 'Érudit', 'Puits de culture', 'Bibliothèque vivante', 'Encyclopédie ambulante', 'Sage érudit', 'Légende de la culture'],
  alim: ['Attentif à son assiette', 'Mangeur équilibré', 'Adepte du bien-manger', 'Corps bien nourri', 'Pro de la nutrition', 'Maître de son assiette', 'Nutrition de champion', 'Corps de champion', 'Discipline d’acier', 'Modèle de santé', 'Légende de la nutrition'],
  medit: ['Esprit curieux', 'Méditant', 'Méditant régulier', 'Esprit calme', 'Esprit zen', 'Sage', 'Maître zen', 'Esprit lumineux', 'Paix intérieure', 'Éveillé', 'Légende zen'],
  sommeil: ['Dormeur', 'Bon dormeur', 'Dormeur régulier', 'Gardien de ses nuits', 'Pro de la récup', 'Horloge parfaite', 'Maître du sommeil', 'Récupération d’élite', 'Rythme suisse', 'Énergie infinie', 'Légende du sommeil'],
  ecran: ['Moins connecté', 'Détox en cours', 'Libre de son écran', 'Esprit déconnecté', 'Maître de son attention', 'Imperméable aux écrans', 'Moine numérique', 'Maître de son temps', 'Attention d’acier', 'Zen numérique', 'Légende de la détox'],
  scroll: ['Anti-scroll', 'Résistant', 'Esprit libre', 'Attention protégée', 'Incorruptible', 'Imperméable au scroll', 'Esprit souverain', 'Concentration absolue', 'Volonté de fer', 'Inébranlable', 'Légende anti-scroll'],
  pas: ['Marcheur', 'Bon marcheur', 'Grand marcheur', 'Randonneur', 'Infatigable', 'Arpenteur', 'Globe-trotter', 'Explorateur', 'Marathonien du quotidien', 'Tour du monde', 'Légende de la marche'],
  journal: ['Plume', 'Plume régulière', 'Diariste', 'Introspectif', 'Chroniqueur de sa vie', 'Mémorialiste', 'Écrivain de sa vie', 'Mémoire vivante', 'Biographe', 'Auteur de sa vie', 'Légende de la plume'],
  competence: ['Apprenant', 'Curieux de tout', 'Autodidacte', 'Touche-à-tout', 'Apprenant acharné', 'Polymathe en devenir', 'Polymathe', 'Esprit universel', 'Génie touche-à-tout', 'Maître des savoirs', 'Légende de l’apprentissage'],
  rangement: ['Rangé', 'Organisé', 'Intérieur net', 'Pro du rangement', 'Maison impeccable', 'Maître de l’ordre', 'Zen et ordonné', 'Minimaliste', 'Ordre parfait', 'Maître du foyer', 'Légende du rangement'],
  hygiene: ['Soigné', 'Bien entretenu', 'Rituel au point', 'Toujours frais', 'Impeccable', 'Soin parfait', 'Élégance naturelle', 'Toujours impeccable', 'Rituel sacré', 'Icône de style', 'Légende du soin'],
};
const GENERIC = ['Premiers pas', 'Habitué', 'Régulier', 'Passionné', 'Pilier', 'Expert', 'Virtuose', 'Maître', 'Grand maître', 'Légende', 'Mythe'];
export const identNames = d => NAMES[d.id] || GENERIC.map(n => `${n} · ${d.name}`);

// Pour chaque domaine : palier atteint (0 = aucun), jours pratiqués, jour où chaque palier a été atteint
export function identityState(doms, dayKeys) {
  const out = {};
  for (const d of doms) {
    const at = [];
    let n = 0;
    for (const k of dayKeys) if (isDone(k, d.id)) { n++; const i = IDENT_AT.indexOf(n); if (i >= 0) at[i] = k; }
    const stage = IDENT_AT.filter(x => n >= x).length, names = identNames(d);
    out[d.id] = {
      id: d.id, n, stage, at, names, name: stage ? names[stage - 1] : '',
      next: stage < IDENT_AT.length ? names[stage] : '', nextAt: IDENT_AT[stage] || 0, prevAt: stage ? IDENT_AT[stage - 1] : 0,
      xp: IDENT_XP.slice(0, stage).reduce((a, b) => a + b, 0),
    };
  }
  return out;
}
