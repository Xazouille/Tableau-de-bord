# Génération des cartes

`js/game/anime-data.js` est produit par `gen_anime.py` à partir de trois jeux de données publics,
à télécharger dans un dossier (par défaut celui du script) :

| Fichier | Source |
|---|---|
| `dokkan.json` | https://raw.githubusercontent.com/MNprojects/DokkanAPI/main/data/DokkanCharacterData.json |
| `optc-units.js` | https://raw.githubusercontent.com/optc-db/optc-db.github.io/master/common/data/units.js |
| `nb-catalogue.json`, `nb-assets.json` | `catalogue.json` et `ASSETS.json` de https://github.com/arosaRe/naruto-blazing-revival |

Une famille = une version d'un personnage à une époque (Goku enfant, Goku DBZ, Goku DBS…), avec ses transformations.

- Dragon Ball : liste `DB` (époques et cartes duo), entièrement choisie à la main.
- One Piece : liste `OP` (équipage et grands personnages par époque), puis les personnages les plus présents
  dans Treasure Cruise jusqu'à `OP_TARGET` familles (170 par défaut). Raretés imposées dans `OP_RARITY`.
- Naruto : `NAR_SPLIT` (époques des personnages principaux), `NAR_TWO_ERAS` (Naruto / Shippuden),
  puis le reste des personnages jusqu'à `NAR_TARGET` familles (140 par défaut). Raretés imposées dans `NAR_RARITY`.

```
python3 gen_anime.py ../js/game/anime-data.js [dossier des données]
```

Les identifiants des familles viennent du nom de leur première forme : ne pas renommer une première forme
déjà obtenue, sinon la carte disparaît de la collection.

# Cartes Pokémon

`pick_pokemon_cards.py` choisit la carte de chaque Pokémon (1 à 493) pour `PK_TCG` dans `js/game/pokemon-data.js` :
une full art récente (2020 et après) si elle existe, sinon la carte la plus récente, sans les rééditions de cartes anciennes.
Il lit un dossier `tcg/` : `sets.json` + un fichier JSON par extension (données de https://github.com/PokemonTCG/pokemon-tcg-data,
complétées par les extensions les plus récentes au même format), et écrit le tableau JSON sur la sortie standard.

# Icônes des thèmes

`gen_theme_icons.js` dessine l'icône de chaque thème (couleurs `icon` dans `js/looks.js`) et écrit
`icons/t/<thème>-180|192|512|maskable.png` et `m/<thème>.webmanifest`. Servir le dépôt sur http://localhost:8765, puis :

```
node tools/gen_theme_icons.js
```
