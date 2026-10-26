# Level Up — tableau de bord d'Aaron

Site perso de développement personnel, sur téléphone et ordinateur (installable comme une appli, utilisable hors ligne).

- **Aujourd'hui** : les cases du jour à cocher d'un tap, l'anneau de progression, la phrase du jour (on peut aussi cocher hier et avant-hier).
- **Stats** : scores du jour / de la semaine / du mois, calendrier façon GitHub, séries 🔥 par domaine, journal.
- **Objectifs** : chiffrés, à étapes ou simples, avec horizon, échéance et sous-objectifs.
- **Médiathèque** : films, livres, mangas, animés, séries — note sur 5, avis, liste « à voir ».
- **Ma vision** : texte libre ; ses phrases s'affichent sur l'écran d'accueil.
- **Jeu** : XP (chaque domaine a sa valeur, et rapporte plus selon le temps passé, la liste cochée ou le total d'argent), niveaux, compagnon qui évolue avec la régularité et régresse après 2 jours « sans », défis de la semaine, jokers, badges, récompenses perso et collection (Pokémon des générations 1 à 4, Dragon Ball, Naruto, One Piece).
- **Box** (gacha 1★ à 5★, invocation animée en 3 touches) :
  - *petite box* (1 carte) : 5 cases cochées dans la journée, défi facile ;
  - *box classique* (3 cartes, une 2★ garantie) : journée parfaite, défi moyen, bonus tous les 5 niveaux ;
  - *grande box* (5 cartes, une 3★ garantie) : chaque niveau, défi difficile, une 2e tous les 10 niveaux, certains badges.
  - Garanties sur les box classiques et grandes : une 4★ au moins toutes les 15 cartes, une 5★ toutes les 80.
  - Grandes box aussi pour chaque boss battu, album complété, nouveau rang de maîtrise et note S au bilan de la semaine (A : classique, B : petite).
- **Cartes** : 1 chance sur 50 d'être brillante (1 sur 30 en grande box). Les doublons restent sur la carte : 3 pour la fusionner (éveillée, cadre doré), 5 de plus pour l'ultime (arc-en-ciel), ou à échanger contre des fragments puis des box. Recherche, tris, filtres et cartes « nouvelles ».
- **Albums** : 27 albums à thème (Chapeau de paille, Akatsuki, Saiyans, starters…) ; complet = grande box + titre.
- **Boss** : un méchant à battre en 7 jours max avec ses cases (dégâts = XP, point faible ×2, journée parfaite ×1,5) ; battu plus tôt, le suivant arrive le lendemain ; un sur 4 est légendaire.
- **Maîtrise** : 100 niveaux par domaine, un rang tous les 10 niveaux (Novice → Mythe), environ 3 ans pour le niveau 100.
- **Bilan de la semaine** (dimanche 18 h), **records** annoncés en direct, rappels « presque ! », **humeur du jour** et découvertes dans Stats.
- **Personnaliser** : titres, cadres du médaillon et thèmes de couleur à débloquer ; compagnon qui réagit quand on le touche et dont l'humeur suit ta journée.
- **Réglages** : domaines (ajout, couleur, ordre), thème, synchro PC ↔ téléphone via un dépôt GitHub privé, sauvegarde.

Aucune installation : ce sont des fichiers statiques (HTML, CSS, JavaScript). Pour l'essayer en local :

```
python3 -m http.server 8000
```

puis ouvrir http://localhost:8000.
