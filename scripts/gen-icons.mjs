// Dependency-free PNG icon generator. Draws a rounded-square background with a
// centered heart. Produces the PWA icon set. Run: `node scripts/gen-icons.mjs`.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const BG = [15, 15, 18, 255]; // #0f0f12
const HEART = [226, 91, 127, 255]; // #e25b7f

// CRC32 ------------------------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw scanlines with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Heart implicit: (x^2 + y^2 - 1)^3 - x^2 y^3 <= 0 (y up). ---------------
function insideHeart(nx, ny) {
  const a = nx * nx + ny * ny - 1;
  return a * a * a - nx * nx * ny * ny * ny <= 0;
}

function draw(size, { heartScale = 0.78, radius = 0.18, transparentBg = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * heartScale * 0.62; // heart radius
  const corner = size * radius;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // rounded-square mask
      let inSquare = true;
      const dx = Math.max(corner - x, x - (size - corner), 0);
      const dy = Math.max(corner - y, y - (size - corner), 0);
      if (dx > 0 && dy > 0 && dx * dx + dy * dy > corner * corner) inSquare = false;

      // heart coords (y up; center nudged down so the point sits centered)
      const nx = (x - cx) / r;
      const ny = (cy + size * 0.06 - y) / r;
      const inHeart = insideHeart(nx, ny);

      let color;
      if (inHeart && inSquare) color = HEART;
      else if (inSquare) color = transparentBg ? [0, 0, 0, 0] : BG;
      else color = [0, 0, 0, 0];

      rgba[i] = color[0];
      rgba[i + 1] = color[1];
      rgba[i + 2] = color[2];
      rgba[i + 3] = color[3];
    }
  }
  return encodePNG(size, size, rgba);
}

writeFileSync(join(OUT, 'icon-192.png'), draw(192, { heartScale: 0.92 }));
writeFileSync(join(OUT, 'icon-512.png'), draw(512, { heartScale: 0.92 }));
// maskable: heart inside the safe zone (~60% center)
writeFileSync(join(OUT, 'icon-maskable-512.png'), draw(512, { heartScale: 0.6, radius: 0.5 }));
// apple touch icon: opaque background, no rounded mask (iOS rounds it)
writeFileSync(join(OUT, 'apple-touch-icon.png'), draw(180, { heartScale: 0.9, radius: 0 }));

console.log('icons written to', OUT);
