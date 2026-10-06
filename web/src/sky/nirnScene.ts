// The live Nirn sky behind the Reports portrait gate.
//
// Adapted from a getlayers.ai "Ascend" planet layer, with none of its assets:
// the Earth GLB, city-lights GLB and cloud PNG are replaced by a procedural
// Nirn, and only the "beside the portrait" composition is kept.
//
// WHY THE SURFACE IS COMPUTED, NOT TEXTURED. The planet is larger on screen
// than any texture we could reasonably ship, so a painted map stretches into
// visible texels. Instead the large shapes (continents, climate, cloud banks)
// are baked once into a small half-float map, and everything finer — coasts,
// ridges, grain, town lights — is evaluated per pixel from the sphere
// direction, with each octave faded out before it drops below a couple of
// pixels. Relief is shaded with finite differences rather than dFdx/dFdy,
// which shade in 2×2 blocks. If a painted equirectangular Nirn map arrives
// later it can replace `macroHeight` (R channel) without touching the rest.
//
// The upstream shaders used smoothstep with edge0 > edge1, which GLSL leaves
// undefined; those are written as 1 - smoothstep(lo, hi, x) here.
//
// COLOUR. The layer was authored for three r0.143, before colour management.
// On current three the colours are kept as raw values (rawColor) and the
// renderer outputs linear, with GammaCorrectionShader doing the one sRGB
// encode, so the look matches what was tuned. Don't switch these to
// new THREE.Color(hex): that now converts sRGB to linear and darkens them.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GammaCorrectionShader } from 'three/addons/shaders/GammaCorrectionShader.js';

export interface NirnSceneOptions {
  /** The element whose box the canvas fills; sizing and framing follow it. */
  host: HTMLElement;
  canvas: HTMLCanvasElement;
  masserUrl: string;
  secundaUrl: string;
  /** Magnus, then the eight Divine planets in the orrery's order (see DIVINES). */
  distantUrls: readonly string[];
}

/**
 * The rest of Mundus, far off to the left. Magnus, the sun, holds the left side
 * deep behind Nirn — on the left because the scene's sunlight already comes
 * from there — and the eight Divine planets, in the orrery's order (Akatosh,
 * Arkay, Dibella, Julianos, Kynareth, Mara, Stendarr, Zenithar), circle it on
 * a shared tilted plane: inner rings quicker, outer ones slower, the slowest
 * about ten minutes a turn. The rings are sized to stay clear of the portrait.
 */
const MAGNUS = { x: -6.6, y: 0.7, z: -10, size: 1.05 } as const;
/** The rings' plane: squashed vertically and turned, so they read as tilted ellipses. */
const RING = { squash: 0.42, turn: -0.32 } as const;
/** [radius, seconds per orbit, starting angle, size] for each Divine, innermost first. */
const DIVINES: readonly (readonly [number, number, number, number])[] = [
  [1.3, 170, 0.4, 0.3],
  [1.6, 215, 2.1, 0.36],
  [1.9, 260, 4.0, 0.32],
  [2.2, 310, 5.5, 0.26],
  [2.5, 365, 1.2, 0.34],
  [2.8, 425, 3.1, 0.4],
  [3.1, 490, 5.0, 0.24],
  [3.4, 560, 0.9, 0.38],
];

export interface NirnScene {
  dispose(): void;
}

const CONFIG = {
  rimColor: '#f2d9a0', rimPower: 2.4, nightLights: 9, terrainDepth: 0.33, terrainShade: 1.3,
  oceanGlint: 0.45, oceanDeep: 0.12, oceanFlow: 3, oceanFlowSpeed: 0.8, oceanFlowScale: 2.1,
  glowColor: '#4a6fd0', glowIntensity: 1.45, planetRadius: 1.95, spin: 0.03, initRotation: 2.07, tilt: 0.37,
  bgColor: '#05070d', flameColor: '#b8862e', flameColor2: '#e9cf86', flameAmt: 0.12,
  atmoColor: '#e9cf86', atmoCount: 260, atmoSize: 20, atmoSpeed: 0.8,
  starColor: '#f3ead2', starCount: 4200, starSize: 1.6, starFlicker: 1,
  markerColor: '#ffd27a', markerCount: 48, markerSize: 15, markerSpeed: 0.5,
} as const;

const CLOUD_LAYERS = [
  { h: 1.005, o: 0.38, spin: 0.06, ry: 0.0, phase: 0.0 },
  { h: 1.03, o: 0.26, spin: 0.14, ry: 2.2, phase: 13.0 },
  { h: 1.075, o: 0.18, spin: 0.1, ry: 4.3, phase: 27.0 },
] as const;

// "Beside the portrait", re-set for the centred gate: the portrait now stands in
// the middle, so Nirn is a little smaller and sits clear of it to the right,
// Masser takes the open upper left and Secunda the upper right, above Nirn.
const VIEW = { x: 3.05, y: -0.55, s: 0.8 } as const;

/** A moon's path around Nirn: radius in world units, on-screen axis, seconds per orbit, starting angle. */
interface Orbit { radius: number; u: readonly [number, number]; period: number; start: number }
// Masser, the greater moon, keeps the wider and slower round; Secunda the
// tighter, quicker one, tilted the other way so the two paths cross.
const MOONS: { masser: Orbit; secunda: Orbit } = {
  masser: { radius: 2.55, u: [-0.55, 0.84], period: 140, start: 0.6 },
  secunda: { radius: 1.95, u: [0.62, 0.78], period: 85, start: 2.4 },
};
const SEA = '-0.03';
const SUN = 'normalize(vec3(-0.8, 0.28, 0.12))';
const ENTRY_DUR = 1.9;
const ENTRY_START_Y = -6.5;
const BAKE_W = 2048;
const BAKE_H = 1024;
const MASK_W = 1024;
const MASK_H = 512;

const rawRGB = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
// Raw channel values, no sRGB→linear conversion (see COLOUR above).
const rawColor = (hex: string) => new THREE.Color().setRGB(...rawRGB(hex), THREE.LinearSRGBColorSpace);
const hexToVec3 = (hex: string) => new THREE.Vector3(...rawRGB(hex));

const SNOISE = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy)); vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz); vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy); vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + 1.0 * C.xxx; vec3 x2 = x0 - i2 + 2.0 * C.xxx; vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0; vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
  vec4 x_ = floor(j * ns.z); vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy; vec4 y = y_ *ns.x + ns.yyyy; vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy); vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0; vec4 s1 = floor(b1)*2.0 + 1.0; vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy; vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy,h.x); vec3 p1 = vec3(a0.zw,h.y); vec3 p2 = vec3(a1.xy,h.z); vec3 p3 = vec3(a1.zw,h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0); m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}`;

const MACRO_GLSL = /* glsl */ `
float fbm5(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*snoise(p); p*=2.03; a*=0.5; } return s; }
float macroHeight(vec3 d){
  vec3 w = d*1.05 + 0.55*vec3(fbm5(d*1.2+3.1), fbm5(d*1.2+7.7), fbm5(d*1.2+11.3));
  return fbm5(w*1.15) + 0.18*snoise(d*0.7+2.0);
}
float macroClouds(vec3 d){ return fbm5(d*3.0 + vec3(fbm5(d*2.0+5.0))); }`;

const BAKE_HEAD = /* glsl */ `
${SNOISE}
${MACRO_GLSL}
varying vec2 vUv;
vec3 dirFromUv(vec2 uv){ // matches THREE.SphereGeometry's UV layout
  float phi = uv.x * 6.28318530718; float theta = (1.0 - uv.y) * 3.14159265359;
  return vec3(-cos(phi)*sin(theta), cos(theta), sin(phi)*sin(theta));
}`;

const PLANET_FRAG = /* glsl */ `
uniform sampler2D macro; uniform float time;
uniform vec3 rimColor; uniform float rimPower; uniform float nightLights;
uniform float terrainDepth; uniform float terrainShade; uniform float oceanGlint; uniform float oceanDeep;
uniform float oceanFlow; uniform float oceanFlowSpeed; uniform float oceanFlowScale;
varying vec2 vUv; varying vec3 vDir; varying vec3 vNormal; varying vec3 vViewPosition;
varying vec3 vT1; varying vec3 vT2; varying vec3 vOT1; varying vec3 vOT2;
${SNOISE}
vec2 uvFromDir(vec3 d){
  float u = atan(d.z, -d.x) / 6.28318530718; u = u < 0.0 ? u + 1.0 : u;
  return vec2(u, 1.0 - acos(clamp(d.y, -1.0, 1.0)) / 3.14159265359);
}
// Band-limited detail: each octave fades out before it is smaller than a couple of pixels.
float detail(vec3 d, float px, int octaves){
  float det = 0.0, amp = 0.031, f = 26.0;
  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    float keep = 1.0 - smoothstep(0.18, 0.45, px * f);
    det += amp * keep * snoise(d * f + float(i) * 7.31); f *= 2.03; amp *= 0.5;
  }
  return det;
}
void main(){
  vec3 d = normalize(vDir);
  vec4 M = texture2D(macro, vUv);
  float px = length(fwidth(d));
  float det = detail(d, px, 5);
  float h = M.r + det;
  float aa = max(fwidth(h), 0.0015);
  float land = smoothstep(${SEA} - aa, ${SEA} + aa, h);
  float lat = abs(d.y);

  float depth = clamp((${SEA} - h) * 3.0, 0.0, 1.0);
  vec3 ocean = mix(vec3(0.10,0.30,0.46), vec3(0.03,0.10,0.24), depth);
  ocean = mix(ocean, vec3(0.16,0.44,0.55), (1.0 - smoothstep(0.0, 0.035, ${SEA} - h)) * 0.7);

  float e = clamp((h - ${SEA}) * 2.2, 0.0, 1.0);
  vec3 lush = vec3(0.20,0.33,0.15), steppe = vec3(0.45,0.40,0.24), ash = vec3(0.30,0.24,0.20), rock = vec3(0.42,0.38,0.33);
  float m = clamp(M.g + det * 2.0, 0.0, 1.0);
  vec3 ground = mix(mix(steppe, lush, m), ash, smoothstep(0.55, 0.9, M.b) * 0.7);
  ground = mix(ground, rock, smoothstep(0.35, 0.8, e + det * 1.5));
  ground = mix(ground, vec3(0.88,0.90,0.93), smoothstep(0.9, 1.15, e + det * 2.0) * 0.6);
  ground = mix(vec3(0.62,0.56,0.40), ground, smoothstep(0.0, 0.03, h - ${SEA}));
  ground *= 0.94 + det * 1.8;

  vec3 col = mix(ocean, ground, land);
  col = mix(col, vec3(0.74,0.78,0.82), smoothstep(0.975, 0.998, lat) * 0.6);
  gl_FragColor = vec4(pow(max(col, 0.0), vec3(2.2)) * 1.15, 1.0);

  vec3 normalizedNormal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float rim = 1.0 - max(dot(viewDir, normalizedNormal), 0.0);
  rim = pow(rim, rimPower); rim = pow(rim, 1.5); rim *= 0.55;
  float waterMask = 1.0 - land;
  float shimmer = snoise(d * 30.0 + vec3(time*1.5, -time*2.0, time*2.5)) * (1.0 - smoothstep(0.2, 0.5, px * 30.0));
  gl_FragColor.rgb += waterMask * shimmer * 0.025;
  float fT = time * oceanFlowSpeed * 4.0;
  float fS = 2.0 * oceanFlowScale;
  float warp = snoise(d * fS + vec3(-fT*0.5, fT*0.4, fT*0.5));
  float flow = snoise(d * fS * 2.0 + vec3(fT*0.6 + warp, -fT*0.5, fT*0.7));
  flow = warp * 0.6 + flow * 0.4;
  gl_FragColor.rgb += waterMask * flow * 0.02 * oceanFlow;
  gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.01, 0.06, 0.16), waterMask * oceanDeep);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, rimColor, rim);

  // Relief: per-pixel finite differences on the height field.
  float eps = max(px * 1.25, 0.0006);
  vec3 d1 = normalize(d + vOT1 * eps), d2 = normalize(d + vOT2 * eps);
  float h0b = max(M.r + detail(d, px, 4), ${SEA});
  float h1 = max(texture2D(macro, uvFromDir(d1)).r + detail(d1, px, 4), ${SEA});
  float h2 = max(texture2D(macro, uvFromDir(d2)).r + detail(d2, px, 4), ${SEA});
  vec2 grad = vec2(h1 - h0b, h2 - h0b) / eps;
  vec3 bumpedNormal = normalize(normalizedNormal - terrainDepth * 0.7 * (grad.x * normalize(vT1) + grad.y * normalize(vT2)));
  vec3 shadeNormal = mix(bumpedNormal, normalizedNormal, waterMask);

  vec3 viewSunDir = ${SUN};
  float ndl = dot(normalizedNormal, viewSunDir);
  float dayAmt = smoothstep(-0.05, 0.35, ndl);
  float relief = dot(shadeNormal, viewSunDir) - ndl;
  gl_FragColor.rgb *= clamp(1.0 + relief * terrainShade * dayAmt, 0.7, 1.35);
  float nightFactor  = 1.0 - smoothstep(-0.30, 0.18, ndl);
  float lightsFactor = 1.0 - smoothstep(-0.35, 0.30, ndl);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * 0.08, nightFactor);

  vec3 tp = d * 160.0;
  float townFade = 1.0 - smoothstep(0.35, 0.9, length(fwidth(tp)));
  float towns = smoothstep(0.78, 0.96, snoise(tp)) * smoothstep(0.15, 0.6, snoise(d * 7.0) * 0.5 + 0.5);
  float glowArea = smoothstep(0.2, 0.7, snoise(d * 18.0) * 0.5 + 0.5) * 0.06;
  vec3 cityLights = vec3(1.0, 0.72, 0.38) * land * (1.0 - smoothstep(0.7, 0.85, lat)) * (towns * townFade + glowArea);
  gl_FragColor.rgb += cityLights * nightLights * 0.06 * lightsFactor;

  vec3 halfDir = normalize(viewSunDir + viewDir);
  float ripple = snoise(vec3(d * 240.0) + time * 4.0) * (1.0 - smoothstep(0.2, 0.5, px * 240.0));
  float ndh = max(dot(normalizedNormal, halfDir) + ripple * 0.02, 0.0);
  gl_FragColor.rgb += pow(ndh, 140.0) * waterMask * dayAmt * oceanGlint * vec3(1.0, 0.97, 0.88);
}`;

const PLANET_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vDir; varying vec3 vNormal; varying vec3 vViewPosition;
varying vec3 vT1; varying vec3 vT2; varying vec3 vOT1; varying vec3 vOT2;
void main(){
  vUv = uv; vDir = normalize(position); vNormal = normalize(normalMatrix * normal);
  vec3 up = abs(vDir.y) > 0.98 ? vec3(1.0,0.0,0.0) : vec3(0.0,1.0,0.0);
  vOT1 = normalize(cross(up, vDir)); vOT2 = cross(vDir, vOT1);
  vT1 = normalize(normalMatrix * vOT1); vT2 = normalize(normalMatrix * vOT2);
  vec4 mv = modelViewMatrix * vec4(position,1.0); vViewPosition = -mv.xyz; gl_Position = projectionMatrix * mv;
}`;

const CLOUD_VERT = /* glsl */ `
varying vec2 vCloudUv; varying vec3 vDir; varying vec3 vNormal; varying vec3 vViewPosition;
void main(){ vCloudUv = uv; vDir = normalize(position); vNormal = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position,1.0); vViewPosition = -mv.xyz; gl_Position = projectionMatrix * mv; }`;

const CLOUD_FRAG = /* glsl */ `
uniform sampler2D macro; uniform float uTime; uniform float uOpacity; uniform float uPhase;
varying vec2 vCloudUv; varying vec3 vDir; varying vec3 vNormal; varying vec3 vViewPosition;
${SNOISE}
void main(){
  vec3 d = normalize(vDir);
  float c = texture2D(macro, vCloudUv).a;
  float cpx = length(fwidth(d));
  float wisp = snoise(d * 22.0 + uPhase) * 0.06 * (1.0 - smoothstep(0.2, 0.5, cpx*22.0))
             + snoise(d * 47.0 - uPhase) * 0.03 * (1.0 - smoothstep(0.2, 0.5, cpx*47.0));
  float base = smoothstep(0.12, 0.6, c + wisp);
  float cloudNoise = snoise(d * 5.0 + vec3(uTime, -uTime*2.0, uTime*2.0) + uPhase) * 0.5 + 0.5;
  float cloudNdv = max(dot(normalize(vNormal), normalize(vViewPosition)), 0.0);
  float cloudMod = mix(cloudNoise, 1.0, pow(1.0 - cloudNdv, 3.0));
  float cloudNdl = dot(normalize(vNormal), ${SUN});
  float cloudDay = 1.0 - (1.0 - smoothstep(-0.30, 0.30, cloudNdl)) * 0.9;
  gl_FragColor = vec4(vec3(1.0), clamp(base * cloudMod * uOpacity * cloudDay, 0.0, 1.0));
}`;

export function createNirnScene({ host, canvas, masserUrl, secundaUrl, distantUrls }: NirnSceneOptions): NirnScene {
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = Math.max(1, host.clientWidth);
  let H = Math.max(1, host.clientHeight);
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, false);

  /* ---- bake: continents, climate, cloud banks (R height · G moisture · B ash · A clouds) ---- */
  const bakeScene = new THREE.Scene();
  const bakeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const bakeGeo = new THREE.PlaneGeometry(2, 2);
  const bakeQuad = new THREE.Mesh(bakeGeo);
  bakeScene.add(bakeQuad);
  // Half-float targets keep the halo and the height field free of 8-bit banding; rendering into them needs one of these.
  const floatOK = renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float');

  const bake = (frag: string, w: number, h: number, type: THREE.TextureDataType) => {
    const bytes = type === THREE.UnsignedByteType;
    const rt = new THREE.WebGLRenderTarget(w, h, {
      type, format: THREE.RGBAFormat, depthBuffer: false,
      generateMipmaps: bytes, minFilter: bytes ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter,
      magFilter: THREE.LinearFilter, wrapS: THREE.RepeatWrapping,
    });
    const mat = new THREE.ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position,1.0); }',
      fragmentShader: BAKE_HEAD + frag,
    });
    bakeQuad.material = mat;
    renderer.setRenderTarget(rt);
    renderer.render(bakeScene, bakeCam);
    renderer.setRenderTarget(null);
    mat.dispose();
    return rt;
  };

  const macroRT = keep(bake(`
void main(){
  vec3 d = dirFromUv(vUv);
  gl_FragColor = vec4(macroHeight(d), snoise(d*6.0)*0.5+0.5, snoise(d*2.3+9.0)*0.5+0.5, macroClouds(d));
}`, BAKE_W, BAKE_H, floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType));

  // Small 8-bit land mask read back on the CPU so the pings only sit on land.
  const maskRT = bake(`
void main(){ vec3 d = dirFromUv(vUv); float h = macroHeight(d);
  gl_FragColor = vec4(step(${SEA}+0.02, h) * (1.0 - step(0.9, abs(d.y))), 0.0, 0.0, 1.0); }`, MASK_W, MASK_H, THREE.UnsignedByteType);
  const landPixels = new Uint8Array(MASK_W * MASK_H * 4);
  renderer.readRenderTargetPixels(maskRT, 0, 0, MASK_W, MASK_H, landPixels);
  maskRT.dispose();
  bakeGeo.dispose();

  /* ---- scene ---- */
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 200);
  camera.position.set(0, 0, 8);
  scene.add(camera);

  const worldGroup = new THREE.Group();
  scene.add(worldGroup);
  const planetGroup = new THREE.Group();
  planetGroup.rotation.set(0.55, 0, CONFIG.tilt);
  worldGroup.add(planetGroup);
  const cloudGroup = new THREE.Group();
  cloudGroup.rotation.set(0.55, 0, CONFIG.tilt);
  worldGroup.add(cloudGroup);

  const planetUniforms = {
    macro: { value: macroRT.texture }, time: { value: 0 },
    rimColor: { value: rawColor(CONFIG.rimColor) }, rimPower: { value: CONFIG.rimPower },
    nightLights: { value: CONFIG.nightLights }, terrainDepth: { value: CONFIG.terrainDepth }, terrainShade: { value: CONFIG.terrainShade },
    oceanGlint: { value: CONFIG.oceanGlint }, oceanDeep: { value: CONFIG.oceanDeep }, oceanFlow: { value: CONFIG.oceanFlow },
    oceanFlowSpeed: { value: CONFIG.oceanFlowSpeed }, oceanFlowScale: { value: CONFIG.oceanFlowScale },
  };
  const planet = new THREE.Mesh(
    keep(new THREE.SphereGeometry(CONFIG.planetRadius, 256, 160)),
    keep(new THREE.ShaderMaterial({ uniforms: planetUniforms, vertexShader: PLANET_VERT, fragmentShader: PLANET_FRAG })),
  );
  planetGroup.add(planet);

  // Atmosphere halo
  const glowMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), keep(new THREE.ShaderMaterial({
    transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uGlow: { value: hexToVec3(CONFIG.glowColor) }, uIntensity: { value: CONFIG.glowIntensity } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 uGlow; uniform float uIntensity; varying vec2 vUv;
void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2); gl_FragColor = vec4(uGlow * a * uIntensity, a); }`,
  })));
  glowMesh.scale.setScalar(CONFIG.planetRadius * 2.15);
  glowMesh.renderOrder = -1;
  worldGroup.add(glowMesh);

  // Cloud shells
  const cloudTime = { value: 0 };
  const clouds = CLOUD_LAYERS.map((layer) => {
    const mesh = new THREE.Mesh(
      keep(new THREE.SphereGeometry(CONFIG.planetRadius * layer.h, 192, 128)),
      keep(new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { macro: { value: macroRT.texture }, uTime: cloudTime, uOpacity: { value: layer.o }, uPhase: { value: layer.phase } },
        vertexShader: CLOUD_VERT, fragmentShader: CLOUD_FRAG,
      })),
    );
    mesh.rotation.y = layer.ry;
    mesh.renderOrder = 2;
    cloudGroup.add(mesh);
    return { mesh, spin: layer.spin };
  });

  // Embassy pings on land
  const res = new THREE.Vector2(W, H);
  const markerMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthTest: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: rawColor(CONFIG.markerColor) }, uSize: { value: CONFIG.markerSize }, uSpeed: { value: CONFIG.markerSpeed }, uRes: { value: res } },
    vertexShader: `attribute float seed; uniform float uSize; uniform vec2 uRes; varying float vSeed; varying float vFade;
void main(){ vSeed = seed; vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 vn = normalize(normalMatrix * normalize(position)); vec3 vd = normalize(-mv.xyz);
  vFade = smoothstep(0.15, 0.5, dot(vn, vd));
  gl_PointSize = max(uSize * uRes.y / 900.0 * (7.0 / max(-mv.z, 1.0)), 2.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uTime; uniform float uSpeed; varying float vSeed; varying float vFade;
void main(){ if (vFade <= 0.001) discard; vec2 p = gl_PointCoord - 0.5; float d = length(p) * 2.0; if (d > 1.0) discard;
  float core = (1.0 - smoothstep(0.0, 0.30, d)) * 1.2; float ph = fract(uTime * uSpeed + vSeed);
  float ring = (1.0 - smoothstep(0.0, 0.07, abs(d - ph))) * (1.0 - ph);
  gl_FragColor = vec4(uColor, clamp(core + ring, 0.0, 1.0) * vFade); }`,
  }));
  {
    const pos: number[] = [];
    const seeds: number[] = [];
    const v = new THREE.Vector3();
    for (let guard = 0; seeds.length < CONFIG.markerCount && guard < 20000; guard++) {
      const u = Math.random();
      const vy = Math.acos(1 - 2 * Math.random()) / Math.PI;
      const px = Math.min(MASK_W - 1, Math.floor(u * MASK_W));
      const py = Math.min(MASK_H - 1, Math.floor((1 - vy) * MASK_H));
      if ((landPixels[(py * MASK_W + px) * 4] ?? 0) < 128) continue;
      const phi = u * Math.PI * 2;
      const theta = vy * Math.PI;
      v.set(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta)).multiplyScalar(CONFIG.planetRadius * 1.012);
      pos.push(v.x, v.y, v.z);
      seeds.push(Math.random());
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    planet.add(new THREE.Points(g, markerMat));
  }

  // Starfield
  const starMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uSize: { value: CONFIG.starSize }, uFlicker: { value: CONFIG.starFlicker }, uColor: { value: rawColor(CONFIG.starColor) }, uRes: { value: res } },
    vertexShader: `attribute float seed; attribute float bright; uniform float uTime; uniform float uSize; uniform float uFlicker; uniform vec2 uRes; varying float vTw;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); float tw = 0.6 + 0.4 * sin(uTime * uFlicker + seed); vTw = bright * tw;
  gl_PointSize = max(uSize * uRes.y / 900.0 * (90.0 / max(-mv.z, 1.0)), 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vTw;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard; float core = (1.0 - smoothstep(0.0, 0.5, l)); gl_FragColor = vec4(uColor, core * vTw); }`,
  }));
  {
    const n = CONFIG.starCount;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const bright = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i * 3] = 90 * s * Math.cos(t); pos[i * 3 + 1] = 90 * u; pos[i * 3 + 2] = 90 * s * Math.sin(t);
      seed[i] = Math.random() * 100;
      // Most stars faint, a few bright: a squared draw fills the dark with
      // pinpricks without lifting the background into a grey haze.
      bright[i] = 0.18 + Math.random() ** 2 * 0.82;
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('bright', new THREE.BufferAttribute(bright, 1));
    const stars = new THREE.Points(g, starMat);
    stars.frustumCulled = false;
    scene.add(stars);
  }

  // Gold motes drifting around the camera
  const atmoMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uColor: { value: rawColor(CONFIG.atmoColor) }, uRes: { value: res } },
    vertexShader: `attribute float size; attribute float seed; uniform float uTime; uniform vec2 uRes; varying float vA;
vec3 warp(vec3 p, float t){ float c=0.9,a=1.9,b=0.02,s=0.05; p*=2.;
  p.x+=c*sin(s*t+a*p.y)+t*b; p.y+=c*cos(s*t+a*p.x); p.y+=c*sin(s*t+a*p.z)+t*b;
  p.z+=c*cos(s*t+a*p.y); p.z+=c*sin(s*t+a*p.x)+t*b; p.x+=c*cos(s*t+a*p.z); return cos(p+vec3(1,2,4)); }
void main(){ vec3 v = position*4.0 + warp(position, uTime)*1.2; vec4 mv = modelViewMatrix * vec4(v, 1.0);
  float r = length(v); float farF = 1.0 - smoothstep(5.0, 6.5, r); float nearF = smoothstep(0.0, 0.5, -mv.z); vA = farF * nearF;
  gl_PointSize = max(size * uRes.y / 900.0 / -mv.z, 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uColor; varying float vA;
void main(){ vec2 p = gl_PointCoord - 0.5; float l = length(p); if (l > 0.5) discard; float tex = (1.0 - smoothstep(0.0, 0.5, l)); gl_FragColor = vec4(uColor * tex, tex * vA * 0.45); }`,
  }));
  const motes = (() => {
    const n = CONFIG.atmoCount;
    const pos = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * 2 - 1; pos[i * 3 + 1] = Math.random() * 2 - 1; pos[i * 3 + 2] = Math.random() * 2 - 1;
      size[i] = CONFIG.atmoSize * (0.4 + Math.random()); seed[i] = Math.random();
    }
    const g = keep(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const p = new THREE.Points(g, atmoMat);
    p.frustumCulled = false;
    scene.add(p);
    return p;
  })();

  // Masser and Secunda: the calendar's own mundus art
  const loader = new THREE.TextureLoader();
  const sprite = (url: string) => {
    const tex = keep(loader.load(url));
    tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })));
    scene.add(s);
    return s;
  };
  const masser = sprite(masserUrl);
  const secunda = sprite(secundaUrl);
  const [magnusUrl, ...divineUrls] = distantUrls;
  const magnus = magnusUrl ? sprite(magnusUrl) : null;
  magnus?.scale.setScalar(MAGNUS.size);
  const divines = divineUrls.slice(0, DIVINES.length).map((url, i) => {
    const [radius, period, start, size] = DIVINES[i]!;
    const s = sprite(url);
    s.scale.setScalar(size);
    return { sprite: s, radius, period, start };
  });
  const ringCos = Math.cos(RING.turn);
  const ringSin = Math.sin(RING.turn);

  let orbitPhase = 0;
  const along = new THREE.Vector3();
  const depth = new THREE.Vector3(0, 0, 1);
  const orbit = (moon: THREE.Sprite, path: Orbit, t: number) => {
    const angle = path.start + (t / path.period) * Math.PI * 2;
    along.set(path.u[0], path.u[1], 0).normalize();
    moon.position.copy(worldGroup.position)
      .addScaledVector(along, Math.cos(angle) * path.radius)
      .addScaledVector(depth, Math.sin(angle) * path.radius);
  };

  /* ---- composite: render → bloom → gamma → background + corner flame (+ dither) ---- */
  const composerTarget = keep(new THREE.WebGLRenderTarget(W * DPR, H * DPR, {
    type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType,
    samples: 4,
  }));
  const composer = new EffectComposer(renderer, composerTarget);
  composer.setPixelRatio(DPR);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.55, 0.82);
  composer.addPass(bloom);
  composer.addPass(new ShaderPass(GammaCorrectionShader));
  const finalPass = new ShaderPass({
    uniforms: {
      iTime: { value: 0 }, tDiffuse: { value: null },
      uBg: { value: hexToVec3(CONFIG.bgColor) }, uFlameA: { value: hexToVec3(CONFIG.flameColor) },
      uFlameB: { value: hexToVec3(CONFIG.flameColor2) }, uFlameAmt: { value: CONFIG.flameAmt },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float iTime; uniform sampler2D tDiffuse; uniform vec3 uBg; uniform vec3 uFlameA; uniform vec3 uFlameB; uniform float uFlameAmt; varying vec2 vUv;
vec3 warp3d(vec3 pos, float t){ float curv=.8,a=1.9,b=0.7; pos*=2.;
  pos.x+=curv*sin(t+a*pos.y)+t*b; pos.y+=curv*cos(t+a*pos.x); pos.y+=curv*sin(t+a*pos.z)+t*b;
  pos.z+=curv*cos(t+a*pos.y); pos.z+=curv*sin(t+a*pos.x)+t*b; pos.x+=curv*cos(t+a*pos.z);
  return 0.5+0.5*cos(pos.xyz+vec3(1,2,4)); }
void main(){ vec2 uv = 2.*vUv - 1.;
  vec3 w = pow(warp3d(vec3(uv.x, sin(uv.y), uv.y), iTime*1.5), vec3(1.5));
  vec3 flame = 1.5*uFlameA*w.x; flame*=w.y; flame += uFlameB*w.z;
  flame *= smoothstep(0.25, 1., abs(uv.y)); float md = smoothstep(-0.7, 1., -uv.y*uv.x); flame *= md*md;
  vec3 bg = uBg * (1.0 - 0.4 * length(uv));
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  gl_FragColor = vec4(bg + flame*uFlameAmt + texture2D(tDiffuse, vUv).xyz + dither/255., 1.); }`,
  });
  composer.addPass(finalPass);

  /* ---- motion ---- */
  const sideScale = () => Math.min(1, Math.max(0.45, W / 1200));
  let curX = VIEW.x * sideScale();
  let curY = VIEW.y;
  let entryT = 0;
  let spinPhase = 0;
  let mx = 0, my = 0, pmx = 0, pmy = 0;
  let last = performance.now();
  let raf = 0;
  let onScreen = true;
  worldGroup.scale.setScalar(VIEW.s);

  const onPointer = (e: PointerEvent) => {
    mx = e.clientX / window.innerWidth - 0.5;
    my = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  const tick = (now: number) => {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = Math.min(1, dt * 2.4);
    curX += (VIEW.x * sideScale() - curX) * k;
    curY += (VIEW.y - curY) * k;
    entryT = Math.min(ENTRY_DUR, entryT + dt);
    const entryY = ENTRY_START_Y * (1 - (1 - Math.pow(1 - entryT / ENTRY_DUR, 3)));
    pmx += (mx - pmx) * Math.min(1, dt * 2);
    pmy += (my - pmy) * Math.min(1, dt * 2);
    worldGroup.position.set(curX + pmx * 0.25, curY + entryY - pmy * 0.15, 0);
    camera.position.x = pmx * -0.35;
    camera.position.y = pmy * 0.2;
    camera.lookAt(0, 0, 0);

    spinPhase += dt * CONFIG.spin;
    planetGroup.rotation.y = CONFIG.initRotation + spinPhase;
    for (const c of clouds) c.mesh.rotation.y += dt * c.spin * 0.3;
    planetUniforms.time.value += dt / 12;
    cloudTime.value += dt / 20;
    (starMat.uniforms.uTime as THREE.IUniform<number>).value += dt;
    (markerMat.uniforms.uTime as THREE.IUniform<number>).value += dt;
    (atmoMat.uniforms.uTime as THREE.IUniform<number>).value = (now / 1000) * CONFIG.atmoSpeed * 8;
    (finalPass.uniforms.iTime as THREE.IUniform<number>).value = (now / 1000) * 0.12;
    motes.position.copy(camera.position);
    glowMesh.quaternion.copy(camera.quaternion);

    // The moons orbit Nirn, centred on wherever the planet is this frame (so
    // they ride its entry and the pointer parallax with it). Each orbit is a
    // tilted circle: `u` is its on-screen axis, the other axis runs into the
    // screen, so a moon swings across the planet's face and then behind it —
    // where the planet's depth hides it.
    orbit(masser, MOONS.masser, orbitPhase);
    orbit(secunda, MOONS.secunda, orbitPhase);
    orbitPhase += dt;
    masser.scale.setScalar(Math.max(0.5, 0.62 * VIEW.s));
    secunda.scale.setScalar(Math.max(0.28, 0.32 * VIEW.s));
    // Magnus and its ring of Divines take only a fraction of the pointer
    // parallax, as anything that far off would. Each planet's depth follows its
    // ring, so the back half of every orbit passes behind Magnus.
    const cx = MAGNUS.x + pmx * 0.08;
    const cy = MAGNUS.y - pmy * 0.05;
    magnus?.position.set(cx, cy, MAGNUS.z);
    for (const p of divines) {
      const a = p.start + (orbitPhase / p.period) * Math.PI * 2;
      const ox = Math.cos(a) * p.radius;
      const oy = Math.sin(a) * p.radius * RING.squash;
      p.sprite.position.set(
        cx + ox * ringCos - oy * ringSin,
        cy + ox * ringSin + oy * ringCos,
        MAGNUS.z + Math.sin(a) * p.radius,
      );
    }

    composer.render();
    schedule();
  };
  const schedule = () => {
    if (!raf && onScreen && !document.hidden) {
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };

  const resize = () => {
    W = Math.max(1, host.clientWidth);
    H = Math.max(1, host.clientHeight);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    bloom.setSize(W, H);
    res.set(W, H);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // Stop drawing while the gate is scrolled away or the tab is hidden.
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    schedule();
  });
  io.observe(host);
  const onVisibility = () => schedule();
  document.addEventListener('visibilitychange', onVisibility);

  schedule();

  return {
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      onScreen = false;
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      for (const d of disposables) d.dispose();
      bloom.dispose();
      composer.renderTarget1.dispose();
      composer.renderTarget2.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
