#!/usr/bin/env node
// Batch-convert every JPEG cover to WebP so we can serve them directly
// without the Vercel image optimizer. WebP typically saves 30-50% vs JPEG
// and is supported by every browser we care about (>99.5% global usage).
//
// Strategy:
//   • Resize to max 500px wide (book cards are ~200-300px, this gives
//     room for retina without the original 800-1200px oversize).
//   • Quality 82 — near-indistinguishable from JPEG q=90 at half the size.
//   • Keep the original .jpg alongside so OG meta tags, Schema.org and
//     any direct-linked URL still work.
//
// Usage: node scripts/generate-webp-covers.mjs [--force]
//   Skips files whose .webp already exists unless --force is passed.

import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COVERS_DIR = join(__dirname, '..', 'public', 'covers');
const FORCE = process.argv.includes('--force');
const MAX_WIDTH = 500;
const QUALITY = 82;
const CONCURRENCY = Math.min(cpus().length, 8);

const jpegs = readdirSync(COVERS_DIR)
  .filter((f) => /\.jpe?g$/i.test(f))
  .map((f) => join(COVERS_DIR, f));

console.log(`Found ${jpegs.length} JPEG covers. Concurrency: ${CONCURRENCY}.`);

let done = 0, skipped = 0, failed = 0, bytesIn = 0, bytesOut = 0;
const start = Date.now();

async function convertOne(jpegPath) {
  const webpPath = jpegPath.replace(/\.jpe?g$/i, '.webp');
  if (!FORCE && existsSync(webpPath)) {
    skipped++;
    return;
  }
  try {
    const inSize = statSync(jpegPath).size;
    await sharp(jpegPath)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true, fit: 'inside' })
      .webp({ quality: QUALITY, effort: 4 })
      .toFile(webpPath);
    const outSize = statSync(webpPath).size;
    bytesIn += inSize;
    bytesOut += outSize;
    done++;
    if (done % 200 === 0) {
      const mbIn = (bytesIn / 1024 / 1024).toFixed(1);
      const mbOut = (bytesOut / 1024 / 1024).toFixed(1);
      const pct = ((1 - bytesOut / bytesIn) * 100).toFixed(0);
      const sec = ((Date.now() - start) / 1000).toFixed(0);
      console.log(`  ${done} converted (${mbIn}MB → ${mbOut}MB, -${pct}%, ${sec}s)`);
    }
  } catch (err) {
    failed++;
    console.error(`  FAIL ${jpegPath}: ${err.message}`);
  }
}

// Simple pooled worker loop
async function run() {
  const queue = [...jpegs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const path = queue.shift();
      if (path) await convertOne(path);
    }
  });
  await Promise.all(workers);
}

await run();

const sec = ((Date.now() - start) / 1000).toFixed(0);
const mbIn = (bytesIn / 1024 / 1024).toFixed(1);
const mbOut = (bytesOut / 1024 / 1024).toFixed(1);
const saved = bytesIn ? ((1 - bytesOut / bytesIn) * 100).toFixed(1) : '0';
console.log(`\nDone in ${sec}s: ${done} converted, ${skipped} skipped, ${failed} failed`);
console.log(`Size: ${mbIn}MB → ${mbOut}MB (saved ${saved}%)`);
