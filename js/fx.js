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
    p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
    p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p.life / 30);
    ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = p.c;
    if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
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
export const buzz = (p = 12) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
