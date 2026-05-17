/**
 * Generate PNG icons for GameSound FX.
 * Pure Node.js - no dependencies.
 * Saturn planet icon with ring - smooth anti-aliased shapes.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const COLORS = {
  bg:    { r: 0x0c, g: 0xcf, b: 0xff },  // cyan (planet body)
  dark:  { r: 0x0a, g: 0xb0, b: 0xe0 },  // darker cyan (bands)
  ring:  { r: 0x5c, g: 0xee, b: 0xff },  // light cyan (ring)
  ring2: { r: 0x3a, g: 0xdd, b: 0xff },  // mid cyan (ring inner)
};

function createPixelData(size) {
  const pixels = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.35;
  const ringA = size * 0.65, ringB = size * 0.18;

  const setPixel = (x, y, r, g, b, a) => {
    const i = (Math.round(y) * size + Math.round(x)) * 4;
    if (i < 0 || i >= pixels.length) return;
    const alpha = Math.max(0, Math.min(255, a));
    if (alpha === 0) return;
    const blend = alpha / 255;
    pixels[i]     = Math.round(pixels[i]     + (b - pixels[i])     * blend);
    pixels[i + 1] = Math.round(pixels[i + 1] + (g - pixels[i + 1]) * blend);
    pixels[i + 2] = Math.round(pixels[i + 2] + (r - pixels[i + 2]) * blend);
    pixels[i + 3] = Math.min(255, pixels[i + 3] + alpha);
  };

  // Draw ring (two ellipses on top and bottom first)
  for (let y = -size/2; y < size/2; y++) {
    for (let x = -size/2; x < size/2; x++) {
      const ringDist = (x*x) / (ringA*ringA) + (y*y) / (ringB*ringB);
      const planetDist = Math.sqrt(x*x + y*y);

      if (ringDist >= 0.85 && ringDist <= 1.35) {
        const alpha = Math.max(0, Math.min(255, (1 - Math.abs(ringDist - 1.0) / 0.4) * 200));
        const col = Math.abs(ringDist - 1.0) < 0.12 ? COLORS.ring : COLORS.ring2;
        const distFromRingCenter = Math.abs(ringDist - 1.0) * 3;
        const ringAlpha = Math.max(0, alpha * (1 - distFromRingCenter * 0.3));

        if (planetDist > radius * 0.92 || Math.abs(y) > radius * 0.5) {
          setPixel(x + cx, y + cy, col.r, col.g, col.b, ringAlpha);
        }
      }
    }
  }

  // Draw planet body (anti-aliased circle)
  for (let y = -size/2; y < size/2; y++) {
    for (let x = -size/2; x < size/2; x++) {
      const dist = Math.sqrt(x*x + y*y);
      const edge = 2;

      if (dist < radius) {
        let alpha = 255;
        if (dist > radius - edge) {
          alpha = Math.round(255 * (1 - (dist - (radius - edge)) / edge));
        }

        const band = Math.sin(y / (size * 0.06)) * 0.3 + 0.5;
        const mix = band > 0.65 ? 1.0 : (band > 0.4 ? 0.7 : 0.5);
        const r = Math.round(COLORS.bg.r * (1 - mix*0.15) + COLORS.dark.r * mix*0.15);
        const g = Math.round(COLORS.bg.g * (1 - mix*0.15) + COLORS.dark.g * mix*0.15);
        const b = Math.round(COLORS.bg.b * (1 - mix*0.15) + COLORS.dark.b * mix*0.15);

        setPixel(x + cx, y + cy, r, g, b, alpha);
      }
    }
  }

  // Draw ring over the bottom portion (in front of planet)
  for (let y = -size/2; y < size/2; y++) {
    for (let x = -size/2; x < size/2; x++) {
      const ringDist = (x*x) / (ringA*ringA) + (y*y) / (ringB*ringB);
      const planetDist = Math.sqrt(x*x + y*y);

      if (ringDist >= 0.85 && ringDist <= 1.35) {
        const alpha = Math.max(0, Math.min(255, (1 - Math.abs(ringDist - 1.0) / 0.4) * 200));
        const col = Math.abs(ringDist - 1.0) < 0.12 ? COLORS.ring : COLORS.ring2;
        const distFromRingCenter = Math.abs(ringDist - 1.0) * 3;
        const ringAlpha = Math.max(0, alpha * (1 - distFromRingCenter * 0.3));

        if (y > 0 && planetDist <= radius * 0.95) {
          setPixel(x + cx, y + cy, col.r, col.g, col.b, ringAlpha);
        }
      }
    }
  }

  return pixels;
}

function writePNG(filePath, size, pixelData) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(6, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = createChunk('IHDR', ihdrData);

  const rawRows = Buffer.alloc((1 + size * 4) * size);
  for (let y = 0; y < size; y++) {
    rawRows[y * (1 + size * 4)] = 0;
    pixelData.copy(rawRows, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const compressed = zlib.deflateSync(rawRows, { level: 9 });
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));

  const result = Buffer.concat([sig, ihdr, idat, iend]);
  fs.writeFileSync(filePath, result);
  console.log(`PNG written: ${filePath} (${result.length} bytes)`);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = crc32(crcData);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeB, data, crcB]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const outDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Tray icon: 32x32
const trayPixels = createPixelData(32);
writePNG(path.join(outDir, 'tray-icon.png'), 32, trayPixels);

// App icon sizes
for (const size of [64, 256]) {
  const pixels = createPixelData(size);
  writePNG(path.join(outDir, `icon-${size}.png`), size, pixels);
}
