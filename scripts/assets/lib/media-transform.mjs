import { mkdir, readFile, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

import { toPosix } from './filesystem.mjs';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.ogg', '.wav']);
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_DIMENSION = 30000;
const MAX_OUTPUT_DIMENSION = 9999;
const MAX_TOTAL_PIXELS = 250_000_000;

function shortHash(buffer) {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 8);
}

function validateName(name) {
  return /^[a-z0-9-]+$/.test(name);
}

function ensureFileNameRules(relativePath, warnings) {
  const parsed = path.posix.parse(relativePath);
  if (!validateName(parsed.name)) warnings.push(`Non-canonical file name: ${relativePath}`);
}

function calculateConstrainedSize(width, height) {
  let nextWidth = width;
  let nextHeight = height;

  if (nextWidth > MAX_OUTPUT_DIMENSION || nextHeight > MAX_OUTPUT_DIMENSION) {
    const scale = Math.min(MAX_OUTPUT_DIMENSION / nextWidth, MAX_OUTPUT_DIMENSION / nextHeight);
    nextWidth = Math.max(1, Math.floor(nextWidth * scale));
    nextHeight = Math.max(1, Math.floor(nextHeight * scale));
  }

  const totalPixels = nextWidth * nextHeight;
  if (totalPixels > MAX_TOTAL_PIXELS) {
    const scale = Math.sqrt(MAX_TOTAL_PIXELS / totalPixels);
    nextWidth = Math.max(1, Math.floor(nextWidth * scale));
    nextHeight = Math.max(1, Math.floor(nextHeight * scale));
  }

  return { width: nextWidth, height: nextHeight };
}

export async function processImageFile(filePath, relativePath, outRoot, manifestEntries) {
  const warnings = [];
  ensureFileNameRules(relativePath, warnings);

  const inputBuffer = await readFile(filePath);
  const fileStats = await stat(filePath);
  const metadata = await sharp(inputBuffer, { animated: true }).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const totalPixels = width * height;
  const gifFrames = metadata.pages || 1;
  const ext = path.extname(relativePath);
  const parsed = path.posix.parse(relativePath);

  let outputBuffer = inputBuffer;
  let processed = false;
  const exceedsInputBytes = fileStats.size > MAX_IMAGE_BYTES;
  const exceedsDimensions = width > MAX_DIMENSION || height > MAX_DIMENSION;
  const exceedsTotalPixels = totalPixels > MAX_TOTAL_PIXELS;
  const exceedsGifFrames = ext.toLowerCase() === '.gif' && gifFrames > 300;

  if (exceedsInputBytes) warnings.push('Source image exceeds 32MB EdgeOne input limit');
  if (exceedsDimensions) warnings.push('Source image exceeds 30000px EdgeOne input limit');
  if (exceedsTotalPixels) warnings.push('Source image exceeds 250M total pixel limit');
  if (exceedsGifFrames) warnings.push('GIF frame count exceeds 300 frame guideline');

  if (exceedsInputBytes || exceedsDimensions || exceedsTotalPixels || exceedsGifFrames) {
    const constrained = calculateConstrainedSize(width, height);
    outputBuffer = await sharp(inputBuffer, { animated: true })
      .resize({
        width: constrained.width,
        height: constrained.height,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();
    processed = true;
  }

  const hash = shortHash(outputBuffer);
  const outRelativePath = path.posix.join(parsed.dir, `${parsed.name}.${hash}${ext}`);
  const outPath = path.join(outRoot, ...outRelativePath.split('/'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, outputBuffer);

  manifestEntries.push({
    originalLocalName: path.basename(filePath),
    sourceLocalPath: toPosix(path.relative(process.cwd(), filePath)),
    hash,
    objectKey: outRelativePath,
    width: metadata.width,
    height: metadata.height,
    size: outputBuffer.length,
    type: 'image',
    date: parsed.dir.split('/').slice(-3).join('-'),
    processed,
    warnings,
  });

  return {
    sourceKey: toPosix(path.join('public-root', relativePath)),
    objectKey: outRelativePath,
    width: metadata.width,
    height: metadata.height,
    size: outputBuffer.length,
    warnings,
    processed,
  };
}

export async function processAudioFile(filePath, relativePath, outRoot, manifestEntries) {
  const warnings = [];
  ensureFileNameRules(relativePath, warnings);

  const buffer = await readFile(filePath);
  const parsed = path.posix.parse(relativePath);
  const ext = path.extname(relativePath).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(ext)) throw new Error(`Unsupported audio extension: ${relativePath}`);

  const hash = shortHash(buffer);
  const outRelativePath = path.posix.join(parsed.dir, `${parsed.name}.${hash}${parsed.ext}`);
  const outPath = path.join(outRoot, ...outRelativePath.split('/'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, buffer);

  manifestEntries.push({
    originalLocalName: path.basename(filePath),
    sourceLocalPath: toPosix(path.relative(process.cwd(), filePath)),
    hash,
    objectKey: outRelativePath,
    size: buffer.length,
    type: 'audio',
    date: parsed.dir.split('/').slice(-3).join('-'),
    warnings,
  });

  return {
    sourceKey: toPosix(path.join('public-root', relativePath)),
    objectKey: outRelativePath,
    size: buffer.length,
    warnings,
  };
}

export async function copySharedAsset(filePath, relativePath, outRoot) {
  const outPath = path.join(outRoot, ...relativePath.split('/'));
  await mkdir(path.dirname(outPath), { recursive: true });
  await copyFile(filePath, outPath);
}
