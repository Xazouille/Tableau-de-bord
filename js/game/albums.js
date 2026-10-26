// Albums à compléter : chaque album complet rapporte une grande box et un titre.
import { LINES } from './roster.js';

const RAW = [
  ['op-equipage', '🏴‍☠️', 'Équipage du Chapeau de paille', 'Pirate au chapeau de paille', ['on-luffy', 'on-zoro', 'on-nami', 'on-usopp', 'on-sanji', 'on-chopper', 'on-nico-robin', 'on-franky', 'on-brook', 'on-jinbe']],
  ['op-empereurs', '👑', 'Les Empereurs', 'Empereur des mers', ['on-shanks-le-roux', 'on-edward-newgate', 'on-kaido', 'on-charlotte-linlin', 'on-marshall-d-teach', 'on-luffy-a-wano']],
  ['op-marine', '⚓', 'Les hauts gradés de la Marine', 'Amiral en chef', ['on-akainu', 'on-kizaru', 'on-aokiji', 'on-fujitora', 'on-sengoku', 'on-monkey-d-garp', 'on-smoker', 'on-coby']],
  ['op-corsaires', '⚔️', 'Les Grands Corsaires', 'Grand Corsaire', ['on-dracule-mihawk', 'on-crocodile', 'on-doflamingo', 'on-boa-hancock', 'on-gecko-moria', 'on-bartholomew-kuma', 'on-trafalgar-law', 'on-jinbe', 'on-marshall-d-teach']],
  ['op-d', '🔥', 'La volonté du D.', 'Héritier du D.', ['on-luffy', 'on-ace', 'on-sabo', 'on-monkey-d-garp', 'on-monkey-d-dragon', 'on-gol-d-roger', 'on-trafalgar-law']],
  ['op-supernovas', '🌟', 'La Pire Génération', 'Supernova', ['on-luffy', 'on-zoro', 'on-trafalgar-law', 'on-eustass-kid', 'on-killer', 'on-jewelry-bonney', 'on-drake', 'on-hawkins', 'on-urouge', 'on-scratchmen-apoo']],
  ['na-equipe7', '🍃', 'L’équipe 7', 'Ninja de l’équipe 7', ['na-naruto', 'na-sasuke', 'na-sakura', 'na-kakashi', 'na-sai', 'na-yamato']],
  ['na-akatsuki', '☁️', 'Akatsuki', 'Membre de l’Akatsuki', ['na-itachi', 'na-kisame', 'na-deidara', 'na-sasori', 'na-hidan', 'na-kakuzu', 'na-pain', 'na-konan', 'na-zetsu', 'na-tobi']],
  ['na-hokage', '🏯', 'Les Hokage', 'Hokage', ['na-hashirama', 'na-tobirama', 'na-hiruzen-sarutobi', 'na-minato', 'na-tsunade', 'na-kakashi']],
  ['na-sannin', '🐸', 'Les Sannin légendaires', 'Sannin légendaire', ['na-jiraiya', 'na-tsunade', 'na-orochimaru']],
  ['na-uchiha', '👁️', 'Le clan Uchiha', 'Héritier Uchiha', ['na-madara', 'na-itachi', 'na-sasuke', 'na-obito', 'na-shisui', 'na-izuna-uchiha', 'na-indra']],
  ['na-jinchuriki', '🦊', 'Les Jinchûriki', 'Jinchûriki', ['na-naruto', 'na-gaara', 'na-killer-bee', 'na-yugito-ni-i', 'na-yagura', 'na-roshi', 'na-han', 'na-utakata', 'na-fu']],
  ['na-konoha', '🍥', 'La relève de Konoha', 'Espoir de Konoha', ['na-naruto', 'na-sasuke', 'na-sakura', 'na-shikamaru', 'na-ino', 'na-choji', 'na-hinata', 'na-kiba', 'na-shino', 'na-rock-lee', 'na-neji', 'na-tenten']],
  ['na-kage', '🎩', 'Les cinq Kage', 'Kage', ['na-gaara-kazekage', 'na-quatrieme-raikage', 'na-mei-terumi', 'na-ohnoki', 'na-tsunade', 'na-hanzo']],
  ['db-saiyans', '🐒', 'Les Saiyans', 'Prince des Saiyans', ['db-goku', 'db-vegeta', 'db-gohan-enfant', 'db-trunks-enfant', 'db-goten', 'db-raditz', 'db-nappa', 'db-bardock', 'db-broly-legendaire', 'db-roi-vegeta', 'db-pan']],
  ['db-fusions', '🤝', 'Les fusions', 'Maître de la fusion', ['db-gotenks', 'db-gogeta', 'db-vegeto', 'db-kefla', 'db-gogeta-ssj4', 'db-vegeto-blue']],
  ['db-freezer', '❄️', 'La famille de Freezer', 'Empereur de l’univers', ['db-freezer', 'db-cooler', 'db-roi-cold', 'db-mecha-freezer', 'db-freezer-ressuscite', 'db-golden-freezer-sorbet']],
  ['db-cyborgs', '🤖', 'Les cyborgs du Dr Gero', 'Création du Dr Gero', ['db-c-16', 'db-c-17', 'db-c-18', 'db-c-13', 'db-c-21', 'db-cell', 'db-c-8']],
  ['db-tournoi', '🏟️', 'Le Tournoi du Pouvoir', 'Champion du Tournoi', ['db-jiren', 'db-toppo', 'db-dyspo', 'db-hit', 'db-caulifla', 'db-kale', 'db-super-c-17', 'db-frost', 'db-ribrianne']],
  ['db-dieux', '🙏', 'Les dieux et les anges', 'Dieu de la destruction', ['db-beerus', 'db-whis', 'db-champa', 'db-vados', 'db-zamasu', 'db-kaio-shin', 'db-marcarita']],
  ['db-mechants', '💥', 'Les grands méchants de DBZ', 'Fléau de l’univers', ['db-freezer', 'db-cell', 'db-boubou', 'db-kid-boo', 'db-janemba', 'db-broly-legendaire', 'db-cooler']],
  ['pk-kanto', '🔥', 'Les starters de Kanto', 'Dresseur de Kanto', ['pk1', 'pk4', 'pk7', 'pk172']],
  ['pk-starters', '🌿', 'Tous les starters', 'Professeur Pokémon', ['pk1', 'pk4', 'pk7', 'pk152', 'pk155', 'pk158', 'pk252', 'pk255', 'pk258', 'pk387', 'pk390', 'pk393']],
  ['pk-oiseaux', '🐦', 'Les légendaires de Kanto', 'Maître de Kanto', ['pk144', 'pk145', 'pk146', 'pk150', 'pk151']],
  ['pk-johto-hoenn', '🌋', 'Les légendaires de Johto et Hoenn', 'Chasseur de légendes', ['pk243', 'pk244', 'pk245', 'pk249', 'pk250', 'pk382', 'pk383', 'pk384']],
  ['pk-sinnoh', '🌌', 'Les légendaires de Sinnoh', 'Élu d’Arceus', ['pk480', 'pk481', 'pk482', 'pk483', 'pk484', 'pk487', 'pk491', 'pk493']],
  ['pk-dragons', '🐲', 'Les pseudo-légendaires', 'Dresseur d’élite', ['pk147', 'pk246', 'pk371', 'pk374', 'pk443']],
];
export const ALBUMS = RAW.map(([id, emoji, name, title, lines]) => ({ id, emoji, name, title, lines: lines.filter(l => LINES[l]) }))
  .filter(a => a.lines.length >= 3);

// Avancement de chaque album selon les familles obtenues
export const albumState = owned => ALBUMS.map(a => {
  const have = a.lines.filter(l => owned[l]).length;
  return { ...a, have, done: have === a.lines.length };
});
