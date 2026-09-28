/**
 * Generates public/icons/icon-192.png and icon-512.png
 * Design: yellow autofocus brackets (#FFD23F) framing a bone-white subject dot,
 * on off-black (#0A0A0B). Same bracket motif as the in-app guidance cues.
 * Pure Node.js — no extra dependencies. Drawn at 4× and downsampled for smooth edges.
 * Run with: npm run generate-icons
 */
const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

const BG     = [10, 10, 11];
const YELLOW = [255, 210, 63];
const WHITE  = [245, 245, 242];

function makeIcon(size) {
  const SS = 4;                 // supersampling factor
  const W  = size * SS;
  const u  = W / 192;           // design grid is 192 × 192
  const hi = new Float32Array(W * W * 3);

  for (let i = 0; i < W * W; i++) hi.set(BG, i * 3);

  function rect(x0, y0, x1, y1, c) {
    const X0 = Math.round(x0 * u), X1 = Math.round(x1 * u);
    const Y0 = Math.round(y0 * u), Y1 = Math.round(y1 * u);
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) hi.set(c, (y * W + x) * 3);
  }
  function circle(cx, cy, r, c) {
    const CX = cx * u, CY = cy * u, R = r * u;
    for (let y = Math.floor(CY - R); y <= Math.ceil(CY + R); y++)
      for (let x = Math.floor(CX - R); x <= Math.ceil(CX + R); x++)
        if ((x + 0.5 - CX) ** 2 + (y + 0.5 - CY) ** 2 <= R * R) hi.set(c, (y * W + x) * 3);
  }

  // Corner brackets: box 50..142, arms 30 long, 11 thick, rounded outer corners
  const a = 50, b = 142, len = 30, t = 11;
  const corners = [[a, a, 1, 1], [b, a, -1, 1], [a, b, 1, -1], [b, b, -1, -1]];
  for (const [x, y, dx, dy] of corners) {
    const hx0 = dx > 0 ? x : x - len, hy0 = dy > 0 ? y : y - t;
    rect(hx0, hy0, hx0 + len, hy0 + t, YELLOW);             // horizontal arm
    const vx0 = dx > 0 ? x : x - t, vy0 = dy > 0 ? y : y - len;
    rect(vx0, vy0, vx0 + t, vy0 + len, YELLOW);             // vertical arm
  }
  // Subject
  circle(96, 96, 17, WHITE);

  // Downsample (box filter) → RGBA
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, bl = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const i = ((y * SS + sy) * W + (x * SS + sx)) * 3;
      r += hi[i]; g += hi[i + 1]; bl += hi[i + 2];
    }
    const n = SS * SS, o = (y * size + x) * 4;
    px[o] = Math.round(r / n); px[o + 1] = Math.round(g / n); px[o + 2] = Math.round(bl / n); px[o + 3] = 255;
  }

  // ── Encode as PNG ───────────────────────────────────────────────────
  const scan = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    scan[y * (1 + size * 4)] = 0; // filter byte
    px.copy(scan, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = zlib.deflateSync(scan, { level: 9 });

  const T = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    T[i] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (const byte of buf) c = T[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td  = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), makeIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), makeIcon(512));
console.log('Icons generated → public/icons/icon-192.png, icon-512.png');
