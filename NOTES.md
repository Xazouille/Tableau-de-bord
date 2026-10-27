# Notes du projet — Level Up · Aaron

Ce fichier explique **pourquoi** cette appli existe, **comment** elle est construite, **sur quoi** reposent ses choix (études scientifiques comprises) et **comment** continuer à la faire évoluer. Il sert de point de départ à toute nouvelle session de travail (humaine ou Claude).

---

## 1. Pourquoi cette appli

### Le but
Level Up est le tableau de bord de **développement personnel** d'Aaron : une appli web perso (téléphone + ordinateur, installable, hors ligne) pour construire de bonnes habitudes au quotidien — révisions (DCG), sport, lecture, méditation, sommeil, argent, moins d'écran, etc.

### L'idée de départ : une « addiction positive »
Le choix assumé est de rendre l'appli **très motivante, presque addictive, mais au service de vraies actions** : chaque récompense du jeu (XP, box, cartes, boss…) ne s'obtient **qu'en faisant quelque chose de réel** (cocher une case = l'avoir vraiment fait). Les mécaniques des jeux vidéo et des gacha (Pokémon, Dragon Ball, Naruto, One Piece) servent de carburant à des habitudes utiles.

### Le garde-fou
Une motivation uniquement « pour le jeu » finit par s'user (effet nouveauté, sur-justification). D'où, depuis octobre 2026, une deuxième couche **ancrée dans des études** : identité (« Je suis… »), plans « si… alors… », mur des victoires, bienveillance après un échec, rappel du « pourquoi » et la question mensuelle « pour toi ou pour le jeu ? ». L'objectif à long terme : que l'habitude tienne **même si le jeu s'arrêtait**.

### Préférences d'Aaron (à respecter)
- Tout en **français**, tutoiement, ton encourageant. Le prénom affiché est « Aaron ».
- Site **personnel** (pas pensé pour d'autres utilisateurs).
- **Pas de sons**, jamais (vibrations OK).
- Aime les progressions **longues avec beaucoup de niveaux** (ex. maîtrise sur ~3 ans).
- Méthode de travail : **proposer d'abord** (liste numérotée / lettrée), Aaron valide par numéro, puis on code. **Demander avant de publier**, ou publier « tout à la fin » s'il l'a dit.
- Aime que les propositions s'appuient sur de **vraies études** (avec les sources).

---

## 2. Technique

### Pile
- **HTML / CSS / JavaScript vanilla en modules ES**, aucune étape de build, aucune dépendance à installer. Seule bibliothèque : `js/vendor/morphdom.js` (mise à jour du DOM sans tout redessiner).
- **PWA** : `manifest.webmanifest` + `sw.js` (service worker, réseau d'abord puis cache). ⚠️ À chaque publication qui change des fichiers JS/CSS, **incrémenter `CACHE`** dans `sw.js` (actuellement `levelup-v14`) et **ajouter tout nouveau fichier JS à `ASSETS`**.
- **Hébergement** : GitHub Pages, branche `main`, racine du dépôt (`.nojekyll` présent).
- Lancer en local : `python3 -m http.server 8765` puis http://localhost:8765.

### Arborescence
| Fichier | Rôle |
|---|---|
| `js/app.js` | Point d'entrée : rendu, navigation, délégation des clics/saisies, annonces (badges, niveaux, box, records, maîtrise, albums, boss, habitudes, compétences, identités), grands écrans (boss vaincu, bilans) |
| `js/store.js` | Données (`S`), valeurs par défaut, migration (`normalize`), enregistrement localStorage, **fusion entre appareils** (`merge`), synchro GitHub |
| `js/stats.js` | Séries, scores jour/semaine/mois, journées parfaites (`domainsOn(k)` : une case ajoutée ne compte qu'à partir de son jour d'ajout) |
| `js/measures.js` | Détail d'une case (temps, liste, montant, compétence) et XP correspondante |
| `js/ui.js` | État d'interface (`ui`), préférences locales (`pref`/`setPref`), bannières, toasts, gestion du bouton retour |
| `js/fx.js` | Confettis, éclats, vibrations |
| `js/timer.js` | Minuteur qui coche la case tout seul |
| `js/nudges.js` | Rappels « presque ! » (box, journée parfaite, boss, série, coucher…) |
| `js/insights.js` | Découvertes (liens entre domaines, humeur, sommeil, régularité…) |
| `js/demo.js` | Compte de démonstration (données à part, les vraies ne sont pas touchées) |
| `js/game/rules.js` | **Cœur du jeu** : `G()` recalcule tout (XP, niveaux, box gagnées, défis, jokers, compagnon, badges) à partir de l'historique |
| `js/game/*.js` | `tiers` (3 box), `gacha` (tirages), `opening` (animations et grands écrans), `roster` + `*-data` (cartes), `boss`, `mastery`, `albums`, `weekly` (bilan du dimanche, records), `cosmetics` (titres, cadres, thèmes), `growth` (compétences, habitudes, bilans du mois), `identity` (identités), `wins` (mur des victoires) |
| `js/views/*.js` | Un écran par fichier : `today`, `stats`, `game`, `goals`, `media`, `vision`, `settings` (+ « Plus »), `growth` (Progrès) |
| `css/app.css` | Tout le style (variables de couleur clair/sombre en haut) |
| `tools/` | Script de génération des données de cartes animé, tests navigateur (`tools/tests`) |

### Principes importants
1. **Tout est dérivé de l'historique.** On n'enregistre que les faits (cases cochées, détails, box ouvertes, fusions…). XP, box gagnées, niveaux, boss, maîtrise, identités, victoires sont **recalculés** par `G()`. Conséquences :
   - décocher une case retire l'XP correspondante ;
   - deux appareils synchronisés arrivent au même résultat ;
   - **attention** : changer une règle peut changer le passé (ex. des box « gagnées » qui disparaissent). Quand on modifie une règle, vérifier que l'ancien historique donne le même résultat (voir la compatibilité des défis : l'option 0 = l'ancien tirage, testée avec l'ancienne version de `rules.js`).
   - Box disponibles = box gagnées − box ouvertes.
2. **Cache des calculs** : `G()` est mémorisé tant que `rev()` (compteur incrémenté à chaque `save()`) et le jour ne changent pas. Toute modification de données doit passer par `save()`.
3. **Fusion multi-appareils** : chaque élément porte `u` (heure de modif) → le plus récent gagne ; les jours sont fusionnés case par case (`t` par case) ; les suppressions passent par `S.dead`. Tout nouveau type de données doit être ajouté à `defaults()`, `normalize()` et `merge()`/`mergeGame()`.
4. **Nouvelles cases** ajoutées par une mise à jour : listées dans `NEW_DOMAINS`, ajoutées une seule fois avec `from: today` pour ne pas casser les journées parfaites passées.
5. **Interface** : délégation d'événements via `data-act` (clics), `data-form` (formulaires), `data-input` (saisie) ; dans les grands écrans animés : `data-ov`. Les fenêtres du bas (« sheets ») sont déclarées dans `SHEETS` (`app.js`). Pour redessiner une sheet ouverte : `ui.sheet = { ...ui.sheet }`.
6. **Préférences locales** (pas synchronisées) via `pref/setPref` : onglet, ce qui a déjà été annoncé (`seenLevel`, `seenBoxes`, `records`, `mastery`, `albums`, `growth`, `ident`, `bossSeen`, `recapSeen`, `monthSeen`, `kindSeen`…), minuteur en cours.

### Données (`S`)
`profile`, `settings` (thème, seuil de série, `look`, `bedtime`), `domains.list` (cases : `id, name, emoji, color, hint, xp, m` = mesure, `from`, `plan {when, then}`, `archived`), `days[YYYY-MM-DD]` (`c` cases cochées, `x` détails dont `x.sleepreg`, `note`, `mood`, `t` heures), `goals`, `media`, `vision.blocks`, `skills`, `habits`, `reviews[YYYY-MM]` (`good, bad, focus, why`), `wins` (victoires notées), `game` (`pulls`, `trades`, `fusions`, `recycles`, `visits`, `badges`, `jokerDays`, `chal` = défis choisis par semaine, `comp` = compagnon, `rewards`, `since`, `dupFrom`), `dead`.

---

## 3. Les règles du jeu (résumé)

- **Cases du jour** (15 par défaut) : École, Échecs, Sport, Argent, Culture & Lecture, Alimentation, Méditation, Sommeil, Écran < 2h, Pas de scroll, Pas, Journal, Compétence, Rangement, Hygiène. Chaque case a une XP de base, multipliée selon le détail (temps passé, liste cochée, montant…).
- **Journée parfaite** : 80 % des cases, soit **12 sur 15** (réglable dans Réglages, enregistré en proportion). Elle donne la box classique, +50 XP et le coup critique sur le boss.
- **Série 🔥** : un jour compte si ≥ 50 % des cases (réglable). **Jokers** : 1 au départ, +1 par semaine entièrement réussie (3 max), sauvent la veille.
- **Box** : petite (1 carte, à 5 cases), classique (3 cartes, journée parfaite), grande (5 cartes, chaque niveau).
- **Cartes Pokémon** : pour chaque Pokémon, une **full art récente** (2020 et après : illustration rare, illustration spéciale, ultra rare…) quand elle existe, sinon sa carte la plus récente ; jamais les rééditions de cartes anciennes. Choix fait par `tools/pick_pokemon_cards.py` (souhait d'Aaron : récentes et full art plutôt qu'anciennes et chères). Garanties 4★ toutes les 15 cartes, 5★ toutes les 80. Doublons → fusion (éveillée / ultime) ou fragments → boutique.
- **Défis de la semaine** : 3 niveaux (petite / classique / grande box). Depuis octobre 2026, **3 propositions par niveau, à choisir jusqu'au mardi soir** (sinon le défi tiré au sort).
- **Compagnon** : il grandit avec l'XP des jours où il est actif ; un ancien compagnon garde son stade et son XP et repart de là quand on le reprend (affiché sur sa carte). XP par stade d'évolution selon la rareté : 1★ 500, 2★ 750, 3★ 1 050, 4★ 1 400, 5★ 1 750 (`EVO_XP` dans `rules.js`).
- **Boss** : un à la fois, 7 jours max, dégâts = XP (point faible ×2, journée parfaite ×1,5), le suivant arrive le lendemain d'une victoire ; 1 sur 4 légendaire.
- **Maîtrise** : 100 niveaux par domaine, rang tous les 10 niveaux (Novice → Mythe), ~3 ans pour le niveau 100.
- **Identités « Je suis… »** : 11 paliers par domaine à 3, 10, 25, 50, 100, 200, 365, 500, 730, 1 000 et 1 500 jours pratiqués (~4 ans, pour ne pas tout atteindre en un an). Ex. lecture : Curieux → Lecteur → Lecteur assidu → Grand lecteur → Esprit cultivé → Érudit → Puits de culture → Bibliothèque vivante → Encyclopédie ambulante → Sage érudit → Légende de la culture. XP 15 → 1 500, deviennent des titres portables, jamais perdues.
- **Compétences** notées par Aaron de 1 à 5★ ; l'XP d'une étoile n'arrive qu'avec assez de séances (3 / 10 / 25 / 50).
- **Habitudes à arrêter** : compteur de jours (visible aussi sur l'accueil, sous l'anneau), paliers 1 → 365 jours, record gardé après rechute.
- **Bilan du dimanche** (18 h, note S → D), **bilan du mois** (3 questions + « pour toi ou pour le jeu ? », box classique + 100 XP), **records** en direct.
- **Mur des victoires** : premières fois, nouveaux paliers, séries, journées parfaites, habitudes, étoiles, identités, rangs, objectifs, œuvres terminées, victoires notées (bouton « 🏅 C'est une victoire » sous la phrase du jour).
- **Plans « si… alors… »** par case, affichés sur la case, dans sa fiche et le matin.
- **Sommeil régulier** : « couché à mon heure (± 30 min) » = +10 XP, rappel 1 h avant l'heure de coucher, badges.
- **Thèmes** (Jeu → Personnaliser → Thèmes) : 13 thèmes complets (couleurs, police, arrondis, en clair et en sombre), avec un aperçu de l'écran d'accueil pour chacun. **3 dès le départ** (Néon, Minuit, Papier), les autres **se débloquent** : Océan niv. 5, Super Saiyan niv. 10, Sakura niv. 15, Forêt rang Confirmé, Lave 5 boss, Akatsuki album Akatsuki, Game Boy badge 100 cartes, Galaxie niv. 25, Glace série de 30 jours, Prisme 10 brillantes. Définis dans `js/looks.js` (tokens CSS injectés, `data-ui` sur `<html>`), conditions dans `js/game/cosmetics.js`.
- **Icône par thème** : l'onglet du navigateur prend tout de suite l'icône du thème porté. L'icône d'installation (`apple-touch-icon` sur iPhone, fichier d'appli `m/<thème>.webmanifest` sur Android) suit aussi le thème, mais l'écran d'accueil garde celle du moment de l'installation : il faut réinstaller l'appli pour la changer (sur iPhone, cela efface les données de l'appli → synchro ou sauvegarde avant). Couleurs dans `looks.js` (`icon`), images générées par `node tools/gen_theme_icons.js` dans `icons/t/`.
- **Disposition** (Réglages → 🎨 Apparence, libre) : Classique, Liste, Mosaïque, Épurée, mémorisée pour chaque thème (`S.settings.layouts`, `data-layout` sur `<html>`), avec aperçus. Le mode Auto / Clair / Sombre est dans la même carte.
- **Bienveillance** : après une série cassée, carte « 🌱 » au lieu d'un simple compteur à zéro ; en cochant, rappel du « pourquoi » (progrès réel ou phrase de la vision).

---

## 4. Sur quoi on se base (études)

Recherche faite en octobre 2026 pour savoir si cette motivation « par le jeu » est positive et si elle dure, puis pour trouver des mécaniques prouvées.

### Est-ce que la gamification marche, et est-ce que ça dure ?
- Méta-analyse d'essais randomisés sur l'activité physique : effet réel, **plus faible mais persistant** à long terme (g ≈ 0,15). — https://pmc.ncbi.nlm.nih.gov/articles/PMC8767479/
- **Effet nouveauté** : l'intérêt pour la gamification baisse vers 4 semaines (puis remonte). → renouveler le contenu, ne pas tout miser sur la nouveauté. — https://eric.ed.gov/?id=EJ1325797
- **Sur-justification** : des récompenses attendues peuvent faire baisser la motivation pour une activité qu'on aimait déjà (Deci, Koestner & Ryan). → question mensuelle « pour toi ou pour le jeu ? ». — https://journals.sagepub.com/doi/10.3102/00346543071001001
- **Loot boxes** : lien modéré avec le jeu d'argent → les box restent gagnées uniquement par de vraies actions, jamais achetées, et on n'en augmente pas la fréquence.
- **Suivre ses progrès** aide à atteindre ses objectifs (138 études, d = 0,40), surtout quand c'est noté (Harkin 2016). — https://eprints.whiterose.ac.uk/id/eprint/91437/
- **Habitude** : en moyenne 66 jours (18 à 254) pour devenir automatique ; **rater un jour ne change presque rien** (Lally 2010). → message bienveillant après une série cassée. — https://doi.org/10.1002/ejsp.674

### Mécaniques retenues (et leur base)
| Mécanique dans l'appli | Étude |
|---|---|
| Jokers (réserves de secours) | Sharif & Shu 2019 : objectifs atteints ~40 % de jours en plus — https://anderson-review.ucla.edu/wp-content/uploads/2021/03/Sharif-Shu_EmergencyReserveFailure_OBHDP2019.pdf |
| Message bienveillant après un échec | Breines & Chen 2012 : l'auto-compassion fait réviser ~25 % plus longtemps après un échec — https://pubmed.ncbi.nlm.nih.gov/22645164/ ; Silverman & Barasch 2023 : une série affichée « cassée » fait décrocher — https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions |
| Plans « si… alors… » | Gollwitzer & Sheeran 2006 : d = 0,65 sur 94 tests — https://doi.org/10.1016/S0065-2601(06)38002-1 |
| Défis au choix (3 options) | Patall 2008 : le choix augmente motivation et effort, surtout avec 2 à 4 options — https://pubmed.ncbi.nlm.nih.gov/18298272/ |
| Identités « Je suis… » | Bryan et al. 2011 : « être un votant » plutôt que « voter » → +11 à 14 points de participation — https://pacscenter.stanford.edu/publications/simple-change-phrasing-can-increase-voter-turnout |
| Mur des victoires | Amabile & Kramer : progresser est le 1er facteur des meilleures journées, les petites victoires comptent presque autant — https://hbswk.hbs.edu/item/6685.html ; Harkin 2016 (ci-dessus) |
| Sommeil régulier | Windred 2023 (61 000 personnes) : la régularité prédit mieux la mortalité que la durée (−20 à −48 %) — https://www.ukbiobank.ac.uk/publications/sleep-regularity-is-a-stronger-predictor-of-mortality-risk-than-sleep-duration-a-prospective-cohort-study/ |
| Case Pas (5 000 → 15 000) | Paluch 2022 : bénéfices jusqu'à ~8 000–10 000 pas/jour avant 60 ans — https://doaj.org/article/c3639c468b4348958202e52793ab979d |

### Idées proposées mais pas (encore) retenues
À reproposer si Aaron le souhaite — chacune a une base solide :
- **M1 Série réparable** (Silverman & Barasch 2023), **M4 Nouveau départ** lundi / 1er du mois (Dai, Milkman & Riis 2014 — https://doi.org/10.1287/mnsc.2014.1901), **M5 Carte de fidélité avec tampons offerts** (Nunes & Drèze 2006 : 34 % vs 19 % — https://doi.org/10.1086/500480 ; Kivetz 2006), **M6 Case dorée mystère** (Shen, Fishbach & Hsee 2015, récompense incertaine), **M8 Pari avec moi-même** (Giné, Karlan & Zinman 2010 — https://doi.org/10.1257/app.2.4.213), **M9 Plaisir réservé** (Milkman 2014 — https://doi.org/10.1287/mnsc.2013.1784), **M10 WOOP** pour les objectifs (méta-analyse g = 0,34 — https://pmc.ncbi.nlm.nih.gov/articles/PMC8149892/), **M12 Saisons de 6 semaines** (contre l'effet nouveauté).
- Nouvelles cases possibles : **révision active** pour le DCG (Dunlosky 2013 : seules l'auto-interrogation et la révision espacée sont « très utiles » — https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html), **3 bonnes choses** (Seligman 2005), **nature 120 min/semaine** (White 2019), **musculation** 30–60 min/semaine (Momma 2022, Noetel 2024), **lien social** (Holt-Lunstad 2010), **bonne action** (Curry 2018), **douche froide** (Buijze 2016), **meilleur moi possible** (Carrillo 2019). Idée associée : des « cases de la semaine » qui ne comptent pas dans la journée parfaite.
- Idée refusée : série flexible « 6 jours sur 7 » (jugée redondante avec les jokers).

---

## 5. Historique (ce qui a été fait)
1. Refonte « Level Up » (PR #1) : cases, stats, objectifs, médiathèque, vision, jeu de base, synchro GitHub.
2. Publication sans Jekyll.
3. PR #3 : 3 types de box + invocation animée, boss, maîtrise, fusion des doublons, brillantes, albums, bilan du dimanche, records, « presque ! », humeur et découvertes, recherche dans la collection, titres/cadres/thèmes, compagnon interactif.
4. PR #4 : nouvelles cases (Pas, Journal, Compétence, Rangement, Hygiène), page Progrès (compétences, habitudes, bilans du mois), minuteur ; puis identités, mur des victoires, plans si… alors…, défis au choix, sommeil régulier, bienveillance, rappel du pourquoi, « pour toi ou pour le jeu ? ».

6. Thèmes complets à débloquer (13, dont 3 de base) et 4 dispositions avec aperçus (octobre 2026).
5. Journée parfaite à 12/15, compteurs d'habitudes sur l'accueil, identités sur 11 paliers (~4 ans), cartes Pokémon full art récentes.

---

## 6. Tester et publier

### Tests
Tests navigateur avec Playwright (Chromium) dans `tools/tests/` (voir le README de ce dossier). Principe : servir le site en local, injecter des données dans `localStorage`, piloter l'appli, vérifier `G()` et prendre des captures. Toujours vérifier :
- aucune erreur console / page ;
- pas de défilement horizontal à 390 px de large ;
- l'ancien historique donne les mêmes box (compatibilité des règles) ;
- le mode démo ne touche pas aux vraies données.

### Publier
1. Travailler sur une branche, faire des commits clairs (en français).
2. Incrémenter `CACHE` dans `sw.js` et compléter `ASSETS` si de nouveaux fichiers.
3. Ouvrir une pull request vers `main` puis la fusionner (seulement avec l'accord d'Aaron).
4. GitHub Pages republie en ~1 minute. Sur le téléphone, fermer/rouvrir l'appli une ou deux fois pour recevoir la mise à jour.
