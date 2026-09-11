import sharp from 'sharp';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, extname } from 'path';

async function makeWhitePng(inputPath) {
  const { info } = await sharp(inputPath).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  const raw = await sharp(inputPath).raw().ensureAlpha().toBuffer();
  const ch = info.channels;
  for (let i = 0; i < raw.length; i += ch) {
    if (raw[i + 3] > 0) {
      raw[i] = 255;
      raw[i + 1] = 255;
      raw[i + 2] = 255;
    }
  }
  return sharp(raw, { raw: { width: info.width, height: info.height, channels: ch } })
    .png()
    .toBuffer();
}

async function makeWhiteIco(inputPath, outputPath) {
  const buf = readFileSync(inputPath);
  const count = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    const w = buf[offset] || 256;
    const h = buf[offset + 1] || 256;
    const imgOffset = buf.readUInt32LE(offset + 12);
    const imgSize = buf.readUInt32LE(offset + 8);
    entries.push({ w, h, dataOffset: imgOffset, dataSize: imgSize });
  }

  const pngBuffers = [];
  let totalDataSize = 0;
  for (const entry of entries) {
    const pngBuf = await sharp(buf.subarray(entry.dataOffset, entry.dataOffset + entry.dataSize))
      .raw()
      .ensureAlpha()
      .toBuffer();
    const ch = 4;
    for (let j = 0; j < pngBuf.length; j += ch) {
      if (pngBuf[j + 3] > 0) {
        pngBuf[j] = 255;
        pngBuf[j + 1] = 255;
        pngBuf[j + 2] = 255;
      }
    }
    const png = await sharp(pngBuf, { raw: { width: entry.w, height: entry.h, channels: 4 } })
      .png()
      .toBuffer();
    pngBuffers.push(png);
    totalDataSize += png.length;
  }

  const headerSize = 6 + count * 16;
  const ico = Buffer.alloc(headerSize + totalDataSize);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(count, 4);

  let dataOffset = headerSize;
  for (let i = 0; i < count; i++) {
    const entry = entries[i];
    const dirOffset = 6 + i * 16;
    ico[dirOffset] = entry.w === 256 ? 0 : entry.w;
    ico[dirOffset + 1] = entry.h === 256 ? 0 : entry.h;
    ico.writeUInt16LE(0, dirOffset + 2);
    ico.writeUInt16LE(1, dirOffset + 4);
    ico.writeUInt16LE(32, dirOffset + 6);
    ico.writeUInt32LE(pngBuffers[i].length, dirOffset + 8);
    ico.writeUInt32LE(dataOffset, dirOffset + 12);
    pngBuffers[i].copy(ico, dataOffset);
    dataOffset += pngBuffers[i].length;
  }

  writeFileSync(outputPath, ico);
  console.log(`Done: ${outputPath} (${count} sizes, ICO)`);
}

const inputPath = resolve(process.argv[2]);
const outputPath = process.argv[3] || inputPath;
const ext = extname(inputPath).toLowerCase();

if (ext === '.ico') {
  await makeWhiteIco(inputPath, outputPath);
} else {
  const png = await makeWhitePng(inputPath);
  writeFileSync(outputPath, png);
  const meta = await sharp(outputPath).metadata();
  console.log(`Done: ${outputPath} (${meta.width}x${meta.height})`);
}
