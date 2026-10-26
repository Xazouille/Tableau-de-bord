// Effets : confettis, petites explosions de couleur, vibrations.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const PALETTE = ['#ff4fa3', '#9b6bff', '#4f8cff', '#14c8c8', '#22c55e', '#f5b700', '#ff8a3d', '#ff5a5f'];

let canvas, ctx, parts = [], raf = 0;
function ensure() {
  if (canvas) return;
  canvas = document.createElement('canvas');
  canvas.className = 'fx';
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
  const size = () => { const r = devicePixelRatio || 1; canvas.width = innerWidth * r; canvas.height = innerHeight * r; ctx.setTransform(r, 0, 0, r, 0, 0); };
  size(); addEventListener('resize', size);
}
function loop() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 40);
  for (const p of parts) {
    if (p.seek) {
      // Particule aspirée vers un point (charge de l'invocation)
      const dx = p.tx - p.x, dy = p.ty - p.y;
      p.vx = p.vx * 0.84 + dx * 0.08; p.vy = p.vy * 0.84 + dy * 0.08;
      if (dx * dx + dy * dy < 80) p.life = Math.min(p.life, 3);
    } else { p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; }
    p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    if (p.glow) ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    if (p.star) {
      const s = p.s;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const r = i % 2 ? s * 0.22 : s; const a = (Math.PI / 4) * i; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill();
    } else if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
    else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
    ctx.restore();
  }
  raf = parts.length ? requestAnimationFrame(loop) : 0;
}
const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

// Grande pluie de confettis (journée parfaite, objectif atteint…)
export function confetti(n = 160) {
  if (reduce.matches) return;
  ensure();
  for (let i = 0; i < n; i++) {
    const fromLeft = i % 2 === 0;
    parts.push({
      x: fromLeft ? -10 : innerWidth + 10, y: innerHeight * (0.45 + Math.random() * 0.3),
      vx: (fromLeft ? 1 : -1) * (6 + Math.random() * 9), vy: -(9 + Math.random() * 10),
      g: 0.32, drag: 0.985, s: 7 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: PALETTE[i % PALETTE.length], life: 160 + Math.random() * 60, round: Math.random() < 0.3,
    });
  }
  start();
}
// Petite explosion autour d'un élément (case cochée)
export function burst(el, color) {
  if (reduce.matches || !el) return;
  ensure();
  const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  for (let i = 0; i < 22; i++) {
    const a = (Math.PI * 2 * i) / 22 + Math.random() * 0.3, v = 3 + Math.random() * 4;
    parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, g: 0.12, drag: 0.94, s: 4 + Math.random() * 5,
      rot: 0, vr: 0.2, c: i % 3 ? color : PALETTE[i % PALETTE.length], life: 50 + Math.random() * 20, round: true });
  }
  start();
}
// Explosion de lumière (ouverture d'une box, carte rare retournée)
export function burstAt(x, y, colors, n = 80, power = 1) {
  if (reduce.matches) return;
  ensure();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = (2.5 + Math.random() * 8) * power, kind = Math.random();
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2 * power, g: 0.13, drag: 0.955, s: kind < 0.35 ? 7 + Math.random() * 7 : 3 + Math.random() * 6,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[i % colors.length], life: 45 + Math.random() * 45,
      star: kind < 0.35, round: kind >= 0.35 && kind < 0.8, glow: true });
  }
  start();
}
// Particules aspirées vers un point (la box se charge d'énergie)
export function implode(x, y, color, n = 24) {
  if (reduce.matches) return;
  ensure();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 110 + Math.random() * 110;
    parts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: -Math.sin(a) * 3, vy: Math.cos(a) * 3, tx: x, ty: y, seek: true,
      s: 3 + Math.random() * 5, rot: 0, vr: 0.2, c: i % 4 ? color : '#ffffff', life: 60, round: i % 3 !== 0, star: i % 3 === 0, glow: true });
  }
  start();
}
export const buzz = (p = 12) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

// Texte qui s'envole au-dessus d'un élément (« +15 XP », « ⚔️ −30 » pour les dégâts au boss)
export function floatText(el, text, cls = '') {
  if (!el) return;
  const r = el.getBoundingClientRect(), dmg = cls === 'dmg';
  const t = document.createElement('div');
  t.className = 'float-xp ' + cls;
  t.textContent = text;
  t.style.left = r.left + r.width * (dmg ? 0.72 : 0.5) + 'px';
  t.style.top = r.top + (dmg ? 34 : 10) + 'px';
  if (dmg) t.style.animationDelay = '.18s';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1500);
}

// Bulle de dialogue au-dessus (ou en dessous) d'un élément : le compagnon parle
let bubble = null, bubbleTimer = 0;
export function speech(el, text) {
  if (!el) return;
  if (bubble) bubble.remove();
  const r = el.getBoundingClientRect(), b = document.createElement('div');
  b.className = 'speech';
  b.textContent = text;
  b.style.maxWidth = Math.min(270, innerWidth - 24) + 'px';
  document.body.appendChild(b);
  const bw = b.offsetWidth, cx = r.left + r.width / 2;
  const x = Math.max(12, Math.min(innerWidth - bw - 12, cx - bw / 2));
  const above = r.top > b.offsetHeight + 30;
  b.style.left = x + 'px';
  b.style.top = (above ? r.top - b.offsetHeight - 12 : r.bottom + 12) + 'px';
  b.style.setProperty('--tx', Math.max(16, Math.min(bw - 16, cx - x)) + 'px');
  b.classList.add(above ? 'above' : 'below');
  requestAnimationFrame(() => b.classList.add('in'));
  bubble = b;
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => { b.classList.remove('in'); setTimeout(() => b.remove(), 300); if (bubble === b) bubble = null; }, 3800);
}
