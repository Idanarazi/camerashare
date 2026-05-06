/**
 * Generates public/icons/icon-192.png and icon-512.png
 * Design: camera lens aperture in electric blue (#00A8FF) on near-black (#0A0A0A)
 * Pure Node.js — no extra dependencies.
 * Run once with: npm run generate-icons
 */
const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

function makeCameraIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const s  = size / 192;
  const cx = size / 2;
  const cy = size / 2;

  function set(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
  }

  function circle(cxp, cyp, rad, r, g, b) {
    const x0 = Math.floor(cxp - rad), x1 = Math.ceil(cxp + rad);
    const y0 = Math.floor(cyp - rad), y1 = Math.ceil(cyp + rad);
    for (let py = y0; py <= y1; py++)
      for (let px2 = x0; px2 <= x1; px2++)
        if ((px2 - cxp + 0.5) ** 2 + (py - cyp + 0.5) ** 2 <= rad * rad)
          set(px2, py, r, g, b);
  }

  // ── Background: #0A0A0A ─────────────────────────────────────────────
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 10; px[i+1] = 10; px[i+2] = 10; px[i+3] = 255;
  }

  // Blue: #00A8FF
  const [BR, BG, BB] = [0, 168, 255];
  // Background repeat for cutouts: #0A0A0A
  const [DKR, DKG, DKB] = [10, 10, 10];

  // Outer blue filled circle — the outermost ring
  circle(cx, cy, 84 * s, BR, BG, BB);

  // Cut a dark circle — reveals outer blue ring (14 px wide at 192)
  circle(cx, cy, 70 * s, DKR, DKG, DKB);

  // Middle blue filled circle — second ring
  circle(cx, cy, 52 * s, BR, BG, BB);

  // Cut another dark circle — reveals middle blue ring (16 px wide at 192)
  circle(cx, cy, 36 * s, DKR, DKG, DKB);

  // Center blue dot
  circle(cx, cy, 16 * s, BR, BG, BB);

  // Tiny white highlight — top-left of center dot, like a real lens reflection
  circle(cx - 6 * s, cy - 6 * s, 5 * s, 255, 255, 255);

  // ── Encode as PNG ───────────────────────────────────────────────────
  const scan = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    scan[y * (1 + size * 4)] = 0; // filter byte
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(scan, y * (1 + size * 4) + 1);
  }
  const compressed = zlib.deflateSync(scan, { level: 9 });

  // CRC-32
  const T = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    T[i] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (const b of buf) c = T[(c ^ b) & 0xff] ^ (c >>> 8);
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
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const dir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon-192.png'), makeCameraIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), makeCameraIcon(512));
console.log('Icons generated → public/icons/icon-192.png, icon-512.png');
