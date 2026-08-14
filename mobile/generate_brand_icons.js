const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createPng(width, height, drawPixelFn) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixelFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0; // Compression method
  ihdr[11] = 0; // Filter method
  ihdr[12] = 0; // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buf = Buffer.alloc(4 + 4 + length + 4);
  buf.writeUInt32BE(length, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.slice(4, 8 + length));
  buf.writeUInt32BE(crc, 8 + length);
  return buf;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xedb88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Draw PlanToPark Brand Logo: Emerald background (#10b981) with rounded square & letter 'P'
function drawIconPixel(x, y, w, h) {
  // Center emerald badge square (size: 600x600 inside 1024x1024)
  const margin = w * 0.2;
  const size = w - margin * 2;
  const cornerRadius = size * 0.25;

  // Check if pixel is within the rounded square badge
  const bx = x - margin;
  const by = y - margin;

  let inBadge = false;
  if (bx >= 0 && bx <= size && by >= 0 && by <= size) {
    let dx = 0;
    let dy = 0;
    if (bx < cornerRadius) dx = cornerRadius - bx;
    else if (bx > size - cornerRadius) dx = bx - (size - cornerRadius);
    
    if (by < cornerRadius) dy = cornerRadius - by;
    else if (by > size - cornerRadius) dy = by - (size - cornerRadius);

    if (dx * dx + dy * dy <= cornerRadius * cornerRadius) {
      inBadge = true;
    }
  }

  // Draw Letter 'P' inside badge
  let inLetterP = false;
  if (inBadge) {
    // Relative coordinates within badge (0 to 1)
    const rx = bx / size;
    const ry = by / size;

    // Vertical stem of P (rx: 0.30 to 0.44, ry: 0.22 to 0.78)
    const inStem = (rx >= 0.30 && rx <= 0.44 && ry >= 0.22 && ry <= 0.78);

    // Loop top bar (rx: 0.44 to 0.64, ry: 0.22 to 0.34)
    const inTopBar = (rx >= 0.44 && rx <= 0.64 && ry >= 0.22 && ry <= 0.34);

    // Loop bottom bar (rx: 0.44 to 0.64, ry: 0.40 to 0.52)
    const inBottomBar = (rx >= 0.44 && rx <= 0.64 && ry >= 0.40 && ry <= 0.52);

    // Loop right curve (outer radius ~0.15 around center 0.62, 0.37)
    const cx = 0.62;
    const cy = 0.37;
    const distSq = (rx - cx) * (rx - cx) + (ry - cy) * (ry - cy);
    const inLoopCurve = (distSq <= 0.15 * 0.15 && rx >= 0.58 && ry >= 0.22 && ry <= 0.52);

    // Inner hole of P (distSq <= 0.06 * 0.06 around center 0.55, 0.37)
    const holeDistSq = (rx - 0.54) * (rx - 0.54) + (ry - 0.37) * (ry - 0.37);
    const inHole = (holeDistSq <= 0.055 * 0.055) || (rx >= 0.44 && rx <= 0.56 && ry >= 0.28 && ry <= 0.46);

    if ((inStem || inTopBar || inBottomBar || inLoopCurve) && !inHole) {
      inLetterP = true;
    }
  }

  if (inLetterP) {
    return [255, 255, 255, 255]; // Crisp White
  } else if (inBadge) {
    return [16, 185, 129, 255]; // Emerald #10b981
  } else {
    return [15, 23, 42, 255]; // Dark Slate Background #0f172a
  }
}

// Generate assets
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

console.log('Generating 512x512 PlanToPark icon.png...');
const iconBuffer = createPng(512, 512, drawIconPixel);
fs.writeFileSync(path.join(assetsDir, 'icon.png'), iconBuffer);
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), iconBuffer);

console.log('Generating 512x512 PlanToPark splash.png & favicon.png...');
fs.writeFileSync(path.join(assetsDir, 'splash.png'), iconBuffer);
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), iconBuffer);

console.log('✅ PlanToPark brand logo assets generated successfully!');
