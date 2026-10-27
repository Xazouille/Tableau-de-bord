// Apparence : thèmes complets (couleurs, polices, arrondis, en clair et en sombre) et dispositions de l'écran.
// Chaque thème garde sa propre disposition. Le choix se fait dans Réglages, avec un aperçu de chaque.
import { S } from './store.js';

const SHADOW_L = c => `0 1px 2px rgba(${c},.05),0 8px 24px rgba(${c},.08)`;
const SHADOW_D = '0 1px 0 rgba(255,255,255,.03) inset,0 10px 30px rgba(0,0,0,.28)';
const LINES_L = c => ({ line: `rgba(${c},.09)`, line2: `rgba(${c},.16)`, cell0: `rgba(${c},.07)`, shadow: SHADOW_L(c) });
const LINES_D = { line: 'rgba(255,255,255,.07)', line2: 'rgba(255,255,255,.14)', cell0: 'rgba(255,255,255,.06)', shadow: SHADOW_D };
const NUNITO = '"Nunito",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

// fonts : familles Google Fonts à charger ; base : tokens communs aux deux modes
export const UIS = [
  { id: 'neon', name: 'Néon', desc: 'Violet, rose et orange : l’original', fonts: [],
    base: { r: '22px', 'r-sm': '14px', head: '"Fredoka","Nunito",system-ui,sans-serif', sans: NUNITO },
    light: { bg: '#f3f1ff', 'bg-a': '#e6e0ff', 'bg-b': '#ffe3f1', card: '#ffffff', card2: '#f6f4ff', text: '#1c1640', muted: '#6b6690', faint: '#a19cc0', accent: '#6d4aff', accent2: '#ff3d97',
      grad: 'linear-gradient(135deg,#7c5cff 0%,#c34dff 45%,#ff4fa3 75%,#ff9a3d 100%)', 'lv-bg': 'linear-gradient(135deg,#2a1a66 0%,#4b1d8f 55%,#7a1f86 100%)', ...LINES_L('40,25,110') },
    dark: { bg: '#0e0b1f', 'bg-a': '#2a1a66', 'bg-b': '#4a1240', card: '#191433', card2: '#221b45', text: '#f4f1ff', muted: '#a8a3cc', faint: '#6f6a99', accent: '#9b7bff', accent2: '#ff5aa8', ...LINES_D } },
  { id: 'ocean', name: 'Océan', desc: 'Bleu profond et turquoise, calme', fonts: ['Quicksand:wght@500;600;700'],
    base: { r: '24px', 'r-sm': '16px', head: '"Quicksand","Nunito",system-ui,sans-serif', sans: NUNITO },
    light: { bg: '#eef6fb', 'bg-a': '#cfe8f6', 'bg-b': '#d3f3ec', card: '#ffffff', card2: '#eff7fb', text: '#0d2a3a', muted: '#557386', faint: '#93aab8', accent: '#0b7fb8', accent2: '#0f9e8d',
      grad: 'linear-gradient(135deg,#0ea5e9 0%,#0891b2 45%,#14b8a6 75%,#5eead4 100%)', 'lv-bg': 'linear-gradient(135deg,#0b3954 0%,#0e5a7a 55%,#0f766e 100%)', ...LINES_L('10,60,90') },
    dark: { bg: '#06141d', 'bg-a': '#0b3550', 'bg-b': '#083b37', card: '#0d2230', card2: '#12303f', text: '#e6f4fa', muted: '#8fb3c4', faint: '#5b7d8d', accent: '#38bdf8', accent2: '#2dd4bf', ...LINES_D } },
  { id: 'foret', name: 'Forêt', desc: 'Vert mousse et bois, apaisant', fonts: ['Lexend:wght@500;600;700'],
    base: { r: '20px', 'r-sm': '13px', head: '"Lexend","Nunito",system-ui,sans-serif', sans: NUNITO },
    light: { bg: '#f1f5ec', 'bg-a': '#d9eacb', 'bg-b': '#efe4cc', card: '#fffefb', card2: '#f2f6ed', text: '#1f2a1a', muted: '#5f6f55', faint: '#9aa891', accent: '#2f7d32', accent2: '#b26b14',
      grad: 'linear-gradient(135deg,#166534 0%,#16a34a 45%,#84cc16 75%,#eab308 100%)', 'lv-bg': 'linear-gradient(135deg,#14341c 0%,#1f5130 55%,#3f5a1a 100%)', ...LINES_L('30,50,20') },
    dark: { bg: '#0b130c', 'bg-a': '#1a3a20', 'bg-b': '#3a2f12', card: '#142016', card2: '#1b2b1d', text: '#eaf3e4', muted: '#9db394', faint: '#63765b', accent: '#6ccf6f', accent2: '#e0a940', ...LINES_D } },
  { id: 'sakura', name: 'Sakura', desc: 'Rose pâle et lilas, tout doux', fonts: ['Comfortaa:wght@500;600;700'],
    base: { r: '26px', 'r-sm': '18px', head: '"Comfortaa","Nunito",system-ui,sans-serif', sans: NUNITO },
    light: { bg: '#fff4f7', 'bg-a': '#ffdbe7', 'bg-b': '#f0e0ff', card: '#ffffff', card2: '#fff5f8', text: '#3a1a2a', muted: '#8a6276', faint: '#c09aac', accent: '#d0246f', accent2: '#9b4ae8',
      grad: 'linear-gradient(135deg,#f472b6 0%,#ec4899 45%,#d65ee8 75%,#fb8fa0 100%)', 'lv-bg': 'linear-gradient(135deg,#5b1a3f 0%,#8a2557 55%,#6b2a8a 100%)', ...LINES_L('120,30,70') },
    dark: { bg: '#1a0d14', 'bg-a': '#4a1430', 'bg-b': '#33164a', card: '#26131d', card2: '#311925', text: '#ffeef5', muted: '#d1a3b8', faint: '#8a6576', accent: '#f472b6', accent2: '#c084fc', ...LINES_D } },
  { id: 'braise', name: 'Braise', desc: 'Orange et or, énergie de combat', fonts: ['Chakra+Petch:wght@500;600;700'],
    base: { r: '16px', 'r-sm': '10px', head: '"Chakra Petch","Nunito",system-ui,sans-serif', sans: NUNITO },
    light: { bg: '#fff7ed', 'bg-a': '#ffdfb8', 'bg-b': '#ffd9cc', card: '#ffffff', card2: '#fff5ea', text: '#2b1607', muted: '#8a6a52', faint: '#c2a58f', accent: '#d9480f', accent2: '#d42a2a',
      grad: 'linear-gradient(135deg,#f59e0b 0%,#f97316 45%,#ef4444 75%,#facc15 100%)', 'lv-bg': 'linear-gradient(135deg,#3b1406 0%,#7c2d12 55%,#9a3412 100%)', ...LINES_L('90,40,10') },
    dark: { bg: '#140904', 'bg-a': '#4a1d06', 'bg-b': '#4a0e0e', card: '#22120a', card2: '#2d180d', text: '#fff3e6', muted: '#d2a98a', faint: '#8f6b52', accent: '#fb923c', accent2: '#f87171', ...LINES_D } },
  { id: 'minuit', name: 'Minuit', desc: 'Sobre et mat, bleu nuit', fonts: ['Sora:wght@500;600;700', 'Manrope:wght@400;600;700;800'],
    base: { r: '14px', 'r-sm': '10px', head: '"Sora","Manrope",system-ui,sans-serif', sans: '"Manrope",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
    light: { bg: '#eef1f5', 'bg-a': '#e2e7ef', 'bg-b': '#e7e5f0', card: '#ffffff', card2: '#f4f6f9', text: '#1b2230', muted: '#5d6779', faint: '#9aa3b2', accent: '#4458c4', accent2: '#7c4ddb',
      grad: 'linear-gradient(135deg,#4c63d2 0%,#6366f1 50%,#8b5cf6 100%)', 'lv-bg': 'linear-gradient(135deg,#1e2638 0%,#2c3654 100%)', ...LINES_L('20,30,50') },
    dark: { bg: '#0b0f17', 'bg-a': '#121a2b', 'bg-b': '#141427', card: '#121826', card2: '#182030', text: '#e5e9f0', muted: '#8b95a7', faint: '#5a6476', accent: '#7aa2f7', accent2: '#bb9af7',
      grad: 'linear-gradient(135deg,#3b4b7a 0%,#4f5d95 50%,#6b5b95 100%)', 'lv-bg': 'linear-gradient(135deg,#151c2c 0%,#1d2740 100%)', ...LINES_D, shadow: '0 1px 0 rgba(255,255,255,.03) inset,0 6px 18px rgba(0,0,0,.3)' } },
  { id: 'papier', name: 'Papier', desc: 'Noir sur blanc, comme un carnet', fonts: ['Fraunces:opsz,wght@9..144,600;9..144,700', 'Source+Sans+3:wght@400;600;700;800'],
    base: { r: '10px', 'r-sm': '8px', head: '"Fraunces",Georgia,serif', sans: '"Source Sans 3",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif' },
    light: { bg: '#f7f5f0', 'bg-a': '#f7f5f0', 'bg-b': '#f7f5f0', card: '#fffdf8', card2: '#f1eee6', text: '#1d1a14', muted: '#6b655a', faint: '#a39d90', accent: '#1d1a14', accent2: '#c2410c',
      grad: 'linear-gradient(135deg,#2b2620 0%,#3d362d 100%)', 'lv-bg': 'linear-gradient(135deg,#1d1a14 0%,#2b2620 100%)',
      line: 'rgba(30,25,15,.13)', line2: 'rgba(30,25,15,.24)', cell0: 'rgba(30,25,15,.08)', shadow: '0 1px 0 rgba(30,25,15,.06)' },
    dark: { bg: '#131210', 'bg-a': '#131210', 'bg-b': '#131210', card: '#1b1a17', card2: '#23211d', text: '#f1ece2', muted: '#a8a196', faint: '#6d685f', accent: '#f1ece2', accent2: '#fb923c',
      grad: 'linear-gradient(135deg,#34312b 0%,#45413a 100%)', 'lv-bg': 'linear-gradient(135deg,#24221e 0%,#302d28 100%)',
      line: 'rgba(255,250,240,.09)', line2: 'rgba(255,250,240,.18)', cell0: 'rgba(255,250,240,.07)', shadow: 'none' } },
  { id: 'gameboy', name: 'Game Boy', desc: 'Rétro : 4 nuances de vert et police pixel', fonts: ['Pixelify+Sans:wght@500;600;700'],
    base: { r: '6px', 'r-sm': '4px', head: '"Pixelify Sans","Nunito",system-ui,sans-serif', sans: NUNITO },
    light: { bg: '#c4cfa1', 'bg-a': '#b2c08c', 'bg-b': '#c4cfa1', card: '#d5dfb2', card2: '#c8d3a3', text: '#0f380f', muted: '#306230', faint: '#5f7d43', accent: '#306230', accent2: '#0f380f',
      grad: 'linear-gradient(135deg,#306230 0%,#4b7a2f 100%)', 'lv-bg': 'linear-gradient(135deg,#0f380f 0%,#306230 100%)',
      line: 'rgba(15,56,15,.2)', line2: 'rgba(15,56,15,.35)', cell0: 'rgba(15,56,15,.12)', shadow: '3px 3px 0 rgba(15,56,15,.3)' },
    dark: { bg: '#0f1a0f', 'bg-a': '#16281a', 'bg-b': '#0f1a0f', card: '#1a2e1a', card2: '#213a21', text: '#c6e28a', muted: '#8bac0f', faint: '#4f6b2a', accent: '#9bbc0f', accent2: '#8bac0f',
      grad: 'linear-gradient(135deg,#306230 0%,#4b7a2f 100%)', 'lv-bg': 'linear-gradient(135deg,#0f380f 0%,#306230 100%)',
      line: 'rgba(155,188,15,.14)', line2: 'rgba(155,188,15,.26)', cell0: 'rgba(155,188,15,.1)', shadow: '3px 3px 0 rgba(0,0,0,.4)' } },
];

export const LAYOUTS = [
  { id: 'classique', name: 'Classique', desc: 'Grandes cases sur 2 colonnes' },
  { id: 'liste', name: 'Liste', desc: 'Une ligne par case, plus compact' },
  { id: 'mosaique', name: 'Mosaïque', desc: 'Petites cases sur 3 colonnes : tout d’un coup d’œil' },
  { id: 'epuree', name: 'Épurée', desc: 'Liste sans boss ni rappels, sans ombres : juste l’essentiel' },
];

export const uiOf = id => UIS.find(u => u.id === id) || UIS[0];
export const curUI = () => uiOf(S.settings.ui).id;
export const curLayout = (id = curUI()) => ((S.settings.layouts || {})[id] && LAYOUTS.some(l => l.id === S.settings.layouts[id])) ? S.settings.layouts[id] : 'classique';
// Mode affiché : réglage Clair / Sombre, sinon celui du téléphone
export const isDark = () => S.settings.theme === 'dark' || (S.settings.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
// Tokens complets d'un thème dans un mode (le sombre reprend ce que le clair définit et qu'il ne redéfinit pas)
export const tokensOf = (u, dark = isDark()) => ({ ...u.base, ...u.light, ...(dark ? u.dark : {}) });

const vars = t => Object.entries(t).map(([k, v]) => `--${k}:${v}`).join(';');
function css() {
  return UIS.filter(u => u.id !== 'neon').map(u => {
    const id = `[data-ui="${u.id}"]`, d = vars({ ...u.light, ...u.dark });
    return `:root${id}{${vars({ ...u.base, ...u.light })};color-scheme:light}
@media (prefers-color-scheme: dark){:root${id}:not([data-theme="light"]){${d};color-scheme:dark}}
:root${id}[data-theme="dark"]{${d};color-scheme:dark}`;
  }).join('\n');
}
const fontsDone = new Set();
export function loadFonts(list) {
  const todo = list.flatMap(u => u.fonts).filter(f => !fontsDone.has(f));
  if (!todo.length) return;
  todo.forEach(f => fontsDone.add(f));
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?${todo.map(f => 'family=' + f).join('&')}&display=swap`;
  document.head.appendChild(l);
}
let injected = false;
export function applyUI() {
  if (!injected) { const st = document.createElement('style'); st.id = 'ui-themes'; st.textContent = css(); document.head.appendChild(st); injected = true; }
  const de = document.documentElement, id = curUI(), lay = curLayout(id);
  if (de.dataset.ui !== id) { de.dataset.ui = id; loadFonts([uiOf(id)]); }
  if (de.dataset.layout !== lay) de.dataset.layout = lay;
}

// Aperçu miniature : un écran d'accueil dessiné avec les couleurs du thème et la disposition donnée
const TILE_C = ['#4f8cff', '#ff5a5f', '#22c55e', '#f5b700', '#14c8c8', '#9b6bff', '#ff8a3d', '#ff4fa3', '#6c7bff'];
export function preview(u, layout, dark = isDark()) {
  const t = tokensOf(u, dark), n = layout === 'mosaique' ? 9 : layout === 'classique' ? 6 : 4;
  const st = ['bg', 'bg-a', 'bg-b', 'card', 'card2', 'text', 'muted', 'line', 'grad', 'lv-bg', 'r', 'head', 'shadow'].map(k => `--p-${k}:${String(t[k] || 'transparent').replace(/"/g, "'")}`).join(';');
  const tiles = Array.from({ length: n }, (_, i) => `<i class="${i % 3 === 0 ? 'on' : ''}" style="--tc:${TILE_C[i]}"><b></b><s></s></i>`).join('');
  return `<span class="pv pv-${layout} ${dark ? 'pv-dark' : ''}" style="${st}" aria-hidden="true">
    <span class="pv-lv"><i></i><em>Niv. 9</em><s></s></span>
    <span class="pv-hero"><i></i><span><s></s><s></s></span></span>
    ${layout === 'epuree' ? '' : '<span class="pv-boss"></span>'}
    <span class="pv-tiles">${tiles}</span>
    <span class="pv-nav"><i></i><i></i><i></i><i></i></span></span>`;
}
