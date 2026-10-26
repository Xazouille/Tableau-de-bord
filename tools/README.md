# Génération des cartes

`js/game/anime-data.js` est produit par `gen_anime.py` à partir de trois jeux de données publics,
à télécharger dans le même dossier que le script :

| Fichier | Source |
|---|---|
| `dokkan.json` | https://raw.githubusercontent.com/MNprojects/DokkanAPI/main/data/DokkanCharacterData.json |
| `optc-units.js` | https://raw.githubusercontent.com/optc-db/optc-db.github.io/master/common/data/units.js |
| `nb-catalogue.json`, `nb-assets.json` | `catalogue.json` et `ASSETS.json` de https://github.com/arosaRe/naruto-blazing-revival |

Pour ajouter un personnage, compléter la liste `DB`, `OP` ou `NAR` du script puis lancer :

```
python3 gen_anime.py ../js/game/anime-data.js
```

Les identifiants des familles viennent du nom de leur première forme : ne pas renommer une première forme
déjà obtenue, sinon la carte disparaît de la collection.
