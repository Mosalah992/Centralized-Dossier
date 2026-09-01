// The effects, drawn rather than painted.
//
// Nothing here is a sprite. Lightning is midpoint displacement, frost is
// recursive crystalline growth, flame is a particle field — all three are
// cheaper to compute than to author, and all three look wrong as a short loop
// of hand-drawn frames because what makes them read is that they never repeat.
//
// THE CORE IS WHITE ON EVERY PALETTE, and that is the single most important
// line in this file. An earlier pass put the palette's hue in the brightest
// centre of the bolt and it read as a purple squiggle rather than as light.
// Light is blown out at its centre; the hue survives only in the haze around
// it. Every stroke here therefore runs wide-and-dim to narrow-and-white, and
// all of it composites under `lighter`.

export interface Palette {
  haze: string;
  body: string;
  core: string;
  kind: 'bolt' | 'frost' | 'flame' | 'soft';
}

type Pt = readonly [number, number];

/* ── Lightning ───────────────────────────────────────────────────────── */

/**
 * Midpoint displacement: split the segment, push the midpoint off the
 * perpendicular by a random amount, recurse with half the offset.
 *
 * Depth is capped rather than left to the offset alone because the recursion
 * doubles each level — an uncapped bolt across a wide canvas is thousands of
 * points and the cost lands on every frame.
 */
export function displace(a: Pt, b: Pt, offset: number, chaos: number, depth = 0): Pt[] {
  if (offset < 3 || depth > 6) return [a, b];
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const nx = -(b[1] - a[1]);
  const ny = b[0] - a[0];
  const len = Math.hypot(nx, ny) || 1;
  const d = (Math.random() - 0.5) * offset * (chaos / 0.2);
  const mid: Pt = [mx + (nx / len) * d, my + (ny / len) * d];
  const left = displace(a, mid, offset / 2, chaos, depth + 1);
  const right = displace(mid, b, offset / 2, chaos, depth + 1);
  return [...left, ...right.slice(1)];
}

/** A trunk and its forks. Forks are shorter, and die sooner. */
export function arc(a: Pt, b: Pt, chaos: number): Pt[][] {
  const spread = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.42;
  const trunk = displace(a, b, spread, chaos);
  const paths = [trunk];

  for (let i = 1; i < trunk.length - 1; i++) {
    // About one vertex in eight throws a fork. Enough to look electrical,
    // few enough that the bolt still reads as one line.
    if (Math.random() > 0.13) continue;
    const from = trunk[i]!;
    const away = trunk[Math.min(trunk.length - 1, i + 2)]!;
    const dx = (away[0] - from[0]) * 0.7;
    const dy = (away[1] - from[1]) * 0.7;
    const ang = (Math.random() - 0.5) * 1.5;
    const to: Pt = [
      from[0] + dx * Math.cos(ang) - dy * Math.sin(ang),
      from[1] + dx * Math.sin(ang) + dy * Math.cos(ang),
    ];
    paths.push(displace(from, to, spread * 0.35, chaos));
  }
  return paths;
}

/**
 * Four passes, widest and dimmest first, ending on the near-white core.
 *
 * Drawn as four separate strokes of the same path rather than one stroke with a
 * shadow, because a shadow blurs symmetrically and this needs the bright centre
 * to be genuinely narrower than the glow around it.
 */
export function strokeArc(ctx: CanvasRenderingContext2D, paths: Pt[][], pal: Palette, core: number) {
  const passes: [string, number, number][] = [
    [pal.haze, 9 * core, 0.35],
    [pal.body, 4.5 * core, 0.5],
    [pal.body, 2.2 * core, 0.85],
    [pal.core, 1.5 * core, 0.95],
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [color, width, alpha] of passes) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    for (const path of paths) {
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(path[0]![0], path[0]![1]);
      for (let i = 1; i < path.length; i++) ctx.lineTo(path[i]![0], path[i]![1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* ── Frost ───────────────────────────────────────────────────────────── */

/**
 * Crystalline growth rather than turbulence.
 *
 * Frost is the one effect that is NOT a particle problem: ice does not billow,
 * it branches, at a narrowing angle, thinning as it goes. Recursion with a
 * decreasing spread is the whole model.
 */
export function frostBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  len: number,
  depth: number,
  pal: Palette,
  reveal: number,
) {
  if (depth <= 0 || len < 2) return;
  const grown = len * Math.min(1, reveal * 1.6);
  const ex = x + Math.cos(angle) * grown;
  const ey = y + Math.sin(angle) * grown;

  ctx.strokeStyle = depth > 2 ? pal.body : pal.core;
  ctx.lineWidth = Math.max(0.5, depth * 0.7);
  ctx.globalAlpha = 0.35 + depth * 0.1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  if (reveal < 0.35) return;
  const spread = 0.5 + depth * 0.06;
  frostBranch(ctx, ex, ey, angle - spread, len * 0.62, depth - 1, pal, reveal);
  frostBranch(ctx, ex, ey, angle + spread, len * 0.62, depth - 1, pal, reveal);
  if (depth > 3) frostBranch(ctx, ex, ey, angle, len * 0.7, depth - 1, pal, reveal);
}

export function frostBurst(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pal: Palette, reveal: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  const arms = 7;
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + reveal * 0.4;
    frostBranch(ctx, x, y, a, r, 5, pal, reveal);
  }
  ctx.restore();
}

/* ── Particles ───────────────────────────────────────────────────────── */

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number; hue: string;
}

/**
 * Hand-rolled, and staying that way.
 *
 * A cast spawns up to a hundred and forty of these, each living under about a
 * second. Handing them to a tween engine would mean allocating and collecting
 * a hundred and forty tween objects per cast for no gain — they are not easing
 * toward anything, they are integrating. Particle systems are the one case
 * where the arithmetic beats the library outright.
 */
export function burst(into: Particle[], x: number, y: number, pal: Palette, count: number, speed: number) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.35 + Math.random() * 0.65);
    into.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0,
      max: 0.35 + Math.random() * 0.75,
      size: 1 + Math.random() * 2.6,
      hue: Math.random() < 0.3 ? pal.core : pal.body,
    });
  }
}

export function stepParticles(ps: Particle[], dt: number, gravity: number) {
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]!;
    p.life += dt;
    if (p.life >= p.max) { ps.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += gravity * dt;
    p.vx *= 0.985;
  }
}

export function paintParticles(ctx: CanvasRenderingContext2D, ps: Particle[]) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of ps) {
    const t = 1 - p.life / p.max;
    ctx.globalAlpha = t * t;
    ctx.fillStyle = p.hue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ── Bloom ───────────────────────────────────────────────────────────── */

/**
 * Draw the effects buffer back over the scene twice, blurred, under `lighter`.
 *
 * Half resolution is not a compromise here — the buffer is about to be blurred
 * by seventeen pixels, so the detail being thrown away is detail the blur would
 * have destroyed anyway. It is the cheapest part of the frame and it is doing
 * most of the work: turn it off and the bolts stop looking bright and start
 * looking drawn.
 */
export function bloom(ctx: CanvasRenderingContext2D, buffer: HTMLCanvasElement, w: number, h: number, amount: number) {
  if (amount <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = amount * 0.75;
  ctx.filter = 'blur(5px)';
  ctx.drawImage(buffer, 0, 0, w, h);
  ctx.globalAlpha = amount * 0.55;
  ctx.filter = 'blur(17px)';
  ctx.drawImage(buffer, 0, 0, w, h);
  ctx.filter = 'none';
  ctx.restore();
}

/* ── Hand lighting ───────────────────────────────────────────────────── */

/**
 * Light the hands from the charge, clipped strictly to painted pixels.
 *
 * `source-atop` is what makes this work: the gradient is laid over the whole
 * offscreen canvas but only survives where the sprite already put something, so
 * the glow lands on the gauntlet and not on the air beside it. Drawn to an
 * offscreen buffer rather than the main canvas because the clip has to be
 * against the HANDS alone, not against the chamber behind them.
 */
export function lightHands(
  octx: CanvasRenderingContext2D,
  sprite: CanvasImageSource,
  w: number,
  h: number,
  rect: { x: number; y: number; w: number; h: number },
  points: readonly Pt[],
  pal: Palette,
  charge: number,
) {
  octx.clearRect(0, 0, w, h);
  octx.globalCompositeOperation = 'source-over';
  octx.globalAlpha = 1;
  // A rect rather than the whole canvas: the hands are drawn a little under
  // full size and anchored to the bottom, so the fingertip anchors have to be
  // mapped through the same rect or the light lands somewhere else entirely.
  octx.drawImage(sprite, rect.x, rect.y, rect.w, rect.h);

  if (charge <= 0.01) return;
  octx.globalCompositeOperation = 'source-atop';
  for (const [px, py] of points) {
    const r = 70 + 210 * charge;
    const g = octx.createRadialGradient(px, py, 0, px, py, r);
    // Pure white at the palm and the palette only further out: a tinted centre
    // reads as a coloured glove rather than as a hand holding a light.
    g.addColorStop(0, `rgba(255,255,255,${0.25 + 0.7 * charge})`);
    g.addColorStop(0.35, pal.body);
    g.addColorStop(1, 'transparent');
    octx.fillStyle = g;
    octx.globalAlpha = Math.min(1, 0.5 + charge * 0.5);
    octx.fillRect(0, 0, w, h);
  }
  octx.globalCompositeOperation = 'source-over';
  octx.globalAlpha = 1;
}
