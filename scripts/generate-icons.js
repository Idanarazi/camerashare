/**
 * Generates public/icons/icon-192.png and icon-512.png
 * Pure Node.js — no extra dependencies.
 * Run once with: npm run generate-icons
 */
const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

function makeCameraIcon(size) {
  const px = new Uint8Array(size * size * 4);
  const s  = size / 192; // scale factor (192 is the design canvas)

  function set(x, y, r, g, b, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
  }

  function rect(x, y, w, h, r, g, b) {
    for (let py = y; py < y + h; py++)
      for (let px2 = x; px2 < x + w; px2++)
        set(px2, py, r, g, b);
  }

  function roundRect(x, y, w, h, rad, r, g, b) {
    for (let py = y; py < y + h; py++) {
      for (let px2 = x; px2 < x + w; px2++) {
        const dx = px2 - x, dy = py - y, rx = w - 1 - dx, ry = h - 1 - dy;
        let skip = false;
        if (dx < rad && dy < rad) skip = (rad-dx-0.5)**2 + (rad-dy-0.5)**2 > rad*rad;
        else if (rx < rad && dy < rad) skip = (rad-rx-0.5)**2 + (rad-dy-0.5)**2 > rad*rad;
        else if (dx < rad && ry < rad) skip = (rad-dx-0.5)**2 + (rad-ry-0.5)**2 > rad*rad;
        else if (rx < rad && ry < rad) skip = (rad-rx-0.5)**2 + (rad-ry-0.5)**2 > rad*rad;
        if (!skip) set(px2, py, r, g, b);
      }
    }
  }

  function circle(cx, cy, rad, r, g, b) {
    for (let py = Math.floor(cy - rad); py <= Math.ceil(cy + rad); py++)
      for (let px2 = Math.floor(cx - rad); px2 <= Math.ceil(cx + rad); px2++)
        if ((px2 - cx + 0.5)**2 + (py - cy + 0.5)**2 <= rad * rad)
          set(px2, py, r, g, b);
  }

  // ── Background: app red ─────────────────────────────────────────
  for (let i = 0; i < px.length; i += 4) {
    px[i] = 255; px[i+1] = 55; px[i+2] = 95; px[i+3] = 255;
  }

  // ── Camera body: white rounded rect ────────────────────────────
  roundRect(
    Math.round(32*s), Math.round(72*s),
    Math.round(128*s), Math.round(76*s),
    Math.round(16*s),
    255, 255, 255
  );

  // ── Viewfinder bump (top centre of body) ───────────────────────
  roundRect(
    Math.round(76*s), Math.round(58*s),
    Math.round(40*s), Math.round(20*s),
    Math.round(6*s),
    255, 255, 255
  );

  // ── Lens ring (white) ──────────────────────────────────────────
  circle(Math.round(96*s), Math.round(110*s), Math.round(26*s), 255, 255, 255);

  // ── Lens hole (red) ───────────────────────────────────────────
  circle(Math.round(96*s), Math.round(110*s), Math.round(18*s), 255, 55, 95);

  // ── Lens highlight (white dot) ─────────────────────────────────
  circle(Math.round(96*s), Math.round(110*s), Math.round(6*s), 255, 255, 255);

  // ── Flash dot (upper right of body) ───────────────────────────
  circle(Math.round(136*s), Math.round(90*s), Math.round(6*s), 255, 55, 95);

  // ── Encode PNG ────────────────────────────────────────────────
  const scan = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    scan[y * (1 + size * 4)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(scan, y * (1 + size * 4) + 1);
  }
  const compressed = zlib.deflateSync(scan, { level: 9 });

  // CRC32 table
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
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crcBuf]);
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
fs.writeFileSync(path.join(dir, 'icon-192.png'), makeCameraIcon(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), makeCameraIcon(512));
console.log('Icons generated → public/icons/icon-192.png, icon-512.png');
