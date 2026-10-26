"""Génère js/game/anime-data.js : familles Dragon Ball (Dokkan), Naruto (Blazing) et One Piece (Treasure Cruise)."""
import json, re, sys, os, subprocess

OUT = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------- Dragon Ball : images des cartes Dokkan Battle ----------
dok = json.load(open(os.path.join(HERE, 'dokkan.json')))
dimg = {}
for c in sorted(dok, key=lambda c: (c['rarity'] != 'LR', c['id'])):
    if c['name'] not in dimg and c.get('imageURL'):
        dimg[c['name']] = c['imageURL'].replace('vignette.wikia.nocookie.net', 'static.wikia.nocookie.net')

# (rareté, [(nom affiché, nom Dokkan, saga)])
DB = [
    (5, [('Goku', 'Goku', 'Saga Saiyan'), ('Goku Super Saiyan', 'Super Saiyan Goku', 'Saga Freezer'), ('Goku SSJ2', 'Super Saiyan 2 Goku', 'Saga Buu'), ('Goku SSJ3', 'Super Saiyan 3 Goku', 'Saga Buu'), ('Goku Super Saiyan God', 'Super Saiyan God Goku', 'Battle of Gods'), ('Goku Super Saiyan Blue', 'Super Saiyan God SS Goku', 'Résurrection de F'), ('Goku Ultra Instinct', 'Goku (Ultra Instinct)', 'Tournoi du Pouvoir')]),
    (5, [('Vegeta', 'Vegeta', 'Saga Saiyan'), ('Vegeta Super Saiyan', 'Super Saiyan Vegeta', 'Saga Cyborgs'), ('Super Vegeta', 'Super Vegeta', 'Saga Cell'), ('Majin Vegeta', 'Majin Vegeta', 'Saga Buu'), ('Vegeta Super Saiyan God', 'Super Saiyan God Vegeta', 'Dragon Ball Super'), ('Vegeta Super Saiyan Blue', 'Super Saiyan God SS Vegeta', 'Dragon Ball Super'), ('Vegeta Blue Évolution', 'Super Saiyan God SS Evolved Vegeta', 'Tournoi du Pouvoir')]),
    (4, [('Gohan enfant', 'Gohan (Kid)', 'Saga Saiyan'), ('Gohan (Namek)', 'Gohan (Youth)', 'Saga Freezer'), ('Gohan Super Saiyan', 'Super Saiyan Gohan (Youth)', 'Saga Cell'), ('Gohan SSJ2', 'Super Saiyan 2 Gohan (Youth)', 'Saga Cell')]),
    (4, [('Gohan ado', 'Gohan (Teen)', 'Saga Buu'), ('Gohan ado Super Saiyan', 'Super Saiyan Gohan (Teen)', 'Saga Buu'), ('Gohan ado SSJ2', 'Super Saiyan 2 Gohan (Teen)', 'Saga Buu'), ('Gohan Ultime', 'Ultimate Gohan', 'Saga Buu')]),
    (5, [('Gogeta', 'Gogeta', 'Fusion Reborn'), ('Gogeta Super Saiyan', 'Super Saiyan Gogeta', 'Fusion Reborn'), ('Gogeta SSJ4', 'Super Saiyan 4 Gogeta', 'Dragon Ball GT')]),
    (5, [('Vegeto', 'Vegito', 'Saga Buu'), ('Super Vegeto', 'Super Vegito', 'Saga Buu'), ('Vegeto Blue', 'Super Saiyan God SS Vegito', 'Saga Black')]),
    (5, [('Broly enfant', 'Broly (Kid)', 'Broly'), ('Broly', 'Broly', 'Broly'), ('Broly furieux', 'Broly (Wrathful)', 'Broly'), ('Broly Super Saiyan', 'Super Saiyan Broly', 'Broly'), ('Broly Légendaire', 'Legendary Super Saiyan Broly', 'Broly')]),
    (5, [('Beerus', 'Beerus', 'Battle of Gods')]),
    (5, [('Whis', 'Whis', 'Battle of Gods')]),
    (5, [('Jiren', 'Jiren', 'Tournoi du Pouvoir'), ('Jiren pleine puissance', 'Jiren (Full Power)', 'Tournoi du Pouvoir')]),
    (4, [('Goku Black', 'Goku Black', 'Saga Black'), ('Goku Black Rosé', 'Goku Black (Super Saiyan Rosé)', 'Saga Black')]),
    (4, [('Zamasu', 'Zamasu', 'Saga Black'), ('Zamasu fusionné', 'Fusion Zamasu', 'Saga Black')]),
    (4, [('Freezer', 'Frieza (1st Form)', 'Saga Freezer'), ('Freezer 2e forme', 'Frieza (2nd Form)', 'Saga Freezer'), ('Freezer 3e forme', 'Frieza (3rd Form)', 'Saga Freezer'), ('Freezer forme finale', 'Frieza (Final Form)', 'Saga Freezer'), ('Freezer 100 %', 'Frieza (Full Power)', 'Saga Freezer'), ('Golden Freezer', 'Golden Frieza', 'Résurrection de F')]),
    (4, [('Cell', 'Cell (1st Form)', 'Saga Cell'), ('Cell 2e forme', 'Cell (2nd Form)', 'Saga Cell'), ('Cell parfait', 'Cell (Perfect Form)', 'Saga Cell'), ('Super Cell parfait', 'Perfect Cell', 'Saga Cell')]),
    (4, [('Boubou', 'Majin Buu (Good)', 'Saga Buu'), ('Super Boubou', 'Buu (Super)', 'Saga Buu'), ('Kid Boo', 'Buu (Kid)', 'Saga Buu')]),
    (4, [('Trunks du futur', 'Trunks (Teen) (Future)', 'Saga Cyborgs'), ('Trunks Super Saiyan', 'Super Saiyan Trunks (Future)', 'Saga Cyborgs'), ('Super Trunks', 'Super Trunks', 'Saga Cell')]),
    (4, [('Gotenks', 'Gotenks', 'Saga Buu'), ('Gotenks Super Saiyan', 'Super Saiyan Gotenks', 'Saga Buu'), ('Gotenks SSJ3', 'Super Saiyan 3 Gotenks', 'Saga Buu')]),
    (4, [('Goku GT', 'Goku (GT)', 'Dragon Ball GT'), ('Goku GT Super Saiyan', 'Super Saiyan Goku (GT)', 'Dragon Ball GT'), ('Goku GT SSJ3', 'Super Saiyan 3 Goku (GT)', 'Dragon Ball GT'), ('Goku SSJ4', 'Super Saiyan 4 Goku', 'Dragon Ball GT'), ('Goku SSJ4 pleine puissance', 'Super Full Power Saiyan 4 Goku', 'Dragon Ball GT')]),
    (4, [('Hit', 'Hit', 'Tournoi des univers')]),
    (4, [('Cooler', 'Cooler', 'Les Mercenaires de l’espace'), ('Cooler forme finale', 'Cooler (Final Form)', 'Les Mercenaires de l’espace'), ('Golden Cooler', 'Golden Cooler', 'Dragon Ball Heroes')]),
    (4, [('Bardock', 'Bardock', 'Le Père de Goku'), ('Bardock Super Saiyan', 'Super Saiyan Bardock', 'Episode of Bardock')]),
    (4, [('Vados', 'Vados', 'Tournoi des univers')]),
    (4, [('Champa', 'Champa', 'Tournoi des univers')]),
    (3, [('Piccolo', 'Piccolo', 'Saga Saiyan'), ('Piccolo éveillé', 'Piccolo (Power Awakening)', 'Super Hero')]),
    (3, [('Gohan du futur', 'Gohan (Future)', 'Trunks du futur'), ('Gohan du futur Super Saiyan', 'Super Saiyan Gohan (Future)', 'Trunks du futur')]),
    (3, [('Great Saiyaman', 'Great Saiyaman', 'Saga Buu'), ('Great Saiyaman SS', 'Great Saiyaman (SS)', 'Saga Buu'), ('Great Saiyaman SS2', 'Great Saiyaman (SS2)', 'Saga Buu')]),
    (3, [('Trunks enfant', 'Trunks (Kid)', 'Saga Buu'), ('Trunks enfant Super Saiyan', 'Super Saiyan Trunks (Kid)', 'Saga Buu')]),
    (3, [('Goten', 'Goten (Kid)', 'Saga Buu'), ('Goten Super Saiyan', 'Super Saiyan Goten (Kid)', 'Saga Buu')]),
    (3, [('C-17', 'Android #17', 'Saga Cyborgs'), ('C-17 (Univers 7)', 'Android #17 (Team Universe 7)', 'Tournoi du Pouvoir')]),
    (3, [('Super C-17', 'Hell Fighter #17', 'Dragon Ball GT'), ('Super C-17 fusionné', 'Super #17', 'Dragon Ball GT')]),
    (3, [('C-13', 'Android #13', 'Le Combat fratricide'), ('C-13 fusionné', 'Fusion Android #13', 'Le Combat fratricide')]),
    (3, [('Janemba', 'Janemba', 'Fusion Reborn'), ('Super Janemba', 'Super Janemba', 'Fusion Reborn')]),
    (3, [('Caulifla', 'Caulifla', 'Tournoi du Pouvoir'), ('Caulifla SSJ2', 'Super Saiyan 2 Caulifla', 'Tournoi du Pouvoir'), ('Kefla', 'Kefla', 'Tournoi du Pouvoir'), ('Kefla SSJ2', 'Super Saiyan 2 Kefla', 'Tournoi du Pouvoir')]),
    (3, [('Kale', 'Kale', 'Tournoi du Pouvoir'), ('Kale berserk', 'Kale (Berserk)', 'Tournoi du Pouvoir'), ('Kale SSJ2', 'Super Saiyan 2 Kale', 'Tournoi du Pouvoir')]),
    (3, [('Cabba Super Saiyan', 'Super Saiyan Cabba', 'Tournoi des univers'), ('Cabba SSJ2', 'Super Saiyan 2 Cabba', 'Tournoi des univers')]),
    (3, [('Toppo', 'Toppo (Pride Troopers)', 'Tournoi du Pouvoir'), ('Toppo Dieu de la destruction', 'Toppo (God of Destruction Mode)', 'Tournoi du Pouvoir')]),
    (3, [('Uub', 'Uub (Youth)', 'Saga Buu'), ('Uub adolescent', 'Uub (Teen)', 'Dragon Ball GT'), ('Majuub', 'Majuub', 'Dragon Ball GT')]),
    (3, [('Baby', 'Super Baby 1', 'Dragon Ball GT'), ('Baby géant', 'Super Baby 2 (Giant Ape)', 'Dragon Ball GT')]),
    (3, [('Li Shenron', 'Syn Shenron', 'Dragon Ball GT'), ('Super Li Shenron', 'Omega Shenron', 'Dragon Ball GT')]),
    (3, [('Gamma 1', 'Gamma 1', 'Super Hero')]),
    (3, [('Gamma 2', 'Gamma 2', 'Super Hero')]),
    (3, [('C-21', 'Android #21 (Transformed)', 'FighterZ'), ('C-21 gentille', 'Android #21 (Transformed, Good)', 'FighterZ')]),
    (3, [('Pikkon', 'Paikuhan', 'Autre monde'), ('Super Pikkon', 'Super Paikuhan', 'Autre monde')]),
    (3, [('Goku enfant', 'Goku (Youth)', 'Dragon Ball'), ('Goku singe géant', 'Goku (Youth) (Giant Ape)', 'Dragon Ball')]),
    (3, [('Metal Cooler', 'Metal Cooler', 'Les Mercenaires de l’espace')]),
    (3, [('Marcarita', 'Marcarita', 'Tournoi du Pouvoir')]),
    (3, [('Roi Démon Piccolo', 'Demon King Piccolo (Elder)', 'Dragon Ball'), ('Roi Démon Piccolo rajeuni', 'Demon King Piccolo', 'Dragon Ball')]),
    (2, [('Krilin', 'Krillin', 'Dragon Ball')]),
    (2, [('Ten Shin Han', 'Tien', 'Dragon Ball')]),
    (2, [('Tortue Géniale', 'Master Roshi', 'Dragon Ball'), ('Tortue Géniale Max Power', 'Master Roshi (Max Power)', 'Saga Cell')]),
    (2, [('C-16', 'Android #16', 'Saga Cell')]),
    (2, [('C-18', 'Android #18', 'Saga Cyborgs')]),
    (2, [('Raditz', 'Raditz', 'Saga Saiyan'), ('Raditz singe géant', 'Raditz (Giant Ape)', 'Saga Saiyan')]),
    (2, [('Nappa', 'Nappa', 'Saga Saiyan')]),
    (2, [('Capitaine Ginyu', 'Captain Ginyu', 'Saga Freezer')]),
    (2, [('Roi Cold', 'King Cold', 'Trunks du futur')]),
    (2, [('Mecha Freezer', 'Mecha Frieza', 'Trunks du futur')]),
    (2, [('Turles', 'Turles', 'Le Combat fratricide'), ('Turles singe géant', 'Turles (Giant Ape)', 'Le Combat fratricide')]),
    (2, [('Pan', 'Pan (Kid)', 'Saga Buu'), ('Pan GT', 'Pan (GT)', 'Dragon Ball GT')]),
    (2, [('Dabra', 'Dabura', 'Saga Buu')]),
    (2, [('Tapion', 'Tapion', 'L’Attaque du dragon')]),
    (2, [('Bojack', 'Boujack', 'Bojack'), ('Bojack pleine puissance', 'Full Power Boujack', 'Bojack')]),
    (2, [('Roi Vegeta', 'King Vegeta', 'Le Père de Goku')]),
    (2, [('Vegeta enfant', 'Vegeta (Kid)', 'Le Père de Goku')]),
    (2, [('Arale', 'Arale Norimaki', 'Dr Slump')]),
    (2, [('Mercenaire Tao', 'Mercenary Tao', 'Dragon Ball'), ('Cyborg Tao', 'Cyborg Tao', 'Dragon Ball')]),
    (2, [('Dyspo', 'Dyspo (Super Speed Mode)', 'Tournoi du Pouvoir')]),
    (2, [('Goku Jr. Super Saiyan', 'Super Saiyan Goku Jr.', 'Dragon Ball GT')]),
    (2, [('Vegeta Jr. Super Saiyan', 'Super Saiyan Vegeta Jr.', 'Dragon Ball GT')]),
    (1, [('Yamcha', 'Yamcha', 'Dragon Ball')]),
    (1, [('Yajirobé', 'Yajirobe', 'Dragon Ball')]),
    (1, [('Mister Satan', 'Hercule', 'Saga Cell')]),
    (1, [('Videl', 'Videl', 'Saga Buu')]),
    (1, [('Chichi', 'Chi-Chi (Youth)', 'Dragon Ball'), ('Chichi adulte', 'Chi-Chi', 'Saga Buu')]),
    (1, [('Bulma', 'Bulma (Youth)', 'Dragon Ball')]),
    (1, [('Lunch', 'Launch', 'Dragon Ball')]),
    (1, [('Guldo', 'Guldo', 'Saga Freezer')]),
    (1, [('Recoome', 'Recoome', 'Saga Freezer')]),
    (1, [('Burter', 'Burter', 'Saga Freezer')]),
    (1, [('Jeice', 'Jeice', 'Saga Freezer')]),
    (1, [('Kaïo Shin', 'Supreme Kai', 'Saga Buu')]),
    (1, [('Tout-Puissant', 'Kami', 'Dragon Ball')]),
    (1, [('Nail', 'Nail', 'Saga Freezer')]),
    (1, [('Grand-père Gohan', 'Grandpa Gohan', 'Dragon Ball')]),
    (1, [('Cheelai', 'Cheelai', 'Broly')]),
    (1, [('Jaco', 'Jaco', 'Dragon Ball Super')]),
    (1, [('Tarble', 'Tarble', 'Hé ! Son Goku et ses amis sont de retour !!')]),
    (1, [('Bra', 'Bulla', 'Dragon Ball GT')]),
    (1, [('Giru', 'Giru', 'Dragon Ball GT')]),
]

# ---------- One Piece : images de One Piece Treasure Cruise (optc-db) ----------
OP = [
    (5, 'Monkey D. Luffy', [(1, 'Luffy', 'East Blue'), (4, 'Luffy Gear 2', 'Enies Lobby'), (217, 'Luffy Gear 3', 'Enies Lobby'), (1404, 'Luffy (2 ans après)', 'Île des Hommes-Poissons'), (1593, 'Luffy Gear 4 Boundman', 'Dressrosa'), (2363, 'Luffy Gear 4 Snakeman', 'Whole Cake Island'), (3957, 'Luffy Gear 5', 'Pays de Wano')]),
    (5, 'Roronoa Zoro', [(5, 'Zoro', 'East Blue'), (8, 'Zoro Ashura', 'Enies Lobby'), (1362, 'Zoro (2 ans après)', 'Île des Hommes-Poissons'), (3896, 'Zoro Roi des Enfers', 'Pays de Wano')]),
    (4, 'Sanji', [(17, 'Sanji', 'East Blue'), (20, 'Sanji Diable Jambe', 'Enies Lobby'), (1368, 'Sanji (2 ans après)', 'Île des Hommes-Poissons'), (3889, 'Sanji Ifrit Jambe', 'Pays de Wano')]),
    (3, 'Nami', [(9, 'Nami', 'East Blue'), (12, 'Nami Thunderbolt Tempo', 'Skypiea'), (1366, 'Nami (2 ans après)', 'Île des Hommes-Poissons')]),
    (3, 'Usopp', [(13, 'Usopp', 'East Blue'), (16, 'Sogeking', 'Enies Lobby'), (1406, 'Usopp (2 ans après)', 'Île des Hommes-Poissons')]),
    (3, 'Chopper', [(21, 'Chopper', 'Drum'), (22, 'Chopper Heavy Point', 'Drum'), (249, 'Chopper Monster Point', 'Enies Lobby'), (1370, 'Chopper (2 ans après)', 'Île des Hommes-Poissons')]),
    (3, 'Nico Robin', [(210, 'Nico Robin', 'Alabasta'), (709, 'Robin, membre de l’équipage', 'Enies Lobby'), (1408, 'Robin (2 ans après)', 'Île des Hommes-Poissons')]),
    (3, 'Franky', [(336, 'Franky', 'Water Seven'), (1364, 'Franky (2 ans après)', 'Île des Hommes-Poissons')]),
    (3, 'Brook', [(423, 'Brook', 'Thriller Bark'), (1410, 'Brook (2 ans après)', 'Île des Hommes-Poissons')]),
    (4, 'Jinbe', [(409, 'Jinbe', 'Impel Down'), (410, 'Jinbe, Grand Corsaire', 'Marineford'), (2264, 'Jinbe, capitaine des Pirates du Soleil', 'Whole Cake Island')]),
    (5, 'Portgas D. Ace', [(74, 'Ace', 'Alabasta'), (75, 'Ace Poing Ardent', 'Alabasta'), (1247, 'Ace à Marineford', 'Marineford')]),
    (5, 'Shanks', [(600, 'Shanks apprenti', 'Équipage de Roger'), (76, 'Shanks le Roux', 'East Blue'), (530, 'Shanks, Empereur', 'Marineford')]),
    (5, 'Barbe Blanche', [(260, 'Edward Newgate', 'Marineford'), (261, 'Barbe Blanche', 'Marineford'), (1413, 'Barbe Blanche, Empereur', 'Marineford')]),
    (4, 'Trafalgar Law', [(828, 'Law enfant', 'Flevance'), (307, 'Trafalgar Law', 'Sabaody'), (308, 'Law « ROOM »', 'Punk Hazard'), (1045, 'Law, Grand Corsaire', 'Dressrosa')]),
    (4, 'Boa Hancock', [(415, 'Boa Hancock', 'Amazon Lily'), (416, 'Hancock, Grand Corsaire', 'Amazon Lily')]),
    (5, 'Kaido', [(2386, 'Kaido', 'Pays de Wano'), (2387, 'Kaido, Roi des Bêtes', 'Pays de Wano'), (2923, 'Kaido forme hybride', 'Pays de Wano')]),
    (5, 'Big Mom', [(2108, 'Charlotte Linlin', 'Whole Cake Island'), (2109, 'Big Mom', 'Whole Cake Island'), (2234, 'Big Mom, Empereur', 'Whole Cake Island')]),
    (4, 'Doflamingo', [(417, 'Doflamingo', 'Marineford'), (418, 'Doflamingo, Grand Corsaire', 'Dressrosa'), (2126, 'Doflamingo « Joker »', 'Dressrosa')]),
    (4, 'Sabo', [(512, 'Sabo enfant', 'Mont Corvo'), (668, 'Sabo', 'Dressrosa'), (669, 'Sabo, Armée révolutionnaire', 'Dressrosa'), (1492, 'Sabo et le fruit du Feu', 'Dressrosa')]),
    (5, 'Barbe Noire', [(446, 'Marshall D. Teach', 'Jaya'), (447, 'Barbe Noire', 'Marineford'), (1268, 'Barbe Noire, capitaine', 'Marineford')]),
    (4, 'Mihawk', [(226, 'Dracule Mihawk', 'East Blue'), (717, 'Mihawk, Grand Corsaire', 'Marineford')]),
    (3, 'Eustass Kid', [(356, 'Eustass Kid', 'Sabaody'), (2980, 'Kid, capitaine magnétique', 'Pays de Wano')]),
    (4, 'Garp', [(305, 'Monkey D. Garp', 'Water Seven'), (1845, 'Garp, héros de la Marine', 'Marineford')]),
    (4, 'Kizaru', [(977, 'Kizaru', 'Sabaody'), (978, 'Kizaru, l’Homme de lumière', 'Sabaody')]),
    (4, 'Akainu', [(1297, 'Akainu', 'Marineford'), (1298, 'Akainu, l’Homme de magma', 'Marineford')]),
    (4, 'Aokiji', [(574, 'Aokiji', 'Long Ring Long Land'), (575, 'Aokiji, l’Homme de glace', 'Water Seven')]),
    (3, 'Rob Lucci', [(321, 'Rob Lucci', 'Water Seven'), (633, 'Lucci, CP9', 'Enies Lobby'), (2015, 'Lucci, arme de la Justice', 'Egghead')]),
    (3, 'Ener', [(545, 'Ener', 'Skypiea'), (603, 'Ener 200 millions de volts', 'Skypiea')]),
    (2, 'Arlong', [(65, 'Arlong', 'East Blue'), (656, 'Arlong, Pirates du Soleil', 'East Blue')]),
    (2, 'Baggy', [(38, 'Baggy', 'East Blue'), (39, 'Baggy le Clown', 'East Blue'), (2277, 'Baggy, Grand Corsaire', 'Marineford')]),
    (3, 'Smoker', [(69, 'Smoker', 'Loguetown'), (70, 'Smoker le Chasseur blanc', 'Alabasta'), (1232, 'Smoker, Vice-Amiral', 'Punk Hazard')]),
    (4, 'Yamato', [(3429, 'Yamato', 'Pays de Wano'), (3430, 'Yamato, fils de Kaido', 'Pays de Wano')]),
    (4, 'Kozuki Oden', [(3174, 'Kozuki Oden', 'Pays de Wano'), (3175, 'Oden, héritier du shogun', 'Pays de Wano')]),
    (5, 'Gol D. Roger', [(3176, 'Gol D. Roger', 'Équipage de Roger'), (3177, 'Roger, capitaine', 'Équipage de Roger')]),
    (4, 'Katakuri', [(2112, 'Charlotte Katakuri', 'Whole Cake Island'), (2471, 'Katakuri, fruit du Mochi', 'Whole Cake Island'), (2962, 'Katakuri, Haki de l’avenir', 'Whole Cake Island')]),
    (2, 'Bartolomeo', [(1034, 'Bartolomeo', 'Dressrosa'), (1802, 'Bartolomeo, rebelle', 'Dressrosa')]),
    (2, 'Vivi', [(72, 'Nefertari Vivi', 'Alabasta'), (664, 'Vivi, princesse d’Alabasta', 'Alabasta')]),
    (1, 'Kuro', [(46, 'Kuro aux 100 plans', 'East Blue')]),
    (1, 'Don Krieg', [(57, 'Don Krieg', 'East Blue'), (58, 'Don Krieg et sa bombe MH5', 'East Blue')]),
    (4, 'Rayleigh', [(366, 'Silvers Rayleigh', 'Sabaody'), (1977, 'Rayleigh, maître du Haki', 'Sabaody')]),
    (4, 'Marco', [(250, 'Marco', 'Marineford'), (251, 'Marco le Phénix', 'Marineford')]),
    (2, 'Ivankov', [(389, 'Emporio Ivankov', 'Impel Down'), (390, 'Ivankov, reine du Kamabakka', 'Impel Down')]),
    (2, 'Gecko Moria', [(413, 'Gecko Moria', 'Thriller Bark'), (414, 'Moria, Grand Corsaire', 'Thriller Bark')]),
    (2, 'Bon Clay', [(461, 'Bon Clay', 'Impel Down'), (462, 'Bon Clay, roi de l’évasion', 'Impel Down')]),
    (2, 'Crocodile', [(3274, 'Crocodile', 'Alabasta')]),
    (2, 'Coby', [(31, 'Coby', 'East Blue'), (859, 'Coby, Marine', 'Marineford'), (1926, 'Coby, capitaine', 'Pays de Wano')]),
    (3, 'Uta', [(3680, 'Uta', 'One Piece Red'), (3721, 'Uta, Reine du monde d’Uta', 'One Piece Red')]),
    (1, 'Dragon', [(1633, 'Monkey D. Dragon', 'Révolution')]),
]

# ---------- Naruto : illustrations de Naruto Blazing ----------
NAR = [
    (5, 'Naruto Uzumaki', 'Naruto'), (5, 'Sasuke Uchiha', 'Sasuke'), (5, 'Madara Uchiha', 'Madara'), (5, 'Kaguya Otsutsuki', 'Kaguya'),
    (5, 'Hagoromo Otsutsuki', 'Hagoromo'), (5, 'Itachi Uchiha', 'Itachi'), (5, 'Minato Namikaze', 'Minato'),
    (4, 'Kakashi Hatake', 'Kakashi'), (4, 'Obito Uchiha', 'Obito'), (4, 'Hashirama Senju', 'Hashirama'), (4, 'Tobirama Senju', 'Tobirama'),
    (4, 'Jiraiya', 'Jiraiya'), (4, 'Tsunade', 'Tsunade'), (4, 'Orochimaru', 'Orochimaru'), (4, 'Gaara', 'Gaara'), (4, 'Might Guy', 'Gaï Maito'),
    (4, 'Pain (Tendo)', 'Pain'), (4, 'Nagato', 'Nagato'), (4, 'Killer Bee', 'Killer Bee'), (4, 'Indra', 'Indra'), (4, 'Ashura', 'Ashura'),
    (4, 'Shisui Uchiha', 'Shisui'), (4, 'Fourth Raikage: Ay', 'Quatrième Raikage'),
    (3, 'Sakura Haruno', 'Sakura'), (3, 'Rock Lee', 'Rock Lee'), (3, 'Hinata Hyuga', 'Hinata'), (3, 'Neji Hyuga', 'Neji'), (3, 'Shikamaru Nara', 'Shikamaru'),
    (3, 'Kisame Hoshigaki', 'Kisame'), (3, 'Deidara', 'Deidara'), (3, 'Sasori', 'Sasori'), (3, 'Hidan', 'Hidan'), (3, 'Kakuzu', 'Kakuzu'), (3, 'Konan', 'Konan'),
    (3, 'Kabuto Yakushi', 'Kabuto'), (3, 'Zabuza Momochi', 'Zabuza'), (3, 'Hiruzen Sarutobi', 'Hiruzen Sarutobi'), (3, 'Kushina Uzumaki', 'Kushina'),
    (3, 'Kimimaro', 'Kimimaro'), (3, 'Mei Terumi', 'Mei Terumi'), (3, 'Ohnoki', 'Ohnoki'), (3, 'Danzo Shimura', 'Danzo'), (3, 'Tenzo (Yamato)', 'Yamato'),
    (2, 'Sai', 'Saï'), (2, 'Ino Yamanaka', 'Ino'), (2, 'Choji Akimichi', 'Choji'), (2, 'Kiba Inuzuka', 'Kiba'), (2, 'Shino Aburame', 'Shino'),
    (2, 'Tenten', 'Tenten'), (2, 'Temari', 'Temari'), (2, 'Kankuro', 'Kankuro'), (2, 'Haku', 'Haku'), (2, 'Asuma Sarutobi', 'Asuma'),
    (2, 'Kurenai Yuhi', 'Kurenai'), (2, 'Karin', 'Karin'), (2, 'Suigetsu Hozuki', 'Suigetsu'), (2, 'Jugo', 'Jugo'), (2, 'Tayuya', 'Tayuya'),
    (2, 'Kidomaru', 'Kidomaru'), (2, 'Jirobo', 'Jirobo'), (2, 'Konohamaru Sarutobi', 'Konohamaru'), (2, 'Rin Nohara', 'Rin'), (2, 'Chiyo', 'Chiyo'), (2, 'Darui', 'Darui'),
    (1, 'Iruka Umino', 'Iruka'), (1, 'Shizune', 'Shizune'), (1, 'Anko Mitarashi', 'Anko'), (1, 'Ibiki Morino', 'Ibiki'), (1, 'Hayate Gekko', 'Hayate'),
    (1, 'Mizuki', 'Mizuki'), (1, 'Ebisu', 'Ebisu'), (1, 'Kotetsu Hagane', 'Kotetsu'), (1, 'Izumo Kamizuki', 'Izumo'), (1, 'Tsume Inuzuka', 'Tsume'),
    (1, 'Baki', 'Baki'), (1, 'Dosu Kinuta', 'Dosu'), (1, 'Zaku Abumi', 'Zaku'), (1, 'Kin Tsuchi', 'Kin'),
]
NB_BASE = 'https://arosare.github.io/naruto-blazing-revival/'
nb = json.load(open(os.path.join(HERE, 'nb-catalogue.json')))
nb_assets = set(re.findall(r'"([^"]+\.(?:png|webp))"', open(os.path.join(HERE, 'nb-assets.json')).read()))

def nb_forms(name, label, small=False):
    out, seen = [], set()
    for c in nb['all']:
        if c['name'] != name or c['title'] in seen: continue
        img = None
        for f in sorted(c['forms'], key=lambda f: -f['stars']):
            for k in (('portrait', 'clientPortrait') if small else ('card', 'art')):
                p = f.get(k)
                if p and p in nb_assets and (small or ('/icon-' not in p and '/portrait-' not in p)):
                    img = p; break
            if img: break
        if not img: continue
        seen.add(c['title'])
        out.append({'name': label, 'saga': c['title'], 'img': NB_BASE + img, **({'small': 1} if small else {})})
    # Pas de grande illustration : portraits du jeu (plus petits)
    if not out and not small: return nb_forms(name, label, True)
    return out

lines = {'dbz': [], 'naruto': [], 'onepiece': []}
missing = []
for r, forms in DB:
    fs = []
    for label, dname, saga in forms:
        if dname in dimg: fs.append({'name': label, 'saga': saga, 'img': dimg[dname]})
        else: missing.append(('dbz', dname))
    if fs: lines['dbz'].append({'rarity': r, 'forms': fs})

def optc_url(n):
    return f'https://raw.githubusercontent.com/optc-db/optc-db.github.io/master/api/images/full/transparent/{n // 1000}/{(n // 100) % 10}00/{n:04d}.png'
urls = [optc_url(n) for r, _, fs in OP for n, _, _ in fs]
ok = set()
res = subprocess.run(['bash', '-c', 'for u in "$@"; do echo "$(curl -s -o /dev/null -I -m 20 -w "%{http_code}" "$u") $u" & done; wait', '_'] + urls, capture_output=True, text=True)
for line in res.stdout.split('\n'):
    if line.startswith('200 '): ok.add(line[4:])
for r, who, forms in OP:
    fs = []
    for n, label, saga in forms:
        u = optc_url(n)
        if u in ok: fs.append({'name': label, 'saga': saga, 'img': u})
        else: missing.append(('onepiece', n, label))
    if fs: lines['onepiece'].append({'rarity': r, 'forms': fs})

for r, name, label in NAR:
    fs = nb_forms(name, label)
    if len(fs) > 4:
        # Garde la première version et des versions réparties jusqu'à la plus récente
        idx = sorted({0, len(fs) // 3, (2 * len(fs)) // 3, len(fs) - 1})
        fs = [fs[i] for i in idx]
    if fs: lines['naruto'].append({'rarity': r, 'forms': fs})
    else: missing.append(('naruto', name))

import unicodedata
def slug(t):
    t = unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')
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
import collections
print({k: (len(v), sum(len(l['forms']) for l in v), dict(collections.Counter(l['rarity'] for l in v))) for k, v in lines.items()})
print('manquants:', missing)

js = """// Familles Dragon Ball, Naruto et One Piece (formes et transformations par saga).
// Images : Dragon Ball Z Dokkan Battle (wiki Dokkan), Naruto Blazing (naruto-blazing-revival), One Piece Treasure Cruise (optc-db).
// Généré par un script : pour ajouter des personnages, compléter les listes et relancer la génération.
"""
js += 'export const ANIME = ' + json.dumps([
    {'key': 'dbz', 'info': {'name': 'Dragon Ball', 'short': 'Dragon Ball', 'color': '#ff8a00', 'emoji': '🐉'}, 'lines': lines['dbz']},
    {'key': 'naruto', 'info': {'name': 'Naruto', 'short': 'Naruto', 'color': '#ff5a1f', 'emoji': '🍥'}, 'lines': lines['naruto']},
    {'key': 'onepiece', 'info': {'name': 'One Piece', 'short': 'One Piece', 'color': '#e11d48', 'emoji': '🏴‍☠️'}, 'lines': lines['onepiece']},
], ensure_ascii=False, separators=(',', ':')) + ';\n'
open(OUT, 'w').write(js)
print(len(js))
