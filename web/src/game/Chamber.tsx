// The proving chamber: first person, hands, dummies, and one canvas.
//
// RENDERING MODEL. All simulation state lives in a single `useRef` mutated by
// one loop; React never re-renders while the chamber is running. The HUD —
// magicka, the dummies' health, the charge read-out — is painted onto the
// canvas rather than laid out in the DOM, because a React state update per
// frame at sixty frames a second is the one thing guaranteed to make this
// stutter, and it would buy nothing a `fillText` does not.
//
// THE CLOCK IS GSAP'S TICKER, not a second requestAnimationFrame. The archive
// already runs GSAP, and two independent rAF loops on one page means two frame
// sources, two deltas, and no way to slow either. Riding the ticker means
// `gsap.globalTimeline.timeScale()` slows the whole chamber for free — which is
// what the misfire beat uses.
//
// The particle field stays hand-rolled arithmetic. See the note in vfx.ts.

import { useEffect, useRef } from 'react';

import gsap from 'gsap';

import {
  type Ruling,
  type Working,
  effectOf,
  misfireChance,
  paletteFor,
} from '../../../shared/spellcraft';
import {
  type Palette,
  type Particle,
  arc,
  bloom,
  burst,
  frostBurst,
  lightHands,
  paintParticles,
  stepParticles,
  strokeArc,
} from './vfx';

import anchors from '../assets/arcane/anchors.json';
import chamberUrl from '../assets/arcane/chamber.webp';
import dummyUrl from '../assets/arcane/dummy.webp';
import handsIdleUrl from '../assets/arcane/hands-idle.webp';
import handsLeftUrl from '../assets/arcane/hands-left.webp';
import handsRightUrl from '../assets/arcane/hands-right.webp';

interface Dummy {
  /** Fractions of the canvas, so the layout survives any window size. */
  fx: number;
  fy: number;
  /*
   * Depth is FAKED with a hand-placed scale. That is fine while the dummies
   * stand still, and it is the first thing that breaks if anything ever moves
   * toward or away from the caster — there is no camera here to ask.
   */
  scale: number;
  hp: number;
  max: number;
  hit: number;
  frost: number;
}

interface Projectile {
  x: number; y: number; tx: number; ty: number;
  t: number; life: number; target: Dummy | null;
  /** Whose working this was, so the impact reads the right one. */
  hand: 'left' | 'right';
}

interface World {
  w: number; h: number;
  charge: number;
  holding: boolean;
  dual: boolean;
  hand: 'idle' | 'left' | 'right';
  /** Which hand's working is being charged. */
  casting: 'left' | 'right';
  /*
   * Where the hands are pointed, in canvas units, eased toward the cursor.
   *
   * Not the cursor itself: hands that snap to the pointer read as a cursor with
   * gloves on. Easing toward it gives them the weight of arms.
   */
  aimX: number; aimY: number;
  cleared: boolean;
  magicka: number;
  magickaMax: number;
  particles: Particle[];
  bolts: { paths: (readonly [number, number])[][]; life: number }[];
  frosts: { x: number; y: number; r: number; life: number }[];
  /** Shockwaves, expanding out of an impact. */
  rings: { x: number; y: number; life: number; max: number; r: number }[];
  shots: Projectile[];
  dummies: Dummy[];
  flash: number;
  shake: number;
  boltClock: number;
  emberClock: number;
  notice: string;
  noticeLife: number;
  casts: number;
  misfires: number;
}

interface Props {
  /** One working per hand, as a mage carries them. */
  workings: { left: Working; right: Working };
  rulings: { left: Ruling; right: Ruling };
  /** Counted by the shell, so the Register survives leaving the chamber. */
  onUnlicensedCast: () => void;
  onPause: () => void;
  paused: boolean;
  /** Raised when the last dummy goes down, so the shell can offer a way on. */
  onCleared: () => void;
  /** Bumped by the shell to stand the dummies back up. */
  resetToken: number;
}

/*
 * MAGICKA REGEN, HALVED AFTER PLAYING IT. The design notes called 0.11 a guess
 * awaiting playtesting, and the playtest was unambiguous: at eleven percent of
 * the pool a second, a modest cast cost about eleven magicka and the pool put
 * seventeen back before the projectile had landed. Magicka was never a
 * constraint — you could not spend it faster than it returned, and the bar sat
 * pinned at full for the whole session.
 *
 * At 0.055 an empty pool takes about eighteen seconds, a modest working costs a
 * few seconds of it, and the biggest ones leave you genuinely waiting.
 */
const MAGICKA_REGEN = 0.055;

/**
 * What fraction of a working's licensed cost is charged to cast it.
 *
 * Raised with the regen above for the same reason: the two numbers only mean
 * anything relative to each other.
 */
const CAST_PRICE = 0.16;

/*
 * The hands sit a little under full frame.
 *
 * At 1.0 they filled the canvas edge to edge and the forearms crowded out the
 * courtyard — in a first-person frame the arms are already most of the picture,
 * and letting them run the full height leaves the chamber nowhere to be. Nine
 * tenths, anchored to the bottom so the arms still leave frame rather than
 * floating in it.
 */
const HAND_SCALE = 0.9;

/*
 * THE GROUND, and why the dummies' vertical position is not a free number.
 *
 * They were placed by hand at first and floated: three targets at three
 * arbitrary heights over a courtyard with one floor. On a fixed camera the
 * ground is a line, and where a thing meets it follows from how near it is —
 * so the only free number per dummy is its scale, and its feet are derived.
 *
 * HORIZON is where the far wall meets the paving; SPAN is how much further down
 * the frame a full-size dummy would stand. Both were read off the background
 * and neither survives a different background, which is the honest limit of a
 * faked perspective — see the note on Dummy.scale.
 */
/*
 * Read off the deployed frame rather than guessed at a second time.
 *
 * The first pair put the dummies well above the paving — they hung at the
 * height of the far wall with clear ground beneath them, which is worse than
 * being too low, because a thing standing slightly wrong reads as a thing
 * standing on nothing. In this courtyard the wall meets the floor around 0.62
 * of the frame and the near paving runs to about 0.88, so a full-size target
 * belongs a good deal further down than 0.72.
 */
const HORIZON = 0.62;
const GROUND_SPAN = 0.26;
const groundAt = (scale: number) => HORIZON + GROUND_SPAN * scale;

function load(src: string): HTMLImageElement {
  const img = new Image();
  img.src = src;
  return img;
}

export function Chamber({
  workings, rulings, onUnlicensedCast, onPause, paused, onCleared, resetToken,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<World | null>(null);
  /*
   * The spell is read from a ref inside the loop rather than closed over, so
   * changing the working between casts does not mean tearing down the ticker
   * and rebuilding the whole chamber.
   */
  const spell = useRef({ workings, rulings });
  spell.current = { workings, rulings };
  const held = useRef(paused);
  held.current = paused;

  useEffect(() => {
    const el = canvas.current;
    if (!el) return undefined;
    const ctx = el.getContext('2d');
    if (!ctx) return undefined;

    const art = {
      chamber: load(chamberUrl),
      dummy: load(dummyUrl),
      idle: load(handsIdleUrl),
      left: load(handsLeftUrl),
      right: load(handsRightUrl),
    };

    // Two offscreen buffers: one to light the hands in isolation, one to
    // collect the effects for the bloom pass.
    const handBuf = document.createElement('canvas');
    const hctx = handBuf.getContext('2d')!;
    const fxBuf = document.createElement('canvas');
    const fctx = fxBuf.getContext('2d')!;
    /*
     * A third buffer, for tinting a struck dummy.
     *
     * THIS IS THE BOX EXPLOSION. The hit flash and the frost were painted as
     * `fillRect` over the dummy's bounding box under `lighter` — which is
     * exactly a rectangle of light, and looked like one: every Destruction
     * impact put a glowing box round the target. A sprite is not its bounding
     * box, so the tint has to be clipped to the pixels the sprite actually
     * painted. Same `source-atop` trick the hands use, in a buffer sized once
     * rather than allocated per frame.
     */
    const tintBuf = document.createElement('canvas');
    const tctx = tintBuf.getContext('2d')!;

    const w: World = {
      w: 0, h: 0,
      charge: 0, holding: false, dual: false, hand: 'idle',
      casting: 'right', aimX: 0, aimY: 0, cleared: false,
      magicka: 220, magickaMax: 220,
      particles: [], bolts: [], frosts: [], rings: [], shots: [],
      /*
       * Pushed to the edges, because the HANDS OWN THE MIDDLE of the frame. At
       * the first placement the outer two stood at 0.26 and 0.75 and were
       * entirely behind the forearms — only their health bars showed, floating
       * over the courtyard with nothing under them.
       *
       * `fy` is derived from `scale` by `groundAt`, not chosen: see above.
       */
      /*
       * ALL THREE IN THE PAVED CORRIDOR, which is narrower than the frame.
       *
       * `groundAt` assumes one receding plane across the whole width, and that
       * is true of the middle of this courtyard and false at its edges: the
       * sides are raised beds and steps, so a dummy at a tenth or a ninth of
       * the width stood at the right height for a floor that is not there and
       * hung in the air over a hedge. The formula is sound; it just only
       * describes the corridor, so that is where the targets go.
       *
       * Which is also where they are visible. The arms own the bottom corners
       * of a first-person frame, and the corridor is exactly the gap between
       * them.
       */
      dummies: [
        { fx: 0.41, fy: groundAt(0.46), scale: 0.46, hp: 100, max: 100, hit: 0, frost: 0 },
        { fx: 0.545, fy: groundAt(0.58), scale: 0.58, hp: 100, max: 100, hit: 0, frost: 0 },
        { fx: 0.68, fy: groundAt(0.44), scale: 0.44, hp: 100, max: 100, hit: 0, frost: 0 },
      ],
      flash: 0, shake: 0, boltClock: 0, emberClock: 0,
      notice: '', noticeLife: 0,
      casts: 0, misfires: 0,
    };
    world.current = w;

    /*
     * A probe, and ONLY while the dev server is running.
     *
     * `import.meta.env.DEV` is a compile-time constant, so this whole block is
     * `if (false)` in a production build and Rollup removes it — the same
     * guarantee the Editor route relies on. It exists because the chamber is a
     * simulation in a ref that React never renders: without a handle on it, a
     * playtest can only look at pixels and guess, and "did that cast take forty
     * health off the middle dummy" is not a question a screenshot answers.
     * Tuning wants it too — the instability ceiling and the regen are still
     * guesses, and they are guessed at against these numbers.
     */
    if (import.meta.env.DEV) {
      (window as unknown as { __chamber?: World }).__chamber = w;
    }

    const pointer = { x: 0, y: 0 };

    const resize = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w.w = rect.width;
      w.h = rect.height;
      el.width = Math.round(rect.width * dpr);
      el.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const buf of [handBuf, fxBuf]) {
        buf.width = Math.round(rect.width * dpr);
        buf.height = Math.round(rect.height * dpr);
      }
      hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    /*
     * Where the hand sprite is drawn — and it MOVES WITH THE AIM.
     *
     * The hands were pinned to the bottom centre, so the caster was a statue
     * throwing spells at wherever the mouse happened to be: nothing connected
     * the aim to the arms. They now slide against the cursor, a long way less
     * than the cursor travels, which is how a first-person view sells arms
     * attached to a body rather than a sprite pasted over a photograph.
     *
     * AIM_X is generous and AIM_Y is not. Swinging the arms sideways reads as
     * turning; sliding them as far vertically reads as the hands falling off
     * the bottom of the screen.
     */
    const AIM_X = 0.075;
    const AIM_Y = 0.035;
    const handRect = () => {
      const hw = w.w * HAND_SCALE;
      const hh = w.h * HAND_SCALE;
      const dx = (w.aimX / w.w - 0.5) * 2 * w.w * AIM_X;
      const dy = (w.aimY / w.h - 0.5) * 2 * w.h * AIM_Y;
      return { x: (w.w - hw) / 2 + dx, y: w.h - hh + dy, w: hw, h: hh };
    };

    /*
     * The fingertip of a hand, in canvas coordinates.
     *
     * Read from anchors.json, which scripts/prepare-arcane.mjs measured off
     * each sprite's own alpha channel. The first version put these at fixed
     * fractions of the canvas and the light came out of the WRIST — a bracelet
     * rather than a spell — and it was wrong differently in each pose, because
     * each pose raises a different hand to a different height. Measured
     * anchors are wrong in none of them.
     */
    const tip = (pose: 'idle' | 'left' | 'right', side: 'left' | 'right'): [number, number] => {
      const key = pose === 'right' ? 'hands-right' : pose === 'left' ? 'hands-left' : 'hands-idle';
      const a = (anchors as Record<string, Record<string, { x: number; y: number } | null>>)[key]?.[side];
      const r = handRect();
      if (!a) return [r.x + r.w * (side === 'left' ? 0.32 : 0.68), r.y + r.h * 0.25];
      // A shade above the measured tip: the anchor is the topmost opaque row,
      // and light gathers just off the fingers rather than inside them.
      return [r.x + a.x * r.w, r.y + a.y * r.h - r.h * 0.015];
    };

    /** The points a charge sits on, for whatever pose is showing. */
    const chargePoints = (): [number, number][] =>
      (w.dual || w.hand === 'idle'
        ? [tip(w.hand, 'left'), tip(w.hand, 'right')]
        : [tip(w.hand, 'right')]);

    const say = (text: string) => { w.notice = text; w.noticeLife = 3.2; };

    /* ── Casting ──────────────────────────────────────────────────── */

    const release = () => {
      if (!w.holding) return;
      w.holding = false;
      const power = w.charge;
      w.charge = 0;
      w.hand = 'idle';
      if (power < 0.12) return;

      const k = spell.current.workings[w.casting];
      const r = spell.current.rulings[w.casting];
      const pal = paletteFor(k.effectId);
      /*
       * THE COST IS CAPPED AT MOST OF THE POOL, and that cap is a design
       * decision rather than a safety clamp.
       *
       * Uncapped, a Master-grade working priced over eighteen hundred costs
       * more magicka than a caster has and simply cannot be cast — the player
       * carries a spell to the chamber, holds, releases, and is told no with no
       * route forward. That is a dead end, not a trade-off. Capped, the biggest
       * workings empty the caster in one throw and leave them waiting on the
       * regen, which is the tension the chamber is actually for.
       */
      const cost = Math.min(w.magickaMax * 0.85, Math.max(4, r.cost * CAST_PRICE));
      if (w.magicka < cost) { say('Not magicka enough. Wait for it to return.'); return; }
      w.magicka -= cost;
      w.casts += 1;

      if (r.seal === 'refused') onUnlicensedCast();

      /*
       * THE MISFIRE. Instability is not a damage modifier — it is a chance the
       * working turns in the hand, which is the whole reason the Office cares
       * about it. It discharges at the palms instead of at the target, costs
       * the caster, and drops the chamber into quarter speed for a beat so the
       * failure is legible rather than merely sudden.
       */
      if (Math.random() < misfireChance(r.instability) * power) {
        w.misfires += 1;
        const [px, py] = tip(w.hand, 'right');
        burst(w.particles, px, py, pal, 90, 340);
        w.bolts.push({ paths: arc(tip(w.hand, 'left'), tip(w.hand, 'right'), 0.34), life: 0.5 });
        w.flash = 1;
        w.shake = 26;
        w.magicka = Math.max(0, w.magicka - cost * 1.5);
        say('The working turned in your hand.');
        gsap.globalTimeline.timeScale(0.25);
        gsap.to(gsap.globalTimeline, { timeScale: 1, duration: 1.1, ease: 'power2.out', overwrite: true });
        return;
      }

      // Nearest dummy to the cursor takes it.
      let best: Dummy | null = null;
      let bestD = Infinity;
      for (const d of w.dummies) {
        if (d.hp <= 0) continue;
        const dist = Math.hypot(d.fx * w.w - pointer.x, d.fy * w.h - pointer.y);
        if (dist < bestD) { bestD = dist; best = d; }
      }

      const pts = chargePoints();
      const from: readonly [number, number] = pts.length > 1
        ? [(pts[0]![0] + pts[1]![0]) / 2, Math.min(pts[0]![1], pts[1]![1])]
        : pts[0]!;
      w.shots.push({
        x: from[0], y: from[1],
        tx: best ? best.fx * w.w : pointer.x,
        ty: best ? best.fy * w.h - 40 : pointer.y,
        t: 0,
        life: 0.28,
        target: best,
        hand: w.casting,
      });
      burst(w.particles, from[0], from[1], pal, 26, 150);
      w.flash = 0.35 * power;
    };

    const impact = (p: Projectile) => {
      const k = spell.current.workings[p.hand];
      const r = spell.current.rulings[p.hand];
      const pal = paletteFor(k.effectId);
      const e = effectOf(k);
      const power = 1;

      /*
       * THE IMPACT IS THE PAYOFF and it was costing eighty particles and a
       * shrug. It now lands in three layers, which is what makes a hit read as
       * an event rather than as a puff: a fast bright core that is gone in a
       * fifth of a second, a slower wide spray, and a ring that expands out of
       * the point of contact.
       */
      if (pal.kind === 'frost') w.frosts.push({ x: p.tx, y: p.ty, r: 52 + k.area * 2.6, life: 1.1 });
      if (pal.kind === 'bolt') {
        w.bolts.push({ paths: arc([p.x, p.y], [p.tx, p.ty], 0.22), life: 0.24 });
        // Discharge legs, thrown outward from the point of contact.
        for (let i = 0; i < 5; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 40 + Math.random() * 70;
          w.bolts.push({
            paths: arc([p.tx, p.ty], [p.tx + Math.cos(a) * r, p.ty + Math.sin(a) * r], 0.3),
            life: 0.16 + Math.random() * 0.12,
          });
        }
      }
      burst(w.particles, p.tx, p.ty, pal, 60, 520 + k.magnitude * 4);
      burst(w.particles, p.tx, p.ty, pal, 90, 190 + k.magnitude * 2);
      w.rings.push({ x: p.tx, y: p.ty, life: 0.42, max: 0.42, r: 90 + k.magnitude * 1.6 });
      w.flash = Math.min(1, 0.45 + k.magnitude / 90);
      w.shake = 12 + k.magnitude * 0.3;

      const heals = e.id === 'heal';
      for (const d of w.dummies) {
        const dist = Math.hypot(d.fx * w.w - p.tx, d.fy * w.h - p.ty);
        // Area is in feet in the fiction and in pixels here; the ratio is a
        // tuning number and nothing more.
        const reach = 26 + k.area * 6;
        if (d !== p.target && dist > reach) continue;
        const falloff = d === p.target ? 1 : Math.max(0.25, 1 - dist / (reach || 1));
        if (heals) d.hp = Math.min(d.max, d.hp + k.magnitude * 0.4 * falloff);
        else d.hp = Math.max(0, d.hp - k.magnitude * 0.55 * falloff * power);
        d.hit = 0.5;
        if (pal.kind === 'frost') d.frost = Math.min(1, d.frost + 0.5 * falloff);
      }
      if (r.seal === 'refused' && w.dummies.every((d) => d.hp <= 0)) {
        say('The chamber is quiet. The Register is not.');
      }
    };

    /* ── The frame ────────────────────────────────────────────────── */

    const step = (dt: number) => {
      if (w.holding) {
        w.charge = Math.min(1, w.charge + dt * 0.85);
        w.hand = w.dual ? 'idle' : 'right';
      }
      // Ease the arms toward the cursor. A tenth of the gap per frame at sixty
      // hertz is about a fifth of a second to arrive: present, not snappy.
      w.aimX += (pointer.x - w.aimX) * Math.min(1, dt * 6);
      w.aimY += (pointer.y - w.aimY) * Math.min(1, dt * 6);
      w.magicka = Math.min(w.magickaMax, w.magicka + w.magickaMax * MAGICKA_REGEN * dt);

      stepParticles(w.particles, dt, 120);

      for (let i = w.shots.length - 1; i >= 0; i--) {
        const p = w.shots[i]!;
        p.t += dt / p.life;
        if (p.t >= 1) { impact(p); w.shots.splice(i, 1); }
      }
      for (let i = w.bolts.length - 1; i >= 0; i--) {
        const b = w.bolts[i]!;
        b.life -= dt;
        if (b.life <= 0) w.bolts.splice(i, 1);
      }
      for (let i = w.frosts.length - 1; i >= 0; i--) {
        const f = w.frosts[i]!;
        f.life -= dt;
        if (f.life <= 0) w.frosts.splice(i, 1);
      }
      for (let i = w.rings.length - 1; i >= 0; i--) {
        const r = w.rings[i]!;
        r.life -= dt;
        if (r.life <= 0) w.rings.splice(i, 1);
      }

      /*
       * A HELD SPELL HAS TO DO SOMETHING. The charge was a radial gradient that
       * grew — which for Flame meant a static orange blob sitting on the
       * fingertips, and it read as anticlimactic because nothing about it moved.
       *
       * Every school now sheds while it gathers: embers climbing off a flame,
       * shards falling out of a frost, motes drawn inward for the rest. It is
       * the same particle field the impact uses, emitted slowly, and it costs
       * almost nothing.
       */
      if (w.holding && w.charge > 0.1) {
        const pal = paletteFor(spell.current.workings[w.casting].effectId);
        w.emberClock += dt;
        const every = 0.03 - w.charge * 0.015;
        while (w.emberClock > every) {
          w.emberClock -= every;
          for (const [px, py] of chargePoints()) {
            const spread = 10 + w.charge * 18;
            const ex = px + (Math.random() - 0.5) * spread;
            const ey = py + (Math.random() - 0.5) * spread;
            if (pal.kind === 'flame') {
              // Embers rise and drift; that is the whole read of fire.
              w.particles.push({
                x: ex, y: ey,
                vx: (Math.random() - 0.5) * 40,
                vy: -60 - Math.random() * 90 - w.charge * 60,
                life: 0, max: 0.4 + Math.random() * 0.5,
                size: 1.4 + Math.random() * 2.4,
                hue: Math.random() < 0.45 ? pal.core : pal.body,
              });
            } else if (pal.kind === 'frost') {
              w.particles.push({
                x: ex, y: ey,
                vx: (Math.random() - 0.5) * 30,
                vy: 20 + Math.random() * 50,
                life: 0, max: 0.5 + Math.random() * 0.5,
                size: 1 + Math.random() * 2,
                hue: Math.random() < 0.5 ? pal.core : pal.body,
              });
            } else if (pal.kind === 'bolt') {
              /*
               * Sparks. Bolts were the one school shedding nothing while held,
               * on the reasoning that the arcs were enough — they are not. A
               * spark is thrown fast, dies fast and falls, which is what makes
               * the arcs look like they are ABLADING off something rather than
               * being drawn in the air.
               */
              const a = Math.random() * Math.PI * 2;
              const sp = 120 + Math.random() * 260 * (0.4 + w.charge);
              w.particles.push({
                x: ex, y: ey,
                vx: Math.cos(a) * sp,
                vy: Math.sin(a) * sp - 40,
                life: 0, max: 0.16 + Math.random() * 0.26,
                size: 0.9 + Math.random() * 1.8,
                hue: Math.random() < 0.6 ? pal.core : pal.body,
              });
            } else {
              // Drawn INWARD: the working is gathering, not shedding.
              const a = Math.random() * Math.PI * 2;
              const r = 40 + Math.random() * 40;
              w.particles.push({
                x: px + Math.cos(a) * r, y: py + Math.sin(a) * r,
                vx: -Math.cos(a) * (60 + Math.random() * 60),
                vy: -Math.sin(a) * (60 + Math.random() * 60),
                life: 0, max: 0.45,
                size: 1 + Math.random() * 1.8,
                hue: pal.body,
              });
            }
          }
        }
      }

      // Regenerate the bolt paths a few times a second so they crackle rather
      // than sit still. Every frame is too busy to read; this is about 24 Hz.
      w.boltClock += dt;
      // 28 Hz rather than 24: the arcs are longer-lived now, so they have to be
      // replaced faster or the stream stops crackling and starts strobing.
      if (w.boltClock > 0.036) {
        w.boltClock = 0;
        if (w.holding && w.charge > 0.18) {
          const pal = paletteFor(spell.current.workings[w.casting].effectId);
          if (pal.kind === 'bolt') {
            w.bolts = w.bolts.filter((b) => b.life < 0.3);
            /*
             * The arc runs BETWEEN the hands, to a wandering knot above their
             * midpoint — not out at a target. Two hands each charging their own
             * separate orb reads as two single casts side by side; one shared
             * knot, with arcs jumping tip to tip past a certain charge, is what
             * makes a two-handed working read as one working.
             */
            const pts = chargePoints();
            const a0 = pts[0]!;
            const a1 = pts[pts.length - 1]!;
            const knot: readonly [number, number] = [
              (a0[0] + a1[0]) / 2 + (Math.random() - 0.5) * 30,
              Math.min(a0[1], a1[1]) - 40 - w.charge * 40 + (Math.random() - 0.5) * 20,
            ];
            /*
             * MORE ARCS, AND THEY OVERLAP. One path replaced every frame reads
             * as a single flicking line; three or four live at once, each
             * outliving its replacement, reads as a stream pouring off the
             * hand. The count rises with the charge, so a held spell visibly
             * gathers rather than merely brightening.
             */
            const strands = 2 + Math.round(w.charge * 3);
            const paths: (readonly [number, number])[][] = [];
            for (let n = 0; n < strands; n++) {
              const wobble: readonly [number, number] = [
                knot[0] + (Math.random() - 0.5) * 26,
                knot[1] + (Math.random() - 0.5) * 26,
              ];
              paths.push(...arc(a0, wobble, 0.22));
              if (pts.length > 1) paths.push(...arc(a1, wobble, 0.22));
            }
            if (pts.length > 1 && w.charge > 0.45) paths.push(...arc(a0, a1, 0.26));
            // Three frames rather than one, so strands overlap instead of
            // replacing each other.
            w.bolts.push({ paths, life: 0.11 });
          }
        }
      }

      for (const d of w.dummies) {
        d.hit = Math.max(0, d.hit - dt * 2);
        d.frost = Math.max(0, d.frost - dt * 0.25);
      }
      /*
       * The end of a round, raised once. Latched rather than tested each frame
       * because `onCleared` sets React state, and firing it sixty times a
       * second would remount the shell under the chamber's feet.
       */
      if (!w.cleared && w.dummies.every((d) => d.hp <= 0)) {
        w.cleared = true;
        onCleared();
      }
      w.flash = Math.max(0, w.flash - dt * 2.4);
      w.shake = Math.max(0, w.shake - dt * 46);
      w.noticeLife = Math.max(0, w.noticeLife - dt);
    };

    const paint = () => {
      const k = spell.current.workings[w.casting];
      const pal: Palette = paletteFor(k.effectId);
      const sx = (Math.random() - 0.5) * w.shake;
      const sy = (Math.random() - 0.5) * w.shake;

      ctx.save();
      ctx.translate(sx, sy);

      // The chamber, covering the canvas whatever its aspect.
      if (art.chamber.complete) {
        const s = Math.max(w.w / art.chamber.width, w.h / art.chamber.height);
        const dw = art.chamber.width * s;
        const dh = art.chamber.height * s;
        ctx.drawImage(art.chamber, (w.w - dw) / 2, (w.h - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = '#120e0b';
        ctx.fillRect(0, 0, w.w, w.h);
      }

      // Dummies, far to near, so the near one overlaps.
      const order = [...w.dummies].sort((a, b) => a.scale - b.scale);
      for (const d of order) {
        if (!art.dummy.complete) break;
        const dh = w.h * 0.52 * d.scale;
        const dw = dh * (art.dummy.width / art.dummy.height);
        const x = d.fx * w.w - dw / 2;
        const y = d.fy * w.h - dh;
        ctx.save();
        if (d.hp <= 0) ctx.globalAlpha = 0.35;
        ctx.drawImage(art.dummy, x, y, dw, dh);
        /*
         * The tint, clipped to the dummy's own shape. See tintBuf above for
         * what this replaced and why it looked like a box.
         */
        const tint = (color: string, alpha: number) => {
          if (alpha <= 0.02) return;
          const bw = Math.max(2, Math.ceil(dw));
          const bh = Math.max(2, Math.ceil(dh));
          if (tintBuf.width !== bw || tintBuf.height !== bh) {
            tintBuf.width = bw;
            tintBuf.height = bh;
          }
          tctx.clearRect(0, 0, bw, bh);
          tctx.globalCompositeOperation = 'source-over';
          tctx.globalAlpha = 1;
          tctx.drawImage(art.dummy, 0, 0, bw, bh);
          tctx.globalCompositeOperation = 'source-atop';
          tctx.fillStyle = color;
          tctx.fillRect(0, 0, bw, bh);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = alpha;
          ctx.drawImage(tintBuf, x, y, dw, dh);
        };
        tint('#bfe9ff', d.frost * 0.55);
        tint(pal.body, d.hit * 0.75);
        ctx.restore();

        // Health, painted rather than laid out.
        const bw = dw * 0.7;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(d.fx * w.w - bw / 2, y - 14, bw, 5);
        ctx.fillStyle = d.hp > 0 ? '#c9a227' : '#5a3c1f';
        ctx.fillRect(d.fx * w.w - bw / 2, y - 14, bw * (d.hp / d.max), 5);
      }

      /* Effects go to their own buffer so the bloom has something to blur. */
      fctx.clearRect(0, 0, w.w, w.h);
      // Heavier core: 1.4 was a wire, and the reference these were built from
      // is a rope of light. The white centre is what carries it.
      for (const b of w.bolts) strokeArc(fctx, b.paths, pal, 2.1);
      for (const f of w.frosts) frostBurst(fctx, f.x, f.y, f.r, pal, 1 - f.life / 0.9);
      for (const p of w.shots) {
        const x = p.x + (p.tx - p.x) * p.t;
        const y = p.y + (p.ty - p.y) * p.t;
        /*
         * A bolt spell does not throw a ball. It stays connected to the hand
         * while it crosses, which is what makes Sparks read as a stream rather
         * than as a thrown pebble that happens to be purple.
         */
        if (paletteFor(spell.current.workings[p.hand].effectId).kind === 'bolt') {
          strokeArc(fctx, arc([p.x, p.y], [x, y], 0.26), pal, 1.8);
        }
        fctx.save();
        fctx.globalCompositeOperation = 'lighter';
        const g = fctx.createRadialGradient(x, y, 0, x, y, 26);
        g.addColorStop(0, pal.core);
        g.addColorStop(0.4, pal.body);
        g.addColorStop(1, 'transparent');
        fctx.fillStyle = g;
        fctx.beginPath();
        fctx.arc(x, y, 26, 0, Math.PI * 2);
        fctx.fill();
        fctx.restore();
      }
      /* The shockwave: a thinning ring, easing out so it slams then settles. */
      for (const r of w.rings) {
        const t = 1 - r.life / r.max;
        const eased = 1 - (1 - t) * (1 - t);
        fctx.save();
        fctx.globalCompositeOperation = 'lighter';
        fctx.globalAlpha = (1 - t) * 0.7;
        fctx.strokeStyle = pal.core;
        fctx.lineWidth = Math.max(0.5, 7 * (1 - t));
        fctx.beginPath();
        fctx.arc(r.x, r.y, eased * r.r, 0, Math.PI * 2);
        fctx.stroke();
        fctx.restore();
      }
      paintParticles(fctx, w.particles);
      ctx.drawImage(fxBuf, 0, 0, w.w, w.h);
      bloom(ctx, fxBuf, w.w, w.h, 0.75);

      /* The hands, lit by the charge, in front of everything. */
      const sprite = w.hand === 'right' ? art.right : w.hand === 'left' ? art.left : art.idle;
      if (sprite.complete) {
        lightHands(hctx, sprite, w.w, w.h, handRect(), chargePoints(), pal, w.charge);
        ctx.drawImage(handBuf, 0, 0, w.w, w.h);
      }

      // The charge orb sits on the MAIN canvas, after the hands, so it reads as
      // light held in front of the fingers rather than behind them.
      if (w.charge > 0.04) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const [px, py] of chargePoints()) {
          // Bigger, and pulsing: a light that is perfectly steady reads as a
          // decal. The wobble is small enough not to be seen as an animation.
          const pulse = 1 + Math.sin(performance.now() / 90) * 0.06;
          const r = (26 + w.charge * 78) * pulse;
          const g = ctx.createRadialGradient(px, py, 0, px, py, r);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.18, '#ffffff');
          g.addColorStop(0.42, pal.body);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();

      if (w.flash > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = w.flash * 0.4;
        ctx.fillStyle = pal.core;
        ctx.fillRect(0, 0, w.w, w.h);
        ctx.restore();
      }

      /* ── HUD ──────────────────────────────────────────────────── */

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(24, w.h - 44, 260, 10);
      ctx.fillStyle = '#5aa0d0';
      ctx.fillRect(24, w.h - 44, 260 * (w.magicka / w.magickaMax), 10);
      ctx.fillStyle = 'rgba(233,222,196,0.85)';
      ctx.font = '11px Georgia, serif';
      ctx.fillText('MAGICKA', 24, w.h - 50);

      ctx.textAlign = 'right';
      ctx.fillText(`Right hand — ${effectOf(spell.current.workings.right).name}`, w.w - 24, w.h - 50);
      ctx.fillText(`Left hand — ${effectOf(spell.current.workings.left).name}`, w.w - 24, w.h - 34);
      ctx.textAlign = 'left';

      if (w.noticeLife > 0) {
        ctx.globalAlpha = Math.min(1, w.noticeLife);
        ctx.fillStyle = '#f0e2bd';
        ctx.font = '16px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(w.notice, w.w / 2, w.h * 0.2);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    };

    const tick = () => {
      if (held.current) return;
      // Clamped so a backgrounded tab does not return and integrate a whole
      // second in one frame, teleporting every projectile past its target.
      const dt = Math.min(gsap.ticker.deltaRatio() / 60, 0.05);
      step(dt);
      paint();
    };
    gsap.ticker.add(tick);

    /* ── Input ────────────────────────────────────────────────────── */

    const at = (ev: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.x = ev.clientX - rect.left;
      pointer.y = ev.clientY - rect.top;
    };
    const down = (ev: PointerEvent) => {
      if (held.current) return;
      at(ev);
      w.holding = true;
      w.dual = ev.shiftKey;
      /*
       * Left button throws the RIGHT hand's working and right button the left
       * hand's, as a mage carries one in each. Shift casts both at once.
       */
      w.casting = ev.button === 2 ? 'left' : 'right';
      w.hand = w.dual ? 'idle' : w.casting;
      el.setPointerCapture(ev.pointerId);
    };
    const move = (ev: PointerEvent) => at(ev);
    // Without this the right button opens the browser's own menu mid-cast.
    const menu = (ev: Event) => ev.preventDefault();
    const up = (ev: PointerEvent) => { at(ev); release(); };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { w.holding = false; w.charge = 0; onPause(); }
    };

    el.addEventListener('contextmenu', menu);
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key);

    return () => {
      if (import.meta.env.DEV) delete (window as unknown as { __chamber?: World }).__chamber;
      gsap.ticker.remove(tick);
      gsap.globalTimeline.timeScale(1);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', key);
      el.removeEventListener('contextmenu', menu);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [onPause, onUnlicensedCast, onCleared]);

  /*
   * Standing the dummies back up, without rebuilding the chamber.
   *
   * A separate effect keyed on the token rather than part of the big one: that
   * effect loads five images, allocates three buffers and registers a ticker,
   * and none of that wants doing again just because somebody asked for another
   * round.
   */
  useEffect(() => {
    const w = world.current;
    if (!w) return;
    for (const d of w.dummies) { d.hp = d.max; d.hit = 0; d.frost = 0; }
    w.cleared = false;
    w.particles.length = 0;
    w.shots.length = 0;
  }, [resetToken]);

  return <canvas ref={canvas} className="slay__canvas" aria-label="The proving chamber" />;
}
