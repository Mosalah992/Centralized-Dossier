// A candle's flame, drawn live: one quad and a fragment shader, in three.js.
//
// Imported only by Candle.tsx, and only dynamically, so three.js arrives in a
// chunk of its own after the room is up and never in the entry or room chunk
// (test/bundle.test.ts). Each candle lights its own small canvas; the render
// loop runs only while the candle is on screen and the tab is visible.
//
// The flame is a teardrop bent by drifting noise, white at the core through
// amber to a deep orange edge with a breath of blue at the wick, and a soft
// halo about it. Its brightness is handed back each frame (`onGlow`) so the
// candle's CSS glow on the wall flickers with it.

import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

export interface Flame {
  /** Pause or resume the render loop (off screen, hidden tab). */
  setRunning(on: boolean): void;
  dispose(): void;
}

interface Options {
  /** Each candle burns a little differently. */
  seed: number;
  /** The flame's brightness each frame, about 0.75 to 1. */
  onGlow?: (value: number) => void;
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform float uSeed;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    float t = uTime + uSeed * 17.0;
    // The flame stands on the wick near the foot of the canvas.
    float base = 0.1;
    float tall = 0.62 + 0.05 * (fbm(vec2(t * 0.9, uSeed)) - 0.5);
    float h = clamp((vUv.y - base) / tall, 0.0, 1.0);

    // It sways more the higher it reaches, as a flame in a draught does.
    float sway = (fbm(vec2(h * 2.2 - t * 1.7, t * 0.6 + uSeed)) - 0.5) * 0.22 * h * h;
    float x = (vUv.x - 0.5 - sway) * uAspect;

    // A teardrop: round at the foot, drawn to a point at the tip.
    float r = 0.16 * pow(1.0 - h, 0.85) * (0.5 + 0.5 * sqrt(h)) * (1.0 + 0.06 * sin(t * 11.0 + uSeed));
    float body = 1.0 - smoothstep(r * 0.45, r, abs(x));
    body *= smoothstep(base - 0.02, base + 0.04, vUv.y);
    body *= 1.0 - smoothstep(0.82, 1.0, h);

    float inner = 1.0 - smoothstep(r * 0.1, r * 0.62, abs(x));
    vec3 edge = vec3(0.86, 0.3, 0.05);
    vec3 amber = vec3(1.0, 0.7, 0.26);
    vec3 core = vec3(1.0, 0.97, 0.86);
    vec3 col = mix(edge, amber, smoothstep(0.05, 0.7, body));
    col = mix(col, core, inner * (1.0 - h * 0.85));
    // A breath of blue where the flame meets the wick.
    col = mix(col, vec3(0.36, 0.46, 0.95), (1.0 - smoothstep(0.0, 0.14, h)) * 0.55 * (1.0 - inner * 0.6));

    // The halo, centred low in the flame.
    vec2 q = vec2(x, (vUv.y - base - 0.2) * 0.85);
    float halo = exp(-dot(q, q) * 26.0) * 0.32;

    float alpha = clamp(body + halo, 0.0, 1.0);
    // Premultiplied, as the renderer expects.
    gl_FragColor = vec4(col * body + vec3(1.0, 0.72, 0.32) * halo, alpha);
  }
`;

/** The same flicker the shader shows, cheaply, for the wall's glow. */
function glowAt(t: number, seed: number): number {
  return 0.86 + 0.08 * Math.sin(t * 7.3 + seed * 3.1) + 0.06 * Math.sin(t * 13.7 + seed);
}

export function lightFlame(canvas: HTMLCanvasElement, { seed, onGlow }: Options): Flame {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uAspect: { value: 1 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new Mesh(new PlaneGeometry(2, 2), material);
  scene.add(quad);

  const fit = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    material.uniforms.uAspect!.value = w / h;
  };
  fit();
  const resize = new ResizeObserver(fit);
  resize.observe(canvas);

  let frame = 0;
  let running = false;
  const start = performance.now();
  const draw = () => {
    const t = (performance.now() - start) / 1000;
    material.uniforms.uTime!.value = t;
    renderer.render(scene, camera);
    onGlow?.(glowAt(t, seed));
    frame = window.requestAnimationFrame(draw);
  };

  const setRunning = (on: boolean) => {
    if (on === running) return;
    running = on;
    if (on) frame = window.requestAnimationFrame(draw);
    else window.cancelAnimationFrame(frame);
  };

  return {
    setRunning,
    dispose() {
      setRunning(false);
      resize.disconnect();
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
