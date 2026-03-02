// Generate FlowDesk icon as ICO + PNG (no external deps)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const buf = Buffer.alloc(SIZE * SIZE * 4);

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function idx(x, y) {
  return (y * SIZE + x) * 4;
}

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = idx(x, y);
  buf[i] = clamp(Math.round(r), 0, 255);
  buf[i + 1] = clamp(Math.round(g), 0, 255);
  buf[i + 2] = clamp(Math.round(b), 0, 255);
  buf[i + 3] = clamp(Math.round(a), 0, 255);
}

function blendPixel(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = idx(x, y);
  const sa = clamp(a, 0, 255) / 255;
  if (sa <= 0) return;
  const da = buf[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;

  const nr = (r * sa + buf[i] * da * (1 - sa)) / oa;
  const ng = (g * sa + buf[i + 1] * da * (1 - sa)) / oa;
  const nb = (b * sa + buf[i + 2] * da * (1 - sa)) / oa;

  buf[i] = clamp(Math.round(nr), 0, 255);
  buf[i + 1] = clamp(Math.round(ng), 0, 255);
  buf[i + 2] = clamp(Math.round(nb), 0, 255);
  buf[i + 3] = clamp(Math.round(oa * 255), 0, 255);
}

function signedDistanceRoundRect(px, py, x, y, w, h, r) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const dx = Math.abs(px - cx) - (w / 2 - r);
  const dy = Math.abs(py - cy) - (h / 2 - r);
  const ox = Math.max(dx, 0);
  const oy = Math.max(dy, 0);
  const outside = Math.sqrt(ox * ox + oy * oy) - r;
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside;
}

function fillRoundedRectAA(x, y, w, h, r, colorFn) {
  const minX = Math.max(0, Math.floor(x - 1));
  const maxX = Math.min(SIZE - 1, Math.ceil(x + w + 1));
  const minY = Math.max(0, Math.floor(y - 1));
  const maxY = Math.min(SIZE - 1, Math.ceil(y + h + 1));

  for (let py = minY; py <= maxY; py++) {
    for (let px = minX; px <= maxX; px++) {
      const d = signedDistanceRoundRect(px + 0.5, py + 0.5, x, y, w, h, r);
      if (d >= 1) continue;
      const cov = clamp(1 - d, 0, 1);
      const c = colorFn(px, py);
      blendPixel(px, py, c.r, c.g, c.b, c.a * cov);
    }
  }
}

// Background squircle with deep blue -> cyan gradient
fillRoundedRectAA(10, 10, 236, 236, 54, (x, y) => {
  const t = clamp((x * 0.55 + y * 0.95) / (SIZE * 1.5), 0, 1);
  return {
    r: lerp(12, 8, t),
    g: lerp(28, 166, t),
    b: lerp(74, 218, t),
    a: 255,
  };
});

// Soft top highlight
fillRoundedRectAA(22, 22, 212, 112, 40, (x, y) => {
  const ty = clamp((y - 22) / 112, 0, 1);
  return { r: 255, g: 255, b: 255, a: 44 * (1 - ty) };
});

// Inner shadow for depth
fillRoundedRectAA(22, 22, 212, 212, 44, (x, y) => {
  const t = clamp((x + y) / (SIZE * 1.8), 0, 1);
  return { r: 3, g: 8, b: 20, a: 34 * t };
});

// Main "F" monogram with rounded segments
const white = { r: 245, g: 250, b: 255, a: 255 };
fillRoundedRectAA(64, 58, 28, 140, 14, () => white);
fillRoundedRectAA(64, 58, 132, 28, 14, () => white);
fillRoundedRectAA(64, 113, 102, 24, 12, () => ({ r: 245, g: 250, b: 255, a: 245 }));
fillRoundedRectAA(64, 166, 76, 22, 11, () => ({ r: 245, g: 250, b: 255, a: 228 }));

// Dynamic flow accent
fillRoundedRectAA(148, 148, 50, 50, 25, () => ({ r: 102, g: 252, b: 241, a: 235 }));
fillRoundedRectAA(160, 160, 26, 26, 13, () => ({ r: 9, g: 58, b: 98, a: 210 }));

// Subtle outer glow
fillRoundedRectAA(10, 10, 236, 236, 54, (x, y) => {
  const cx = 128;
  const cy = 128;
  const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
  const t = clamp((dist - 70) / 95, 0, 1);
  return { r: 98, g: 245, b: 255, a: 22 * (1 - t) };
});

function crc32(data) {
  let crc = 0xffffffff;
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0]));
    rows.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }

  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function resizeRgbaNearest(src, srcSize, dstSize) {
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  const ratio = srcSize / dstSize;

  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      const sx = Math.min(srcSize - 1, Math.floor(x * ratio));
      const sy = Math.min(srcSize - 1, Math.floor(y * ratio));
      const si = (sy * srcSize + sx) * 4;
      const di = (y * dstSize + x) * 4;
      dst[di] = src[si];
      dst[di + 1] = src[si + 1];
      dst[di + 2] = src[si + 2];
      dst[di + 3] = src[si + 3];
    }
  }

  return dst;
}

function createIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;

  for (const img of images) {
    const e = Buffer.alloc(16);
    e[0] = img.size >= 256 ? 0 : img.size;
    e[1] = img.size >= 256 ? 0 : img.size;
    e[2] = 0;
    e[3] = 0;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(img.data.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += img.data.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [256, 128, 64, 48, 32, 16];
const pngs = sizes.map((s) => {
  const rgba = s === SIZE ? buf : resizeRgbaNearest(buf, SIZE, s);
  return { size: s, data: createPng(s, s, rgba) };
});

const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

fs.writeFileSync(path.join(buildDir, 'icon.png'), pngs[0].data);
console.log('Created build/icon.png (256x256)');

fs.writeFileSync(path.join(buildDir, 'icon.ico'), createIco(pngs));
console.log('Created build/icon.ico (multi-size)');

fs.copyFileSync(path.join(buildDir, 'icon.png'), path.join(__dirname, 'public', 'icon.png'));
console.log('Copied to public/icon.png');

console.log('Done! New FlowDesk icon generated.');
