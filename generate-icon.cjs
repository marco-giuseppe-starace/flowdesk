// Generate FlowDesk icon as ICO + PNG (no external deps)
const fs = require('fs');
const path = require('path');

// Create a 256x256 RGBA bitmap for the FlowDesk icon
const SIZE = 256;
const buf = Buffer.alloc(SIZE * SIZE * 4);

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
}

function dist(x1, y1, x2, y2) { return Math.sqrt((x1-x2)**2 + (y1-y2)**2); }

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

// Draw rounded rectangle background with gradient
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const R = 48; // corner radius
    // Check if inside rounded rect
    let inside = true;
    if (x < R && y < R && dist(x, y, R, R) > R) inside = false;
    if (x > SIZE-1-R && y < R && dist(x, y, SIZE-1-R, R) > R) inside = false;
    if (x < R && y > SIZE-1-R && dist(x, y, R, SIZE-1-R) > R) inside = false;
    if (x > SIZE-1-R && y > SIZE-1-R && dist(x, y, SIZE-1-R, SIZE-1-R) > R) inside = false;
    
    if (inside) {
      const t = (x + y) / (2 * SIZE);
      const r = lerp(59, 29, t);   // #3b82f6 -> #1d4ed8
      const g = lerp(130, 78, t);
      const b = lerp(246, 216, t);
      setPixel(x, y, r, g, b, 255);
    }
  }
}

// Draw "FD" text using simple bitmap font approach
// We'll draw thick block letters
function fillRect(rx, ry, rw, rh, r, g, b, a) {
  for (let dy = 0; dy < rh; dy++) {
    for (let dx = 0; dx < rw; dx++) {
      setPixel(rx + dx, ry + dy, r, g, b, a);
    }
  }
}

const W = 255, A = 255; // white, full alpha
const T = 18; // stroke thickness 
const LH = 110; // letter height
const LY = 70; // letter Y start

// Letter F (x: 38 to 108)
const FX = 38;
fillRect(FX, LY, T, LH, W, W, W, A);         // vertical bar
fillRect(FX, LY, 70, T, W, W, W, A);           // top horizontal
fillRect(FX, LY + 45, 55, T, W, W, W, A);      // middle horizontal

// Letter D (x: 128 to 218)
const DX = 128;
fillRect(DX, LY, T, LH, W, W, W, A);           // vertical bar
fillRect(DX + T, LY, 45, T, W, W, W, A);        // top horizontal
fillRect(DX + T, LY + LH - T, 45, T, W, W, W, A); // bottom horizontal
fillRect(DX + 60, LY + T, T, LH - 2*T, W, W, W, A); // right vertical
// Round the D corners with extra pixels
fillRect(DX + 50, LY + T, T, T, W, W, W, A);
fillRect(DX + 50, LY + LH - 2*T, T, T, W, W, W, A);

// Small accent bars (top-left corner)
fillRect(30, 30, 50, 6, W, W, W, 100);  // thin decorative line
fillRect(30, 42, 30, 6, W, W, W, 65);   // thinner decorative line

// --- Create PNG ---
function createPng(width, height, rgba) {
  // Minimal PNG encoder
  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1;
      table[n] = cc;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeB = Buffer.from(type);
    const crcData = Buffer.concat([typeB, data]);
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc32(crcData));
    return Buffer.concat([len, typeB, data, crcB]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT - raw image data with filter byte 0 per row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    rawRows.push(Buffer.from([0])); // filter none
    rawRows.push(rgba.subarray(y * width * 4, (y + 1) * width * 4));
  }
  const raw = Buffer.concat(rawRows);
  
  // Deflate using zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(raw);

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// --- Create ICO ---
function createIco(pngs) {
  // ICO header: 6 bytes
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);       // reserved
  header.writeUInt16LE(1, 2);       // type: icon
  header.writeUInt16LE(pngs.length, 4); // count

  const dirEntries = [];
  let dataOffset = 6 + pngs.length * 16;
  
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size; // width (0 = 256)
    entry[1] = size >= 256 ? 0 : size; // height
    entry[2] = 0; // palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4);  // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(data.length, 8);  // size
    entry.writeUInt32LE(dataOffset, 12);  // offset
    dirEntries.push(entry);
    dataOffset += data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngs.map(p => p.data)]);
}

// Generate multiple sizes
function resizeRgba(src, srcSize, dstSize) {
  const dst = Buffer.alloc(dstSize * dstSize * 4);
  const ratio = srcSize / dstSize;
  for (let y = 0; y < dstSize; y++) {
    for (let x = 0; x < dstSize; x++) {
      const sx = Math.min(Math.floor(x * ratio), srcSize - 1);
      const sy = Math.min(Math.floor(y * ratio), srcSize - 1);
      const si = (sy * srcSize + sx) * 4;
      const di = (y * dstSize + x) * 4;
      dst[di] = buf[si]; dst[di+1] = buf[si+1]; dst[di+2] = buf[si+2]; dst[di+3] = buf[si+3];
    }
  }
  return dst;
}

const sizes = [256, 128, 64, 48, 32, 16];
const pngBuffers = sizes.map(s => {
  const rgba = s === 256 ? buf : resizeRgba(buf, 256, s);
  return { size: s, data: createPng(s, s, rgba) };
});

// Save icon files
const buildDir = path.join(__dirname, 'build');
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true });

// Save 256x256 PNG
fs.writeFileSync(path.join(buildDir, 'icon.png'), pngBuffers[0].data);
console.log('Created build/icon.png (256x256)');

// Save ICO with all sizes
const ico = createIco(pngBuffers);
fs.writeFileSync(path.join(buildDir, 'icon.ico'), ico);
console.log('Created build/icon.ico (multi-size)');

// Also copy to public for the HTML
fs.copyFileSync(path.join(buildDir, 'icon.png'), path.join(__dirname, 'public', 'icon.png'));
console.log('Copied to public/icon.png');

console.log('Done! Icon files generated.');
