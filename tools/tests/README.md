# Tests navigateur

Scripts Playwright (Chromium) qui pilotent l'appli servie en local et vérifient le jeu, les écrans et l'absence d'erreurs.

```
python3 -m http.server 8765          # à la racine du dépôt
node tools/tests/smoke.js /tmp/shots IMAGES [desktop]
```

- `smoke.js` : appli vide puis compte démo, tous les écrans et fiches (téléphone ou `desktop`).
- `motiv.js` : plans si… alors…, défis au choix (compatibilité avec l'ancien tirage via `rules_old.js` = ancienne version de `js/game/rules.js`, à extraire avec `git show <commit>:js/game/rules.js`), identités, mur des victoires, série cassée, rappel du pourquoi, bilan du mois, sommeil régulier.
- `growthtest.js` : migration vers les nouvelles cases, compétences, habitudes, minuteur, bilan du mois.
- `flows.js`, `summon.js`, `midclose.js` : box, invocation, fermeture en cours d'animation et bouton retour.
- `demo.js` : le mode démo ne touche pas aux vraies données.
- `uitest.js` : thèmes et dispositions (aperçus, application, pas de défilement horizontal), en sombre, clair et sur ordinateur.
- `tweaks.js` : journée parfaite à 12/15, compteurs d'habitudes, 11 paliers d'identité, cartes Pokémon.
- `icontest.js` : l'icône, l'icône d'installation et le fichier d'appli changent avec le thème.
- `mergechk.js` : fusion des données entre deux appareils.

`IMAGES` = dossier local des images Naruto (les requêtes vers ces images sont redirigées vers ce dossier ; sans lui, les images manquent mais les tests tournent). Chaque script affiche `OK no errors` quand tout va bien.
