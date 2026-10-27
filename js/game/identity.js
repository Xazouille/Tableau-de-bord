// Identités « Je suis… » : chaque domaine a 7 paliers qui se débloquent avec le nombre de jours pratiqués.
// Une identité se construit et ne se perd jamais (dire « je suis un lecteur » motive plus que « je lis »).
import { isDone } from '../store.js';

export const IDENT_AT = [3, 10, 25, 50, 100, 200, 365];
export const IDENT_XP = [15, 30, 60, 100, 175, 300, 500];
const NAMES = {
  ecole: ['Élève', 'Élève régulier', 'Étudiant sérieux', 'Bosseur', 'Travailleur acharné', 'Esprit affûté', 'Expert en devenir'],
  echecs: ['Joueur d’échecs', 'Amateur éclairé', 'Tacticien', 'Stratège', 'Fin stratège', 'Maître tacticien', 'Grand stratège'],
  sport: ['Actif', 'Sportif', 'Sportif régulier', 'Athlète', 'Athlète discipliné', 'Corps d’acier', 'Machine de guerre'],
  argent: ['Attentif à son argent', 'Gestionnaire', 'Bon gestionnaire', 'Épargnant', 'Épargnant discipliné', 'Investisseur avisé', 'Maître de ses finances'],
  culture: ['Curieux', 'Lecteur', 'Lecteur assidu', 'Grand lecteur', 'Esprit cultivé', 'Érudit', 'Puits de culture'],
  alim: ['Attentif à son assiette', 'Mangeur équilibré', 'Adepte du bien-manger', 'Corps bien nourri', 'Pro de la nutrition', 'Maître de son assiette', 'Nutrition de champion'],
  medit: ['Esprit curieux', 'Méditant', 'Méditant régulier', 'Esprit calme', 'Esprit zen', 'Sage', 'Maître zen'],
  sommeil: ['Dormeur', 'Bon dormeur', 'Dormeur régulier', 'Gardien de ses nuits', 'Pro de la récup', 'Horloge parfaite', 'Maître du sommeil'],
  ecran: ['Moins connecté', 'Détox en cours', 'Libre de son écran', 'Esprit déconnecté', 'Maître de son attention', 'Imperméable aux écrans', 'Moine numérique'],
  scroll: ['Anti-scroll', 'Résistant', 'Esprit libre', 'Attention protégée', 'Incorruptible', 'Imperméable au scroll', 'Esprit souverain'],
  pas: ['Marcheur', 'Bon marcheur', 'Grand marcheur', 'Randonneur', 'Infatigable', 'Arpenteur', 'Globe-trotter'],
  journal: ['Plume', 'Plume régulière', 'Diariste', 'Introspectif', 'Chroniqueur de sa vie', 'Mémorialiste', 'Écrivain de sa vie'],
  competence: ['Apprenant', 'Curieux de tout', 'Autodidacte', 'Touche-à-tout', 'Apprenant acharné', 'Polymathe en devenir', 'Polymathe'],
  rangement: ['Rangé', 'Organisé', 'Intérieur net', 'Pro du rangement', 'Maison impeccable', 'Maître de l’ordre', 'Zen et ordonné'],
  hygiene: ['Soigné', 'Bien entretenu', 'Rituel au point', 'Toujours frais', 'Impeccable', 'Soin parfait', 'Élégance naturelle'],
};
const GENERIC = ['Premiers pas', 'Habitué', 'Régulier', 'Passionné', 'Pilier', 'Expert', 'Légende'];
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
