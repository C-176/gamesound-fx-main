/**
 * Generate app icon (.ico) for GameSound FX.
 * Pure Node.js - no dependencies.
 * Saturn planet icon with ring - smooth anti-aliased shapes.
 */
const fs = require('fs');
const path = require('path');

const COLORS = {
  bg:    { r: 0x0c, g: 0xcf, b: 0xff },  // cyan (planet body)
  dark:  { r: 0x0a, g: 0xb0, b: 0xe0 },  // darker cyan (bands)
  ring:  { r: 0x5c, g: 0xee, b: 0xff },  // light cyan (ring)
  ring2: { r: 0x3a, g: 0xdd, b: 0xff },  // mid cyan (ring inner)
};

function createIconData(size) {
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
      const ringWidth = size * 0.08;

      if (ringDist >= 0.85 && ringDist <= 1.35) {
        // Ring is visible above and below the planet
        const alpha = Math.max(0, Math.min(255, (1 - Math.abs(ringDist - 1.0) / 0.4) * 200));
        const col = Math.abs(ringDist - 1.0) < 0.12 ? COLORS.ring : COLORS.ring2;
        // Only draw ring if it's above or below the planet (not hidden behind)
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
        // Anti-aliased edge
        let alpha = 255;
        if (dist > radius - edge) {
          alpha = Math.round(255 * (1 - (dist - (radius - edge)) / edge));
        }

        // Bands/stripes on the planet
        const band = Math.sin(y / (size * 0.06)) * 0.3 + 0.5;
        const col = band > 0.6 ? COLORS.bg : COLORS.dark;

        // Band contrast is subtle
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

        // Front part of ring: drawn over planet, but only lower half
        if (y > 0 && planetDist <= radius * 0.95) {
          setPixel(x + cx, y + cy, col.r, col.g, col.b, ringAlpha);
        }
      }
    }
  }

  return pixels;
}

function createANDMask(size, pixels) {
  const rowBytes = Math.ceil(size / 8);
  const paddedRowBytes = Math.ceil(rowBytes / 4) * 4;
  const mask = Buffer.alloc(paddedRowBytes * size, 0xff);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (pixels[i + 3] > 128) {
        const byteIdx = y * paddedRowBytes + Math.floor(x / 8);
        mask[byteIdx] &= ~(1 << (7 - (x % 8)));
      }
    }
  }
  return mask;
}

function writeICO(filePath, sizes) {
  const images = [];
  for (const size of sizes) {
    const pixelData = createIconData(size);
    const andMask = createANDMask(size, pixelData);
    const bih = Buffer.alloc(40);
    bih.writeUInt32LE(40, 0);
    bih.writeInt32LE(size, 4);
    bih.writeInt32LE(size * 2, 8);
    bih.writeUInt16LE(1, 12);
    bih.writeUInt16LE(32, 14);
    bih.writeUInt32LE(0, 16);
    const xorRowBytes = size * 4;
    const andRowBytes = Math.ceil(size / 8);
    const andPaddedRowBytes = Math.ceil(andRowBytes / 4) * 4;
    const imageSize = 40 + xorRowBytes * size + andPaddedRowBytes * size;
    images.push({ size, bih, pixelData, andMask, imageSize });
  }

  const headerSize = 6 + images.length * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const parts = [];

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const entryOffset = 6 + i * 16;
    header.writeUInt8(img.size >= 256 ? 0 : img.size, entryOffset);
    header.writeUInt8(img.size >= 256 ? 0 : img.size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(img.imageSize, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    const xorRowBytes = img.size * 4;
    const andRowBytes = Math.ceil(img.size / 8);
    const andPaddedRowBytes = Math.ceil(andRowBytes / 4) * 4;
    const imageBuf = Buffer.alloc(img.imageSize);
    img.bih.copy(imageBuf, 0);
    for (let y = 0; y < img.size; y++) {
      const srcRow = (img.size - 1 - y) * img.size * 4;
      img.pixelData.copy(imageBuf, 40 + y * xorRowBytes, srcRow, srcRow + xorRowBytes);
    }
    const andStart = 40 + xorRowBytes * img.size;
    img.andMask.copy(imageBuf, andStart);
    parts.push(imageBuf);
    offset += img.imageSize;
  }

  const result = Buffer.concat([header, ...parts]);
  fs.writeFileSync(filePath, result);
  console.log(`Icon written: ${filePath} (${result.length} bytes, ${images.length} sizes)`);
}

const outDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
writeICO(path.join(outDir, 'icon.ico'), [32, 64, 256]);
