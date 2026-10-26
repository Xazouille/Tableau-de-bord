"""Génère js/game/anime-data.js : familles Dragon Ball (Dokkan), Naruto (Blazing) et One Piece (Treasure Cruise).

Une « famille » est une version d'un personnage à une époque (Goku enfant, Goku DBZ, Goku DBS…), avec ses
transformations de cette époque. Voir tools/README.md pour les fichiers de données à télécharger.
"""
import json, re, sys, os, subprocess, unicodedata, collections

OUT = sys.argv[1]
DATA = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.abspath(__file__))
P = lambda f: os.path.join(DATA, f)

def slug(t):
    t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')

# =====================================================================
# Dragon Ball : images des cartes Dokkan Battle
# =====================================================================
dok = json.load(open(P('dokkan.json')))
dimg = {}
for c in sorted(dok, key=lambda c: (c['rarity'] != 'LR', c['id'])):
    if c['name'] not in dimg and c.get('imageURL'):
        dimg[c['name']] = c['imageURL'].replace('vignette.wikia.nocookie.net', 'static.wikia.nocookie.net')

Z, S, GT, DB0, FILM = 'Dragon Ball Z', 'Dragon Ball Super', 'Dragon Ball GT', 'Dragon Ball', 'Film'
# (rareté, [(nom affiché, nom Dokkan, saga)])
DB = [
    # --- Goku ---
    (2, [('Goku enfant', 'Goku (Youth)', DB0), ('Goku enfant singe géant', 'Goku (Youth) (Giant Ape)', DB0)]),
    (4, [('Goku', 'Goku', 'Saga Saiyan'), ('Goku Kaioken', 'Goku (Kaioken)', 'Saga Saiyan'), ('Goku Super Saiyan', 'Super Saiyan Goku', 'Saga Freezer'), ('Goku SSJ2', 'Super Saiyan 2 Goku', 'Saga Buu'), ('Goku SSJ3', 'Super Saiyan 3 Goku', 'Saga Buu')]),
    (3, [('Goku dans l’au-delà', 'Goku (Angel)', 'Saga Buu'), ('Goku SSJ2 (au-delà)', 'Super Saiyan 2 Goku (Angel)', 'Saga Buu'), ('Goku SSJ3 (au-delà)', 'Super Saiyan 3 Goku (Angel)', 'Saga Buu')]),
    (5, [('Goku Super Saiyan God', 'Super Saiyan God Goku', 'Battle of Gods'), ('Goku Super Saiyan Blue', 'Super Saiyan God SS Goku', 'Résurrection de F'), ('Goku Blue Kaioken', 'Super Saiyan God SS Goku (Kaioken)', 'Tournoi des univers'), ('Goku Ultra Instinct Sign', 'Goku (Ultra Instinct -Sign-)', 'Tournoi du Pouvoir'), ('Goku Ultra Instinct', 'Goku (Ultra Instinct)', 'Tournoi du Pouvoir')]),
    (4, [('Goku GT', 'Goku (GT)', GT), ('Goku GT Super Saiyan', 'Super Saiyan Goku (GT)', GT), ('Goku GT SSJ3', 'Super Saiyan 3 Goku (GT)', GT), ('Goku SSJ4', 'Super Saiyan 4 Goku', GT), ('Goku SSJ4 pleine puissance', 'Super Full Power Saiyan 4 Goku', GT)]),
    # --- Vegeta ---
    (2, [('Vegeta enfant', 'Vegeta (Kid)', 'Le Père de Goku')]),
    (4, [('Vegeta', 'Vegeta', 'Saga Saiyan'), ('Vegeta singe géant', 'Vegeta (Giant Ape)', 'Saga Saiyan'), ('Vegeta Super Saiyan', 'Super Saiyan Vegeta', 'Saga Cyborgs'), ('Super Vegeta', 'Super Vegeta', 'Saga Cell'), ('Majin Vegeta', 'Majin Vegeta', 'Saga Buu')]),
    (5, [('Vegeta Super Saiyan God', 'Super Saiyan God Vegeta', S), ('Vegeta Super Saiyan Blue', 'Super Saiyan God SS Vegeta', S), ('Vegeta Blue Évolution', 'Super Saiyan God SS Evolved Vegeta', 'Tournoi du Pouvoir')]),
    (4, [('Vegeta GT singe géant', 'Vegeta (GT) (Giant Ape)', GT), ('Vegeta GT Super Saiyan', 'Super Saiyan Vegeta (GT)', GT), ('Vegeta SSJ4', 'Super Saiyan 4 Vegeta', GT)]),
    # --- Gohan ---
    (2, [('Gohan enfant', 'Gohan (Kid)', 'Saga Saiyan')]),
    (4, [('Gohan (Namek)', 'Gohan (Youth)', 'Saga Freezer'), ('Gohan Super Saiyan', 'Super Saiyan Gohan (Youth)', 'Saga Cell'), ('Gohan SSJ2', 'Super Saiyan 2 Gohan (Youth)', 'Saga Cell')]),
    (4, [('Gohan ado', 'Gohan (Teen)', 'Saga Buu'), ('Gohan ado Super Saiyan', 'Super Saiyan Gohan (Teen)', 'Saga Buu'), ('Gohan ado SSJ2', 'Super Saiyan 2 Gohan (Teen)', 'Saga Buu'), ('Gohan Ultime', 'Ultimate Gohan', 'Saga Buu')]),
    (3, [('Gohan du futur', 'Gohan (Future)', 'Trunks du futur'), ('Gohan du futur Super Saiyan', 'Super Saiyan Gohan (Future)', 'Trunks du futur')]),
    (3, [('Great Saiyaman', 'Great Saiyaman', 'Saga Buu'), ('Great Saiyaman SS', 'Great Saiyaman (SS)', 'Saga Buu'), ('Great Saiyaman SS2', 'Great Saiyaman (SS2)', 'Saga Buu')]),
    # --- Trunks, Goten, Gotenks ---
    (2, [('Trunks enfant', 'Trunks (Kid)', 'Saga Buu'), ('Trunks enfant Super Saiyan', 'Super Saiyan Trunks (Kid)', 'Saga Buu')]),
    (4, [('Trunks du futur', 'Trunks (Teen) (Future)', 'Saga Cyborgs'), ('Trunks Super Saiyan', 'Super Saiyan Trunks (Future)', 'Saga Cyborgs'), ('Super Trunks', 'Super Trunks', 'Saga Cell')]),
    (3, [('Trunks adolescent', 'Trunks (Teen)', 'Saga Cell'), ('Trunks adolescent Super Saiyan', 'Super Saiyan Trunks (Teen)', 'Saga Cell'), ('Trunks SSJ2', 'Super Saiyan 2 Trunks (Teen)', 'Dragon Ball Heroes')]),
    (2, [('Trunks GT Super Saiyan', 'Super Saiyan Trunks (GT)', GT)]),
    (3, [('Trunks Xeno', 'Trunks (Xeno)', 'Dragon Ball Heroes'), ('Trunks Xeno Super Saiyan God', 'Super Saiyan God Trunks (Xeno)', 'Dragon Ball Heroes')]),
    (2, [('Goten', 'Goten (Kid)', 'Saga Buu'), ('Goten Super Saiyan', 'Super Saiyan Goten (Kid)', 'Saga Buu')]),
    (4, [('Gotenks', 'Gotenks', 'Saga Buu'), ('Gotenks Super Saiyan', 'Super Saiyan Gotenks', 'Saga Buu'), ('Gotenks SSJ3', 'Super Saiyan 3 Gotenks', 'Saga Buu')]),
    (3, [('Gotenks adolescent SSJ3', 'Super Saiyan 3 Gotenks (Teen)', 'Dragon Ball Heroes')]),
    # --- Fusions ---
    (5, [('Gogeta', 'Gogeta', 'Broly'), ('Gogeta Super Saiyan', 'Super Saiyan Gogeta', 'Fusion Reborn'), ('Super Gogeta', 'Super Gogeta', 'Fusion Reborn')]),
    (5, [('Gogeta SSJ4', 'Super Saiyan 4 Gogeta', GT)]),
    (5, [('Vegeto', 'Vegito', 'Saga Buu'), ('Super Vegeto', 'Super Vegito', 'Saga Buu')]),
    (5, [('Vegeto Blue', 'Super Saiyan God SS Vegito', 'Saga Black')]),
    # --- Piccolo ---
    (3, [('Roi Démon Piccolo', 'Demon King Piccolo (Elder)', DB0), ('Roi Démon Piccolo rajeuni', 'Demon King Piccolo', DB0)]),
    (2, [('Piccolo Jr. géant', 'Piccolo Jr. (Giant Form)', DB0)]),
    (3, [('Piccolo', 'Piccolo', 'Saga Saiyan')]),
    (4, [('Piccolo éveillé', 'Piccolo (Power Awakening)', 'Super Hero')]),
    # --- Méchants ---
    (4, [('Freezer', 'Frieza (1st Form)', 'Saga Freezer'), ('Freezer 2e forme', 'Frieza (2nd Form)', 'Saga Freezer'), ('Freezer 3e forme', 'Frieza (3rd Form)', 'Saga Freezer'), ('Freezer forme finale', 'Frieza (Final Form)', 'Saga Freezer'), ('Freezer 100 %', 'Frieza (Full Power)', 'Saga Freezer')]),
    (5, [('Freezer ressuscité', 'Frieza (Final Form) (Angel)', 'Résurrection de F'), ('Golden Freezer', 'Golden Frieza', 'Résurrection de F'), ('Golden Freezer (Tournoi)', 'Golden Frieza (Angel)', 'Tournoi du Pouvoir')]),
    (2, [('Mecha Freezer', 'Mecha Frieza', 'Trunks du futur')]),
    (4, [('Cell', 'Cell (1st Form)', 'Saga Cell'), ('Cell 2e forme', 'Cell (2nd Form)', 'Saga Cell'), ('Cell parfait', 'Cell (Perfect Form)', 'Saga Cell'), ('Super Cell parfait', 'Perfect Cell', 'Saga Cell')]),
    (2, [('Cell Jr.', 'Cell Jr.', 'Saga Cell')]),
    (2, [('Cell GT', 'Cell (Perfect Form) (GT)', GT)]),
    (4, [('Boubou', 'Majin Buu (Good)', 'Saga Buu'), ('Boubou maléfique', 'Majin Buu (Pure Evil)', 'Saga Buu')]),
    (4, [('Super Boubou', 'Buu (Super)', 'Saga Buu'), ('Super Boubou (Gotenks)', 'Majin Buu (Gotenks)', 'Saga Buu'), ('Super Boubou (Piccolo)', 'Majin Buu (Piccolo)', 'Saga Buu'), ('Super Boubou (Gohan)', 'Majin Buu (Ultimate Gohan)', 'Saga Buu')]),
    (4, [('Kid Boo', 'Buu (Kid)', 'Saga Buu')]),
    (5, [('Broly enfant', 'Broly (Kid)', 'Broly (DBS)'), ('Broly', 'Broly', 'Broly (DBS)'), ('Broly furieux', 'Broly (Wrathful)', 'Broly (DBS)'), ('Broly Super Saiyan', 'Super Saiyan Broly', 'Broly (DBS)')]),
    (4, [('Broly Légendaire', 'Legendary Super Saiyan Broly', 'Broly (DBZ)'), ('Broly SSJ3', 'Super Saiyan 3 Broly', 'Dragon Ball Heroes')]),
    (2, [('Bio-Broly', 'Bio-Broly', FILM)]),
    (4, [('Cooler', 'Cooler', 'Les Mercenaires de l’espace'), ('Cooler forme finale', 'Cooler (Final Form)', 'Les Mercenaires de l’espace'), ('Golden Cooler', 'Golden Cooler', 'Dragon Ball Heroes')]),
    (3, [('Metal Cooler', 'Metal Cooler', 'La Revanche de Cooler')]),
    (4, [('Bardock', 'Bardock', 'Le Père de Goku'), ('Bardock singe géant', 'Bardock (Giant Ape)', 'Le Père de Goku'), ('Bardock Super Saiyan', 'Super Saiyan Bardock', 'Episode of Bardock')]),
    (5, [('Beerus', 'Beerus', 'Battle of Gods')]),
    (5, [('Whis', 'Whis', 'Battle of Gods')]),
    (5, [('Jiren', 'Jiren', 'Tournoi du Pouvoir'), ('Jiren pleine puissance', 'Jiren (Full Power)', 'Tournoi du Pouvoir')]),
    (4, [('Goku Black', 'Goku Black', 'Saga Black'), ('Goku Black Rosé', 'Goku Black (Super Saiyan Rosé)', 'Saga Black')]),
    (4, [('Zamasu', 'Zamasu', 'Saga Black'), ('Zamasu fusionné', 'Fusion Zamasu', 'Saga Black')]),
    (4, [('Hit', 'Hit', 'Tournoi des univers')]),
    (4, [('Vados', 'Vados', 'Tournoi des univers')]),
    (4, [('Champa', 'Champa', 'Tournoi des univers')]),
    (3, [('Marcarita', 'Marcarita', 'Tournoi du Pouvoir')]),
    # --- Héros et alliés ---
    (3, [('C-17', 'Android #17', 'Saga Cyborgs'), ('C-17 (Univers 7)', 'Android #17 (Team Universe 7)', 'Tournoi du Pouvoir')]),
    (2, [('C-17 du futur', 'Android #17 (Future)', 'Trunks du futur')]),
    (2, [('C-18', 'Android #18', 'Saga Cyborgs')]),
    (2, [('C-18 du futur', 'Android #18 (Future)', 'Trunks du futur')]),
    (2, [('C-16', 'Android #16', 'Saga Cell')]),
    (3, [('Super C-17', 'Hell Fighter #17', GT), ('Super C-17 fusionné', 'Super #17', GT)]),
    (3, [('C-13', 'Android #13', 'Le Combat fratricide'), ('C-13 fusionné', 'Fusion Android #13', 'Le Combat fratricide')]),
    (3, [('C-21', 'Android #21 (Transformed)', 'FighterZ'), ('C-21 gentille', 'Android #21 (Transformed, Good)', 'FighterZ')]),
    (3, [('Janemba', 'Janemba', 'Fusion Reborn'), ('Super Janemba', 'Super Janemba', 'Fusion Reborn')]),
    (3, [('Caulifla', 'Caulifla', 'Tournoi du Pouvoir'), ('Caulifla SSJ2', 'Super Saiyan 2 Caulifla', 'Tournoi du Pouvoir')]),
    (4, [('Kefla', 'Kefla', 'Tournoi du Pouvoir'), ('Kefla SSJ2', 'Super Saiyan 2 Kefla', 'Tournoi du Pouvoir')]),
    (3, [('Kale', 'Kale', 'Tournoi du Pouvoir'), ('Kale berserk', 'Kale (Berserk)', 'Tournoi du Pouvoir'), ('Kale SSJ2', 'Super Saiyan 2 Kale', 'Tournoi du Pouvoir')]),
    (3, [('Cabba Super Saiyan', 'Super Saiyan Cabba', 'Tournoi des univers'), ('Cabba SSJ2', 'Super Saiyan 2 Cabba', 'Tournoi des univers')]),
    (3, [('Toppo', 'Toppo (Pride Troopers)', 'Tournoi du Pouvoir'), ('Toppo Dieu de la destruction', 'Toppo (God of Destruction Mode)', 'Tournoi du Pouvoir')]),
    (2, [('Dyspo', 'Dyspo (Super Speed Mode)', 'Tournoi du Pouvoir')]),
    (1, [('Kahseral', 'Kahseral (Pride Troopers)', 'Tournoi du Pouvoir')]),
    (2, [('Frost', 'Frost (Full Power)', 'Tournoi des univers')]),
    (2, [('Ribrianne', 'Ribrianne (Giant Form)', 'Tournoi du Pouvoir'), ('Super Ribrianne', 'Super Ribrianne', 'Tournoi du Pouvoir')]),
    (1, [('Bergamo', 'Bergamo (Giant Form)', 'Tournoi du Pouvoir')]),
    (3, [('Uub', 'Uub (Youth)', 'Saga Buu'), ('Uub adolescent', 'Uub (Teen)', GT), ('Majuub', 'Majuub', GT)]),
    (3, [('Baby', 'Super Baby 1', GT), ('Baby géant', 'Super Baby 2 (Giant Ape)', GT)]),
    (3, [('Li Shenron', 'Syn Shenron', GT), ('Super Li Shenron', 'Omega Shenron', GT)]),
    (2, [('San Shenron', 'Nuova Shenron', GT)]),
    (2, [('Ryu Shenron', 'Oceanus Shenron (Princess Oto)', GT)]),
    (2, [('Général Rildo', 'Meta-Rilldo', GT), ('Hyper Rildo', 'Hyper Meta-Rilldo', GT)]),
    (3, [('Gamma 1', 'Gamma 1', 'Super Hero')]),
    (3, [('Gamma 2', 'Gamma 2', 'Super Hero')]),
    (3, [('Pikkon', 'Paikuhan', 'Autre monde'), ('Super Pikkon', 'Super Paikuhan', 'Autre monde')]),
    (2, [('Krilin', 'Krillin', DB0)]),
    (2, [('Ten Shin Han', 'Tien', DB0)]),
    (2, [('Tortue Géniale', 'Master Roshi', DB0), ('Tortue Géniale Max Power', 'Master Roshi (Max Power)', 'Saga Cell')]),
    (2, [('Jackie Chun', 'Jackie Chun', DB0), ('Jackie Chun Max Power', 'Jackie Chun (Max Power)', DB0)]),
    (2, [('Raditz', 'Raditz', 'Saga Saiyan'), ('Raditz singe géant', 'Raditz (Giant Ape)', 'Saga Saiyan')]),
    (2, [('Nappa', 'Nappa', 'Saga Saiyan')]),
    (2, [('Capitaine Ginyu', 'Captain Ginyu', 'Saga Freezer'), ('Ginyu dans le corps de Goku', 'Ginyu (Goku) (Ginyu Force)', 'Saga Freezer')]),
    (2, [('Roi Cold', 'King Cold', 'Trunks du futur')]),
    (2, [('Turles', 'Turles', 'Le Combat fratricide'), ('Turles singe géant', 'Turles (Giant Ape)', 'Le Combat fratricide')]),
    (2, [('Pan', 'Pan (Kid)', 'Saga Buu'), ('Pan GT', 'Pan (GT)', GT)]),
    (2, [('Dabra', 'Dabura', 'Saga Buu')]),
    (2, [('Tapion', 'Tapion', 'L’Attaque du dragon')]),
    (2, [('Bojack', 'Boujack', 'Bojack'), ('Bojack pleine puissance', 'Full Power Boujack', 'Bojack')]),
    (2, [('Garlic Jr.', 'Super Garlic Jr.', 'Garlic Jr.')]),
    (2, [('Hatchiyack', 'Hatchiyack (Giant Form)', 'Plan d’éradication des Saiyans'), ('Super Hatchiyack', 'Super Hatchiyack', 'Plan d’éradication des Saiyans')]),
    (2, [('Roi Vegeta', 'King Vegeta', 'Le Père de Goku')]),
    (2, [('Arale', 'Arale Norimaki', 'Dr Slump')]),
    (2, [('Mercenaire Tao', 'Mercenary Tao', DB0), ('Cyborg Tao', 'Cyborg Tao', DB0)]),
    (2, [('Goku Jr. Super Saiyan', 'Super Saiyan Goku Jr.', GT)]),
    (2, [('Vegeta Jr. Super Saiyan', 'Super Saiyan Vegeta Jr.', GT)]),
    (2, [('Mai du futur', 'Mai (Future)', 'Saga Black')]),
    (2, [('Fasha', 'Fasha', 'Le Père de Goku'), ('Fasha singe géant', 'Fasha (Giant Ape)', 'Le Père de Goku')]),
    (2, [('Toma', 'Tora', 'Le Père de Goku'), ('Toma singe géant', 'Tora (Giant Ape)', 'Le Père de Goku')]),
    (1, [('Shugesh', 'Shugesh', 'Le Père de Goku'), ('Shugesh singe géant', 'Shugesh (Giant Ape)', 'Le Père de Goku')]),
    (1, [('Borgos', 'Borgos', 'Le Père de Goku'), ('Borgos singe géant', 'Borgos (Giant Ape)', 'Le Père de Goku')]),
    (3, [('Cumber', 'Super Saiyan Cumber (Giant Ape Cumber)', 'Dragon Ball Heroes')]),
    (2, [('Towa', 'Towa', 'Dragon Ball Heroes'), ('Towa déesse démoniaque', 'Demon Goddess Towa', 'Dragon Ball Heroes')]),
    (2, [('Mira', 'Mira', 'Dragon Ball Heroes'), ('Super Mira', 'Super Mira', 'Dragon Ball Heroes')]),
    (2, [('Fu', 'Super Fu', 'Dragon Ball Heroes')]),
    (2, [('Hearts', 'Super Hearts', 'Dragon Ball Heroes')]),
    (2, [('Demigra', 'Demigra', 'Dragon Ball Heroes'), ('Demigra forme Makyô', 'Demigra (Makyouka Form)', 'Dragon Ball Heroes')]),
    (2, [('Kaïo Shin du temps', 'Supreme Kai of Time (Brainwashed)', 'Dragon Ball Heroes'), ('Kaïo Shin du temps libéré', 'Supreme Kai of Time (Power of Time Unleashed)', 'Dragon Ball Heroes')]),
    (2, [('Roi démon Mechikabura', 'Dark King Mechikabura (Power of Time Unleashed)', 'Dragon Ball Heroes')]),
    (1, [('Yamcha', 'Yamcha', DB0)]),
    (1, [('Yajirobé', 'Yajirobe', DB0)]),
    (1, [('Mister Satan', 'Hercule', 'Saga Cell')]),
    (1, [('Videl', 'Videl', 'Saga Buu')]),
    (1, [('Chichi', 'Chi-Chi (Youth)', DB0), ('Chichi adulte', 'Chi-Chi', 'Saga Buu')]),
    (1, [('Bulma', 'Bulma (Youth)', DB0)]),
    (1, [('Lunch', 'Launch', DB0)]),
    (1, [('Guldo', 'Guldo', 'Saga Freezer')]),
    (1, [('Recoome', 'Recoome', 'Saga Freezer')]),
    (1, [('Burter', 'Burter', 'Saga Freezer')]),
    (1, [('Jeice', 'Jeice', 'Saga Freezer')]),
    (1, [('Kaïo Shin', 'Supreme Kai', 'Saga Buu')]),
    (1, [('Kaïo Shin de l’Ouest', 'West Supreme Kai', 'Dragon Ball Heroes')]),
    (1, [('Tout-Puissant', 'Kami', DB0)]),
    (1, [('Nail', 'Nail', 'Saga Freezer')]),
    (1, [('Grand-père Gohan', 'Grandpa Gohan', DB0)]),
    (1, [('Cheelai', 'Cheelai', 'Broly (DBS)')]),
    (1, [('Jaco', 'Jaco', S)]),
    (1, [('Tarble', 'Tarble', 'Hé ! Son Goku et ses amis sont de retour !!')]),
    (1, [('Bra', 'Bulla', GT)]),
    (1, [('Giru', 'Giru', GT)]),
    (1, [('C-8', 'Hacchan', DB0)]),
    (1, [('Para Para Brothers', 'Para Para Brothers', GT)]),
    # --- Cartes duo / équipe ---
    (5, [('Goku & Vegeta Super Saiyan', 'Super Saiyan Goku & Super Saiyan Vegeta', Z), ('Goku & Vegeta Super Saiyan God', 'Super Saiyan God Goku & Super Saiyan God Vegeta', S), ('Goku & Vegeta Blue', 'Super Saiyan God SS Goku & Super Saiyan God SS Vegeta', S), ('Goku Kaioken & Vegeta Évolution', 'Super Saiyan God SS Goku (Kaioken) & Super Saiyan God SS Evolved Vegeta', 'Tournoi du Pouvoir')]),
    (5, [('Goku & Vegeta SSJ4', 'Super Saiyan 4 Goku & Super Saiyan 4 Vegeta', GT)]),
    (4, [('Goku & Vegeta dans l’au-delà', 'Goku (Angel) & Vegeta (Angel)', 'Saga Buu'), ('Goku & Vegeta Super Saiyan (au-delà)', 'Super Saiyan Goku (Angel) & Super Saiyan Vegeta (Angel)', 'Saga Buu')]),
    (3, [('Goku & Piccolo', 'Goku & Piccolo', 'Saga Saiyan')]),
    (2, [('Goku & Gohan enfant', 'Goku & Gohan (Kid)', 'Saga Saiyan')]),
    (4, [('Goku & Gohan Super Saiyan', 'Super Saiyan Goku & Super Saiyan Gohan (Youth)', 'Saga Cell')]),
    (1, [('Goku & Chichi', 'Goku & Chi-Chi', DB0)]),
    (2, [('Goku enfant & Bulma', 'Goku (Youth) & Bulma (Youth)', DB0)]),
    (2, [('Goku enfant & Arale', 'Goku (Youth) & Arale Norimaki', 'Dr Slump')]),
    (4, [('Gohan Ultime & Piccolo', 'Ultimate Gohan & Piccolo', 'Saga Buu')]),
    (2, [('Gohan & Videl', 'Gohan (Teen) & Videl', 'Saga Buu'), ('Great Saiyaman & Videl', 'Great Saiyaman & Videl', 'Saga Buu'), ('Great Saiyaman 1 & 2', 'Great Saiyaman 1 & 2', 'Saga Buu')]),
    (3, [('Gohan & Goten', 'Gohan (Teen) & Goten (Kid)', 'Saga Buu'), ('Gohan & Goten Super Saiyan', 'Super Saiyan Gohan (Teen) & Super Saiyan Goten (Kid)', 'Saga Buu')]),
    (3, [('Trunks & Goten', 'Trunks (Kid) & Goten (Kid)', 'Saga Buu'), ('Trunks & Goten Super Saiyan', 'Super Saiyan Goten (Kid) & Super Saiyan Trunks (Kid)', 'Saga Buu'), ('Trunks & Goten adolescents', 'Trunks (Teen) & Goten (Teen)', S)]),
    (3, [('Trunks & Mai du futur', 'Trunks (Teen) (Future) & Mai (Future)', 'Saga Black'), ('Trunks Super Saiyan & Mai', 'Super Saiyan Trunks (Future) & Mai (Future)', 'Saga Black')]),
    (3, [('Gohan & Trunks du futur', 'Super Saiyan Gohan (Future) & Trunks (Youth) (Future)', 'Trunks du futur')]),
    (2, [('Vegeta & Bulma', 'Vegeta & Bulma', 'Saga Buu'), ('Vegeta SSJ2 & Bulma', 'Super Saiyan 2 Vegeta & Bulma', 'Battle of Gods')]),
    (2, [('Krilin & C-18', 'Krillin & Android #18', 'Saga Buu')]),
    (2, [('Krilin & Gohan', 'Krillin & Gohan (Kid)', 'Saga Freezer'), ('Krilin & Gohan (Namek)', 'Krillin & Gohan (Youth)', 'Saga Freezer')]),
    (2, [('Piccolo & Krilin', 'Piccolo & Krillin', 'Saga Freezer')]),
    (1, [('Ten Shin Han & Chaozu', 'Tien & Chiaotzu', DB0)]),
    (1, [('Yamcha & Plume', 'Yamcha & Puar', DB0)]),
    (1, [('Tortue Géniale & Ten Shin Han', 'Master Roshi & Tien', 'Tournoi du Pouvoir')]),
    (3, [('C-17 & C-18', 'Androids #17 & #18', 'Saga Cyborgs')]),
    (3, [('C-17 & C-18 du futur', 'Androids #17 (Future) & #18 (Future)', 'Trunks du futur')]),
    (2, [('C-14 & C-15', 'Androids #14 & #15', 'Super C-13')]),
    (2, [('Dr Gero & C-19', 'Dr. Gero & Android #19', 'Saga Cyborgs')]),
    (2, [('Zarbon & Dodoria', 'Zarbon & Dodoria', 'Saga Freezer')]),
    (1, [('Jeice & Burter', 'Jeice & Burter', 'Saga Freezer')]),
    (1, [('Recoome & Guldo', 'Recoome & Guldo', 'Saga Freezer')]),
    (2, [('Mecha Freezer & Roi Cold', 'Mecha Frieza & King Cold', 'Trunks du futur')]),
    (3, [('Golden Freezer & Sorbet', 'Golden Frieza & Sorbet', 'Résurrection de F')]),
    (5, [('Beerus & Whis', 'Beerus & Whis', 'Battle of Gods')]),
    (5, [('Goku Black & Zamasu', 'Goku Black & Zamasu', 'Saga Black'), ('Black Rosé & Zamasu', 'Goku Black (Super Saiyan Rosé) & Zamasu', 'Saga Black')]),
    (4, [('Caulifla & Kale', 'Caulifla & Kale', 'Tournoi du Pouvoir'), ('Caulifla & Kale Super Saiyan', 'Super Saiyan Caulifla & Super Saiyan Kale', 'Tournoi du Pouvoir'), ('Caulifla & Kale SSJ2', 'Super Saiyan 2 Caulifla & Super Saiyan 2 Kale', 'Tournoi du Pouvoir')]),
    (2, [('Babidi & Dabra', 'Babidi & Dabura', 'Saga Buu')]),
    (1, [('Kaïo Shin & Kibito', 'Supreme Kai & Kibito', 'Saga Buu')]),
    (3, [('Paragus & Broly', 'Paragus & Broly', 'Broly (DBS)')]),
    (3, [('Bardock & Gine', 'Bardock & Gine', 'Broly (DBS)')]),
    (3, [('Broly, Cheelai & Lemo', 'Broly & Cheelai & Lemo', 'Broly (DBS)')]),
    (3, [('Cell & Cell Jr.', 'Cell (Perfect Form) & Cell Jr.', 'Saga Cell')]),
    (3, [('Goku, Pan & Trunks (GT)', 'Goku (GT) & Pan (GT) & Trunks (GT)', GT)]),
    (2, [('Trunks & Goten GT', 'Trunks (GT) & Goten (GT)', GT)]),
    (1, [('Trunks & Giru', 'Trunks (GT) & Giru', GT)]),
    (2, [('Goku Jr. & Vegeta Jr.', 'Goku Jr. & Vegeta Jr.', GT), ('Goku Jr. & Vegeta Jr. Super Saiyan', 'Super Saiyan Goku Jr. & Super Saiyan Vegeta Jr.', GT)]),
    (4, [('Hit & Goku Super Saiyan God', 'Hit & Super Saiyan God Goku', 'Tournoi des univers')]),
    (2, [('Vegeta & Raditz enfants', 'Vegeta (Kid) & Raditz (Kid)', 'Le Père de Goku')]),
    (1, [('Tapion & Minotia', 'Tapion & Minotia', 'L’Attaque du dragon')]),
    (1, [('Yamu & Spopovich', 'Yamu & Spopovich', 'Saga Buu')]),
    (3, [('Gotenks & les fantômes', 'Super Saiyan Gotenks & Ghost', 'Saga Buu')]),
    (2, [('Freezer & l’armée des morts', 'Frieza (Final Form) & Army of the Dead', 'Saga Buu')]),
    (4, [('Golden Freezer & C-17', 'Golden Frieza (Angel) & Android #17', 'Tournoi du Pouvoir')]),
    (4, [('Goku & Freezer', 'Goku & Frieza (Final Form) (Angel)', 'Tournoi du Pouvoir')]),
]

# =====================================================================
# One Piece : images de One Piece Treasure Cruise (optc-db)
# =====================================================================
global_units = open(P('optc-units.js')).read()
units = json.loads(re.sub(r'^\s*window\.units\s*=\s*', '', global_units).rstrip().rstrip(';').replace('\n', ' ')) if False else None
node = subprocess.run(['node', '-e', 'global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify(window.units.map(u=>u&&u[0]?[u[0],u[3]]:null)))', P('optc-units.js')], capture_output=True, text=True)
units = json.loads(node.stdout)

def optc_url(n):
    return f'https://raw.githubusercontent.com/optc-db/optc-db.github.io/master/api/images/full/transparent/{n // 1000}/{(n // 100) % 10}00/{n:04d}.png'

ELLIPSE, WANO = 'Après l’ellipse', 'Pays de Wano'
# Équipage et grands personnages, découpés par époque : (rareté, [(n° d'unité, nom affiché, saga)])
OP = [
    (3, [(2, 'Luffy', 'East Blue'), (3, 'Luffy Gum-Gum Bazooka', 'Alabasta')]),
    (4, [(4, 'Luffy Gear 2', 'Enies Lobby'), (217, 'Luffy Gear 3', 'Enies Lobby')]),
    (4, [(1404, 'Luffy (après l’ellipse)', ELLIPSE), (1593, 'Luffy Gear 4 Boundman', 'Dressrosa'), (2363, 'Luffy Gear 4 Snakeman', 'Whole Cake Island')]),
    (5, [(4053, 'Luffy à Wano', WANO), (3957, 'Luffy Gear 5', WANO)]),
    (3, [(5, 'Zoro', 'East Blue'), (8, 'Zoro Ashura', 'Enies Lobby')]),
    (4, [(1362, 'Zoro (après l’ellipse)', ELLIPSE), (2097, 'Zoro dans le Nouveau Monde', 'Dressrosa')]),
    (5, [(3896, 'Zoro Roi des Enfers', WANO)]),
    (3, [(17, 'Sanji', 'East Blue'), (20, 'Sanji Diable Jambe', 'Enies Lobby')]),
    (4, [(1368, 'Sanji (après l’ellipse)', ELLIPSE), (1588, 'Sanji, prince de Germa', 'Whole Cake Island')]),
    (4, [(3889, 'Sanji Ifrit Jambe', WANO)]),
    (2, [(9, 'Nami', 'East Blue'), (12, 'Nami Thunderbolt Tempo', 'Skypiea')]),
    (3, [(1366, 'Nami (après l’ellipse)', ELLIPSE), (2076, 'Nami la chatte voleuse', 'Whole Cake Island')]),
    (2, [(13, 'Usopp', 'East Blue'), (16, 'Sogeking', 'Enies Lobby')]),
    (3, [(1406, 'Usopp (après l’ellipse)', ELLIPSE), (1532, 'God Usopp', 'Dressrosa')]),
    (2, [(21, 'Chopper', 'Drum'), (22, 'Chopper Heavy Point', 'Drum'), (249, 'Chopper Monster Point', 'Enies Lobby')]),
    (3, [(1370, 'Chopper (après l’ellipse)', ELLIPSE)]),
    (2, [(210, 'Nico Robin', 'Alabasta'), (709, 'Robin, membre de l’équipage', 'Enies Lobby')]),
    (3, [(1408, 'Robin (après l’ellipse)', ELLIPSE), (3791, 'Robin Demonio Fleur', WANO)]),
    (2, [(336, 'Franky', 'Water Seven')]),
    (3, [(1364, 'Franky (après l’ellipse)', ELLIPSE), (1432, 'Général Franky', 'Dressrosa')]),
    (2, [(423, 'Brook', 'Thriller Bark')]),
    (3, [(1410, 'Brook (après l’ellipse)', ELLIPSE), (1547, 'Soul King Brook', 'Whole Cake Island')]),
    (3, [(409, 'Jinbe', 'Impel Down'), (410, 'Jinbe, Grand Corsaire', 'Marineford')]),
    (4, [(2264, 'Jinbe, capitaine des Pirates du Soleil', 'Whole Cake Island'), (3345, 'Jinbe, timonier du Chapeau de paille', WANO)]),
    (3, [(497, 'Ace enfant', 'Mont Corvo')]),
    (5, [(74, 'Ace', 'Alabasta'), (75, 'Ace Poing Ardent', 'Alabasta'), (1247, 'Ace à Marineford', 'Marineford')]),
    (2, [(512, 'Sabo enfant', 'Mont Corvo')]),
    (4, [(668, 'Sabo', 'Dressrosa'), (669, 'Sabo, Armée révolutionnaire', 'Dressrosa'), (1492, 'Sabo et le fruit du Feu', 'Dressrosa')]),
    (2, [(828, 'Law enfant', 'Flevance')]),
    (4, [(307, 'Trafalgar Law', 'Sabaody'), (308, 'Law « ROOM »', 'Punk Hazard'), (1045, 'Law, Grand Corsaire', 'Dressrosa')]),
    (5, [(3027, 'Law à Wano', WANO)]),
    (3, [(600, 'Shanks apprenti', 'Équipage de Roger')]),
    (5, [(76, 'Shanks le Roux', 'East Blue'), (530, 'Shanks, Empereur', 'Marineford')]),
    (2, [(598, 'Baggy apprenti', 'Équipage de Roger')]),
    (2, [(38, 'Baggy', 'East Blue'), (39, 'Baggy le Clown', 'East Blue'), (2277, 'Baggy, Grand Corsaire', 'Marineford')]),
    (5, [(260, 'Edward Newgate', 'Marineford'), (261, 'Barbe Blanche', 'Marineford'), (1413, 'Barbe Blanche, Empereur', 'Marineford')]),
    (5, [(446, 'Marshall D. Teach', 'Jaya'), (447, 'Barbe Noire', 'Marineford'), (1268, 'Barbe Noire, capitaine', 'Marineford')]),
    (5, [(2386, 'Kaido', WANO), (2387, 'Kaido, Roi des Bêtes', WANO), (2923, 'Kaido forme hybride', WANO)]),
    (5, [(2108, 'Charlotte Linlin', 'Whole Cake Island'), (2109, 'Big Mom', 'Whole Cake Island'), (2234, 'Big Mom, Empereur', 'Whole Cake Island')]),
    (5, [(3176, 'Gol D. Roger', 'Équipage de Roger'), (3177, 'Roger, capitaine', 'Équipage de Roger')]),
    (4, [(415, 'Boa Hancock', 'Amazon Lily'), (416, 'Hancock, Grand Corsaire', 'Amazon Lily')]),
    (4, [(417, 'Doflamingo', 'Marineford'), (418, 'Doflamingo, Grand Corsaire', 'Dressrosa'), (2126, 'Doflamingo « Joker »', 'Dressrosa')]),
    (4, [(226, 'Dracule Mihawk', 'East Blue'), (717, 'Mihawk, Grand Corsaire', 'Marineford')]),
    (3, [(356, 'Eustass Kid', 'Sabaody'), (2980, 'Kid, capitaine magnétique', WANO)]),
    (4, [(305, 'Monkey D. Garp', 'Water Seven'), (1845, 'Garp, héros de la Marine', 'Marineford')]),
    (4, [(977, 'Kizaru', 'Sabaody'), (978, 'Kizaru, l’Homme de lumière', 'Sabaody')]),
    (4, [(1297, 'Akainu', 'Marineford'), (1298, 'Akainu, l’Homme de magma', 'Marineford')]),
    (4, [(574, 'Aokiji', 'Long Ring Long Land'), (575, 'Aokiji, l’Homme de glace', 'Water Seven')]),
    (3, [(321, 'Rob Lucci', 'Water Seven'), (633, 'Lucci, CP9', 'Enies Lobby'), (2015, 'Lucci, arme de la Justice', 'Egghead')]),
    (3, [(545, 'Ener', 'Skypiea'), (603, 'Ener 200 millions de volts', 'Skypiea')]),
    (2, [(65, 'Arlong', 'East Blue'), (656, 'Arlong, Pirates du Soleil', 'East Blue')]),
    (3, [(69, 'Smoker', 'Loguetown'), (70, 'Smoker le Chasseur blanc', 'Alabasta'), (1232, 'Smoker, Vice-Amiral', 'Punk Hazard')]),
    (4, [(3429, 'Yamato', WANO), (3430, 'Yamato, fils de Kaido', WANO)]),
    (4, [(3174, 'Kozuki Oden', WANO), (3175, 'Oden, héritier du shogun', WANO)]),
    (4, [(2112, 'Charlotte Katakuri', 'Whole Cake Island'), (2471, 'Katakuri, fruit du Mochi', 'Whole Cake Island'), (2962, 'Katakuri, Haki de l’avenir', 'Whole Cake Island')]),
    (2, [(1034, 'Bartolomeo', 'Dressrosa'), (1802, 'Bartolomeo, rebelle', 'Dressrosa')]),
    (2, [(72, 'Nefertari Vivi', 'Alabasta'), (664, 'Vivi, princesse d’Alabasta', 'Alabasta')]),
    (1, [(46, 'Kuro aux 100 plans', 'East Blue')]),
    (1, [(57, 'Don Krieg', 'East Blue'), (58, 'Don Krieg et sa bombe MH5', 'East Blue')]),
    (4, [(366, 'Silvers Rayleigh', 'Sabaody'), (1977, 'Rayleigh, maître du Haki', 'Sabaody')]),
    (4, [(250, 'Marco', 'Marineford'), (251, 'Marco le Phénix', 'Marineford')]),
    (2, [(389, 'Emporio Ivankov', 'Impel Down'), (390, 'Ivankov, reine du Kamabakka', 'Impel Down')]),
    (2, [(413, 'Gecko Moria', 'Thriller Bark'), (414, 'Moria, Grand Corsaire', 'Thriller Bark')]),
    (2, [(461, 'Bon Clay', 'Impel Down'), (462, 'Bon Clay, roi de l’évasion', 'Impel Down')]),
    (3, [(3274, 'Crocodile', 'Alabasta')]),
    (2, [(31, 'Coby', 'East Blue'), (859, 'Coby, Marine', 'Marineford'), (1926, 'Coby, capitaine', WANO)]),
    (3, [(3680, 'Uta', 'One Piece Red'), (3721, 'Uta, Reine du monde d’Uta', 'One Piece Red')]),
    (2, [(1633, 'Monkey D. Dragon', 'Révolution')]),
]
# Noms français différents de l'anglais (personnages ajoutés automatiquement)
OP_FR = {'Whitebeard': 'Barbe Blanche', 'Blackbeard': 'Barbe Noire', 'Eneru': 'Ener', 'Buggy': 'Baggy', 'Nefeltari Vivi': 'Nefertari Vivi',
         'Nefeltari Cobra': 'Nefertari Cobra', 'Sengoku': 'Sengoku', 'Charlotte Linlin': 'Big Mom'}
# Autres noms de personnages déjà présents (pas de doublon)
OP_ALIAS = {'Hawk Eyes Mihawk', 'Garp the Fist', 'Sakazuki', 'Kuzan', 'Borsalino', 'Master Caesar', 'Zorojuro', 'Bon Clay', 'Luffytaro', 'Sanji', 'Nami', 'Usopp', 'Chopper',
            'Robin', 'Franky', 'Brook', 'Ace', 'Shanks', 'Edward Newgate', 'Whitebeard', 'Blackbeard', 'Marshall D. Teach', 'Big Mom', 'Charlotte Linlin', 'Kaido',
            'Usoland', 'God Usopp', 'Soul King', 'Sogeking', 'Nico Robin', 'Tony Tony Chopper', 'Portgas D. Ace', 'Trafalgar Law', 'Monkey D. Luffy', 'Roronoa Zoro'}
OP_RARITY = {'Fujitora': 4, 'Ryokugyu': 4, 'Sengoku': 4, 'Bartholomew Kuma': 4, 'Ben Beckman': 4, 'Queen': 3, 'King': 3, 'Jack': 3, 'Vegapunk': 3,
             'Shiryu': 3, 'Jozu': 3, 'Corazon': 3, 'Zephyr': 3, 'Ryuma': 3, "Kin'emon": 3, 'Momonosuke': 3, 'Smoothie': 3, 'Cracker': 3, 'Perospero': 3,
             'Magellan': 3, 'Drake': 3, 'Killer': 3, 'Hawkins': 3, 'Jewelry Bonney': 3, 'Vista': 3, 'Izo': 3, 'Kanjuro': 2, 'Charlotte Oven': 3,
             'Vinsmoke Judge': 2, 'Vergo': 3, 'Diamante': 3, 'Trebol': 2, 'Pica': 2, 'Hody Jones': 2, 'Shirahoshi': 3, 'Rebecca': 2, 'Cavendish': 3,
             'Olin': 4, 'Kyros': 3, 'Monet': 2, 'Iceburg': 2, 'Dogstorm': 3, 'Cat Viper': 3, 'Carrot': 2, 'Kalifa': 2, 'Kaku': 3}
FESTIVE = re.compile(r'Halloween|Christmas|Santa|Valentine|Summer|Beach|Vacation|New Year|Anniversary|Festival|Expo|Bride|Wedding|Swimsuit|Holiday|Spooky|Easter|Tea Time|Celebrat|Cruise|Kung Fu|ONE PIECE magazine|STAMPEDE|FILM|Film |Stage|Idol|Dance|Movie|Treasure Cruise|Xmas|Snow|Hot Spring|Spring|Autumn|Winter|Party|Costume|Masquerade|Cosplay|Sports|Baseball|Soccer|School|Detective|Training|Voyage Log|Voyage Dream|Merveille|Strong World|Gold|Z\b|Dream Chaser|Code|Lives By', re.I)
GENERIC = re.compile(r'^Mr\.?$|^Miss|Street Punk|^Zombie|^Prisoner|^Elite$|^Leo$|Group|Unit\b|Crew\b|Cabin Boy|Soldier|Marine$|Marines|Pirates?$|Officer$|Guard|Elect|Army|Squad|Brothers|Family|Fleet|Navy|Gang|Trio|Duo|Club|Corps|Tribe|Band|Twins|Sisters|Minks|Fish-?[Mm]en|Giants|Animal|Wanokuni|Samurai$|Ninja$|Musketeers|Lieutenant|Commander|Captain$|Assassin|Bandit|Enforcer|Thug|Mob', re.I)

# =====================================================================
# Naruto : illustrations de Naruto Blazing
# =====================================================================
NB_BASE = 'https://arosare.github.io/naruto-blazing-revival/'
nb = json.load(open(P('nb-catalogue.json')))
nb_assets = set(re.findall(r'"([^"]+\.(?:png|webp))"', open(P('nb-assets.json')).read()))

# Même personnage sous deux noms dans la source
NAR_MERGE = {'Suigetsu': 'Suigetsu Hozuki', 'Yamato': 'Tenzo (Yamato)'}

def nb_versions(name):
    """Versions d'un personnage (une par titre), avec la meilleure image disponible."""
    out, seen = [], set()
    names = {name} | {a for a, b in NAR_MERGE.items() if b == name}
    for c in nb['all']:
        if c['name'] not in names or c['title'] in seen or re.fullmatch(r'[a-z ]+', c['title']): continue
        big = small = None
        for f in sorted(c['forms'], key=lambda f: -f['stars']):
            for k in ('card', 'art'):
                p = f.get(k)
                if not big and p and p in nb_assets and '/icon-' not in p and '/portrait-' not in p: big = p
            for k in ('portrait', 'clientPortrait'):
                p = f.get(k)
                if not small and p and p in nb_assets: small = p
        if not big and not small: continue
        seen.add(c['title'])
        out.append({'title': c['title'], 'img': NB_BASE + (big or small), 'small': not big})
    return out

def pick(vs, n=3):
    """Garde au plus n versions, en privilégiant les grandes illustrations, réparties dans le temps."""
    if len(vs) <= n: return vs
    big = [v for v in vs if not v['small']]
    if len(big) >= n: vs = big
    idx = sorted({round(i * (len(vs) - 1) / (n - 1)) for i in range(n)})
    return [vs[i] for i in idx]

# Personnages découpés par époque : nom Blazing -> [(rareté, nom affiché, saga, titres Blazing)]
NAR_SPLIT = {
    'Naruto Uzumaki': [(3, 'Naruto', 'Naruto', ['The Worst Loser', 'No. 1 Maverick', 'Nine Tails Power-Up']),
                       (4, 'Naruto Shippuden', 'Shippuden', ['Blowing Gale', 'Power of the Fourth Tail', 'Child of the Prophecy']),
                       (5, 'Naruto (Grande Guerre)', 'Quatrième Grande Guerre', ['Two Suns', 'Proof of Bonds', 'Seal of Light'])],
    'Sasuke Uchiha': [(3, 'Sasuke', 'Naruto', ['A Lone Heart', 'Lone Survivor', 'Chidori: A New Skill', 'Curse Mark 2nd State']),
                      (4, 'Sasuke Shippuden', 'Shippuden', ['Soul Shrouded in Sorrow', 'Avenger', 'World Within a Kaleidoscope']),
                      (5, 'Sasuke (Grande Guerre)', 'Quatrième Grande Guerre', ['Seal of Shadow', 'To Eternal Loneliness', 'All-Ending Thunderbolt'])],
    'Sakura Haruno': [(2, 'Sakura', 'Naruto', ['The Indomitable Maiden', 'Maiden in Love', 'Hardened Resolve']),
                      (3, 'Sakura Shippuden', 'Shippuden', ['Spring in Full Bloom', 'Heroine of the Battlefield', 'Standing Equal'])],
    'Kakashi Hatake': [(2, 'Kakashi jeune', 'Passé', ["A Father's Blade"]),
                       (4, 'Kakashi', 'Naruto', ['The Best Teacher', 'Copier of 1K Techniques', 'Hidden Left Eye']),
                       (4, 'Kakashi Shippuden', 'Shippuden', ['Unique Eyes Blooming', 'Severing Lightning', 'Entrusted With Hope'])],
    'Obito Uchiha': [(3, 'Obito', 'Passé', ['To Protect His Allies']),
                     (4, 'Obito masqué', 'Shippuden', ['The World We Seek', 'Despair of Loneliness', 'Remnants of Despair']),
                     (5, 'Obito Jinchûriki de Jûbi', 'Quatrième Grande Guerre', ['Faraway Dream', 'Drawn to Life', 'True Self'])],
    'Gaara': [(3, 'Gaara', 'Naruto', ['Sand Defense', "The Sand's Final Weapon", 'Sand Clad Demon']),
              (4, 'Gaara Kazekage', 'Shippuden', ['Protector of the Sands', 'Many Bonds', 'Sandstorm-Commanding Kage'])],
}
# Camarades : les premières versions sont celles de Naruto, les suivantes celles de Shippuden
NAR_TWO_ERAS = {'Hinata Hyuga': (2, 3, 'Hinata'), 'Rock Lee': (2, 3, 'Rock Lee'), 'Shikamaru Nara': (2, 3, 'Shikamaru'), 'Neji Hyuga': (2, 3, 'Neji'),
                'Ino Yamanaka': (1, 2, 'Ino'), 'Choji Akimichi': (1, 2, 'Choji'), 'Kiba Inuzuka': (1, 2, 'Kiba'), 'Tenten': (1, 2, 'Tenten')}
NAR_RARITY = {  # rareté imposée (sinon : selon le nombre de versions du personnage dans le jeu)
    'Madara Uchiha': 5, 'Kaguya Otsutsuki': 5, 'Hagoromo Otsutsuki': 5, 'Itachi Uchiha': 5, 'Minato Namikaze': 5, 'Hashirama Senju': 5,
    'Tobirama Senju': 4, 'Jiraiya': 4, 'Tsunade': 4, 'Orochimaru': 4, 'Might Guy': 4, 'Pain (Tendo)': 4, 'Nagato': 4, 'Killer Bee': 4,
    'Indra': 4, 'Ashura': 4, 'Shisui Uchiha': 4, 'Fourth Raikage: Ay': 4, 'Hamura Otsutsuki': 4, 'Kushina Uzumaki': 3, 'Hiruzen Sarutobi': 4,
    'Kisame Hoshigaki': 3, 'Deidara': 3, 'Sasori': 3, 'Hidan': 3, 'Kakuzu': 3, 'Konan': 3, 'Kabuto Yakushi': 3, 'Zabuza Momochi': 3,
    'Danzo Shimura': 3, 'Mei Terumi': 3, 'Ohnoki': 3, 'Third Raikage: Ay': 3, 'Masked Man': 4, 'Tobi': 3, 'Zetsu': 2, 'Kimimaro': 3,
    'Shima & Fukasaku': 3, 'Kinkaku/Ginkaku': 3, 'Mifune': 3, 'Menma Namikaze': 3, 'Naruto & Sasuke (dual)': 5,
    'Yugito Ni\'i': 3, 'Utakata': 3, 'Fuu': 3, 'Han': 3, 'Roshi': 3, 'Yagura': 3, 'Tenzo (Yamato)': 3, 'Asuma Sarutobi': 3, 'Hanzo': 3, 'Izuna Uchiha': 3,
    'Sai': 2, 'Konohamaru Sarutobi': 2, 'Kurenai Yuhi': 2, 'Shino Aburame': 2, 'Karin': 2, 'Suigetsu Hozuki': 2, 'Suigetsu': 2, 'Jugo': 2, 'Kurotsuchi': 2,
    'Hiashi Hyuga': 2, 'Chojuro': 2, 'Pain (Chikushodo)': 2, 'Darui': 2, 'Ao': 2, 'Temari': 2, 'Kankuro': 2, 'Haku': 3, 'Rin Nohara': 2, 'Kidomaru': 2,
    'Jirobo': 2, 'Tayuya': 2, 'Sakon': 2, 'Shikaku Nara': 2, 'Anko Mitarashi': 2,
}
NAR_LABEL = {'Might Guy': 'Gaï Maito', 'Sai': 'Saï', 'Tenzo (Yamato)': 'Yamato', 'Fourth Raikage: Ay': 'Quatrième Raikage', 'Third Raikage: Ay': 'Troisième Raikage',
             'Kinkaku/Ginkaku': 'Kinkaku & Ginkaku', 'Naruto & Sasuke (dual)': 'Naruto & Sasuke', 'Shima & Fukasaku': 'Shima & Fukasaku',
             'Masked Man': 'L’homme masqué', 'Pain (Tendo)': 'Pain', 'Itachi Uchiha': 'Itachi', 'Madara Uchiha': 'Madara', 'Minato Namikaze': 'Minato',
             'Kaguya Otsutsuki': 'Kaguya', 'Hagoromo Otsutsuki': 'Hagoromo', 'Hashirama Senju': 'Hashirama', 'Tobirama Senju': 'Tobirama',
             'Kisame Hoshigaki': 'Kisame', 'Kabuto Yakushi': 'Kabuto', 'Zabuza Momochi': 'Zabuza', 'Hiruzen Sarutobi': 'Hiruzen Sarutobi',
             'Kushina Uzumaki': 'Kushina', 'Shisui Uchiha': 'Shisui', 'Danzo Shimura': 'Danzo', 'Asuma Sarutobi': 'Asuma', 'Kurenai Yuhi': 'Kurenai',
             'Suigetsu Hozuki': 'Suigetsu', 'Konohamaru Sarutobi': 'Konohamaru', 'Rin Nohara': 'Rin', 'Iruka Umino': 'Iruka', 'Anko Mitarashi': 'Anko',
             'Ibiki Morino': 'Ibiki', 'Hayate Gekko': 'Hayate', 'Kotetsu Hagane': 'Kotetsu', 'Izumo Kamizuki': 'Izumo', 'Tsume Inuzuka': 'Tsume',
             'Dosu Kinuta': 'Dosu', 'Zaku Abumi': 'Zaku', 'Shino Aburame': 'Shino', 'Yamato (Guruguru)': 'Guruguru', 'Han': 'Han', 'Roshi': 'Rôshi', 'Fuu': 'Fû', 'Pain (Chikushodo)': 'Pain (voie animale)', 'Kin Tsuchi': 'Kin', 'Mei Terumi': 'Mei Terumi', 'Killer Bee': 'Killer Bee'}
NAR_EXCLUDE = re.compile(r'TEST|test|^James$|^Tim$|Boruto|Isshiki|Baryon|Mecha-Naruto|^Bandit|^Thief|Anbu|Chunin Male|^Sound Ninja$|Kawaki|Sarada|Mitsuki|Momoshiki|Kinshiki|Urashiki|Toneri')

# =====================================================================
lines = {'dbz': [], 'naruto': [], 'onepiece': []}
missing = []
for r, forms in DB:
    fs = [{'name': l, 'saga': s, 'img': dimg[d]} for l, d, s in forms if d in dimg]
    missing += [('dbz', d) for l, d, s in forms if d not in dimg]
    if fs: lines['dbz'].append({'rarity': r, 'forms': fs})

# --- One Piece : familles choisies + personnages ajoutés automatiquement ---
def base_name(n):
    n = n.replace('⚐', '').strip()
    n = re.split(r' - |: ', n)[0].strip()
    n = re.sub(r'^(The |Captain |Admiral |Vice Admiral |Fleet Admiral |General |Princess |Prince |Chef |Dr\. |Doctor |Mr\. \d+ )', '', n)
    return n
used_units = {n for _, fs in OP for n, _, _ in fs}
used_names = set()
for _, fs in OP:
    for n, _, _ in fs:
        used_names.add(base_name(units[n - 1][0]))
by_char = collections.defaultdict(list)
for i, u in enumerate(units):
    if not u or not u[0] or u[0].startswith('⚐') or '&' in u[0] or ' VS ' in u[0] or ' x ' in u[0]: continue
    if FESTIVE.search(u[0]): continue
    b = base_name(u[0])
    if not b or GENERIC.search(b) or len(b) < 3: continue
    by_char[b].append(i + 1)
# Regroupe les variantes (« Marco the Phoenix » avec « Marco »)
keys = sorted(by_char, key=len)
for k in keys:
    for k2 in keys:
        if k2 != k and k2 in by_char and k in by_char and (k2.startswith(k + ' ') or k2.endswith(' ' + k)):
            by_char[k] += by_char.pop(k2)
for k in list(by_char):
    if k in used_names or k in OP_ALIAS or any(k in u or u in k for u in used_names if len(u) > 5): by_char.pop(k)
ranked = sorted(by_char.items(), key=lambda kv: -len(kv[1]))

# Vérifie que les images existent (dépôt optc-db)
def check(urls, tries=3):
    ok, todo = set(), list(dict.fromkeys(urls))
    for _ in range(tries):
        for i in range(0, len(todo), 50):
            res = subprocess.run(['bash', '-c', 'for u in "$@"; do echo "$(curl -s -o /dev/null -I -m 20 -w "%{http_code}" "$u") $u" & done; wait', '_'] + todo[i:i + 50], capture_output=True, text=True)
            ok |= {l[4:] for l in res.stdout.split('\n') if l.startswith('200 ')}
        todo = [u for u in todo if u not in ok]
        if not todo: break
    return ok

OP_TARGET = int(os.environ.get('OP_TARGET', 170))
cands = ranked[:max(0, OP_TARGET - len(OP)) + 60]
want = [optc_url(n) for _, fs in OP for n, _, _ in fs] + [optc_url(n) for _, ns in cands for n in ns[:8]]
ok = check(want)
for r, forms in OP:
    fs = [{'name': l, 'saga': s, 'img': optc_url(n)} for n, l, s in forms if optc_url(n) in ok]
    missing += [('onepiece', n) for n, l, s in forms if optc_url(n) not in ok]
    if fs: lines['onepiece'].append({'rarity': r, 'forms': fs})
for name, ns in cands:
    if len(lines['onepiece']) >= OP_TARGET: break
    good = [n for n in ns[:8] if optc_url(n) in ok]
    if not good: continue
    good = good if len(good) <= 3 else [good[0], good[len(good) // 2], good[-1]]
    cnt = len(ns)
    r = OP_RARITY.get(name, 4 if cnt >= 25 else 3 if cnt >= 12 else 2 if cnt >= 6 else 1)
    label = OP_FR.get(name, name)
    fs = [{'name': label, 'saga': re.split(r' - ', units[n - 1][0], maxsplit=1)[1] if ' - ' in units[n - 1][0] else '', 'img': optc_url(n)} for n in good]
    for j, f in enumerate(fs[1:], 1): f['name'] = f'{label} ({j + 1})' if not f['saga'] else label
    lines['onepiece'].append({'rarity': r, 'forms': fs})

# --- Naruto ---
nar_names = collections.Counter(c['name'] for c in nb['all'])
NAR_TARGET = int(os.environ.get('NAR_TARGET', 140))
for name, eras in NAR_SPLIT.items():
    vs = {v['title']: v for v in nb_versions(name)}
    for r, label, saga, titles in eras:
        fs = [{'name': label, 'saga': t, 'img': vs[t]['img'], **({'small': 1} if vs[t]['small'] else {})} for t in titles if t in vs]
        missing += [('naruto', name, t) for t in titles if t not in vs]
        if fs: lines['naruto'].append({'rarity': r, 'forms': fs})
for name, (r1, r2, label) in NAR_TWO_ERAS.items():
    vs = nb_versions(name)
    if not vs: continue
    k = 2 if len(vs) > 2 else 1
    for r, lab, part in ((r1, label, vs[:k]), (r2, label + ' Shippuden', vs[k:])):
        part = pick(part)
        if part: lines['naruto'].append({'rarity': r, 'forms': [{'name': lab, 'saga': v['title'], 'img': v['img'], **({'small': 1} if v['small'] else {})} for v in part]})
done = set(NAR_SPLIT) | set(NAR_TWO_ERAS)
rest = sorted((n for n in nar_names if n not in done and n not in NAR_MERGE and not NAR_EXCLUDE.search(n)), key=lambda n: (-(n in NAR_RARITY), -nar_names[n]))
for name in rest:
    if len(lines['naruto']) >= NAR_TARGET: break
    vs = pick(nb_versions(name))
    if not vs: continue
    cnt = nar_names[name]
    r = NAR_RARITY.get(name, 3 if cnt >= 8 else 2 if cnt >= 4 else 1)
    label = NAR_LABEL.get(name, name)
    lines['naruto'].append({'rarity': r, 'forms': [{'name': label, 'saga': v['title'], 'img': v['img'], **({'small': 1} if v['small'] else {})} for v in vs]})

# Identifiants stables (tirés du nom de la première forme) : ajouter des familles ne change pas les existantes
for k, ls in lines.items():
    used = set()
    for l in ls:
        base = k[:2] + '-' + slug(l['forms'][0]['name'])
        lid = base; n = 2
        while lid in used: lid = f'{base}{n}'; n += 1
        used.add(lid)
        for j, f in enumerate(l['forms']):
            f['id'] = lid if j == 0 else f'{lid}-{j}'

print({k: (len(v), sum(len(l['forms']) for l in v), dict(sorted(collections.Counter(l['rarity'] for l in v).items()))) for k, v in lines.items()})
print('total familles :', sum(len(v) for v in lines.values()))
print('manquants :', missing)

js = """// Familles Dragon Ball, Naruto et One Piece : une famille = une version d'un personnage à une époque, avec ses transformations.
// Images : Dragon Ball Z Dokkan Battle (wiki Dokkan), Naruto Blazing (naruto-blazing-revival), One Piece Treasure Cruise (optc-db).
// Généré par tools/gen_anime.py : pour ajouter des personnages, compléter les listes du script et relancer.
"""
js += 'export const ANIME = ' + json.dumps([
    {'key': 'dbz', 'info': {'name': 'Dragon Ball', 'short': 'Dragon Ball', 'color': '#ff8a00', 'emoji': '🐉'}, 'lines': lines['dbz']},
    {'key': 'naruto', 'info': {'name': 'Naruto', 'short': 'Naruto', 'color': '#ff5a1f', 'emoji': '🍥'}, 'lines': lines['naruto']},
    {'key': 'onepiece', 'info': {'name': 'One Piece', 'short': 'One Piece', 'color': '#e11d48', 'emoji': '🏴‍☠️'}, 'lines': lines['onepiece']},
], ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print(len(js), 'octets')
