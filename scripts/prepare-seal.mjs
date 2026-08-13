// Key the wax seal off its baked black background.
//
// The art arrived as RGB over black with the drop shadow painted in. Anything
// dark that is REACHABLE FROM THE IMAGE BORDER is background or shadow and
// becomes transparent; dark pixels enclosed by the wax (crevices, engraving)
// are kept. Edges are feathered from luminance so the rim stays antialiased.

import sharp from 'sharp';

const SRC = 'd:/Centralized Dossier/Assets/wax seal.png';
const OUT = 'd:/Centralized Dossier/web/src/assets/gate-seal.webp';

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const maxc = (i) => Math.max(data[i * C], data[i * C + 1], data[i * C + 2]);

// Background/shadow threshold. The wax rim is bright gold (max channel well
// above 90); the shadow gradient dies out around 70.
const T = 70;

// BFS flood fill of dark pixels from every border pixel.
const visited = new Uint8Array(W * H);
const queue = [];
for (let x = 0; x < W; x++) { queue.push(x, (H - 1) * W + x); }
for (let y = 0; y < H; y++) { queue.push(y * W, y * W + W - 1); }
for (const start of queue) {
  if (!visited[start] && maxc(start) < T) visited[start] = 1;
}
let head = 0;
const stack = queue.filter((i) => visited[i]);
while (head < stack.length) {
  const i = stack[head++];
  const x = i % W, y = (i / W) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const n = ny * W + nx;
    if (!visited[n] && maxc(n) < T) { visited[n] = 1; stack.push(n); }
  }
}

// Compose RGBA: background transparent, subject opaque, borderline pixels
// (touching background) feathered by luminance so the rim is not aliased.
const out = Buffer.alloc(W * H * 4);
for (let i = 0; i < W * H; i++) {
  const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2];
  out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b;
  if (visited[i]) { out[i * 4 + 3] = 0; continue; }
  const x = i % W, y = (i / W) | 0;
  let edge = false;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    if (visited[ny * W + nx]) { edge = true; break; }
  }
  out[i * 4 + 3] = edge ? Math.min(255, Math.round((maxc(i) / T) * 160)) : 255;
}

// Displayed at 7.5rem (120px), so 512 covers a 3x screen with room to spare.
const result = await sharp(out, { raw: { width: W, height: H, channels: 4 } })
  .resize(512, 512, { kernel: 'lanczos3' })
  .webp({ quality: 86, alphaQuality: 90 })
  .toFile(OUT);

const removed = visited.reduce((a, v) => a + v, 0);
console.log(`keyed ${removed} of ${W * H} px as background/shadow`);
console.log(`wrote ${OUT}: ${result.width}x${result.height}, ${result.size} bytes`);
