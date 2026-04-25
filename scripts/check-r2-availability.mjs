#!/usr/bin/env node
/**
 * Walk every book file in src/data/books-index.json and HEAD-check it against
 * Cloudflare R2. Writes back `available: true|false` per file so the UI can
 * render a graceful "Тимчасово недоступний" placeholder instead of letting
 * the user click through to a 404.
 *
 * SEO surface (sitemap, metadata, JSON-LD, robots, internal links) is not
 * touched — this script only annotates real-time R2 state for end-user UX.
 *
 * Usage:
 *   node scripts/check-r2-availability.mjs --dry      # report only, no writes
 *   node scripts/check-r2-availability.mjs --limit 50 # sample first N files
 *   node scripts/check-r2-availability.mjs            # full run
 */

import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX_PATH = resolve(ROOT, 'src/data/books-index.json');

const env = Object.fromEntries(
  readFileSync(resolve(ROOT, '.env.production'), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const ACCOUNT_ID = env.CF_ACCOUNT_ID;
const ACCESS_KEY = env.R2_ACCESS_KEY;
const SECRET_KEY = env.R2_SECRET_KEY;
const BUCKET = 'ukrbooks-files';

if (!ACCOUNT_ID || !ACCESS_KEY || !SECRET_KEY) {
  console.error('Missing CF_ACCOUNT_ID / R2_ACCESS_KEY / R2_SECRET_KEY in .env.production');
  process.exit(1);
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const CONCURRENCY = 32;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

/** HEAD a single object. Returns true (exists), false (404), or null (other error — leave flag untouched). */
async function probe(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err) {
    const code = err?.$metadata?.httpStatusCode;
    if (code === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchKey') return false;
    return null;
  }
}

/** Bounded-concurrency map. */
async function pmap(items, fn, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const raw = readFileSync(INDEX_PATH, 'utf8');
  const index = JSON.parse(raw);

  // Flatten every (book, fileIdx) pair so each HeadObject becomes one work item.
  const tasks = [];
  for (const book of index.books) {
    for (let fi = 0; fi < (book.files || []).length; fi++) {
      const file = book.files[fi];
      const key = `${file.fileDir}/${file.filename}`;
      tasks.push({ slug: book.slug, fi, key, file });
      if (tasks.length >= LIMIT) break;
    }
    if (tasks.length >= LIMIT) break;
  }

  console.log(`Probing ${tasks.length} R2 objects (concurrency=${CONCURRENCY})...`);
  const t0 = Date.now();
  let done = 0;
  let lastLog = 0;

  const stats = { available: 0, broken: 0, errored: 0, changed: 0, unchanged: 0 };
  await pmap(
    tasks,
    async (t) => {
      const result = await probe(t.key);
      done++;
      const now = Date.now();
      if (now - lastLog > 2000) {
        const pct = ((done / tasks.length) * 100).toFixed(1);
        const rate = (done / ((now - t0) / 1000)).toFixed(0);
        console.log(`  [${done}/${tasks.length}] ${pct}% — ${rate} req/s`);
        lastLog = now;
      }
      if (result === null) {
        stats.errored++;
        return; // leave flag untouched
      }
      const newVal = result;
      const oldVal = t.file.available;
      if (newVal === true) stats.available++;
      else stats.broken++;
      if (oldVal !== newVal) stats.changed++;
      else stats.unchanged++;
      if (!dryRun) t.file.available = newVal;
    },
    CONCURRENCY
  );

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('');
  console.log(`Probed ${tasks.length} files in ${dt}s`);
  console.log(`  available: ${stats.available}`);
  console.log(`  broken:    ${stats.broken}`);
  console.log(`  errored:   ${stats.errored} (left untouched)`);
  console.log(`  changed:   ${stats.changed}`);
  console.log(`  unchanged: ${stats.unchanged}`);

  if (dryRun) {
    console.log('\n--dry: no writes to books-index.json');
    return;
  }

  // Stamp the file with last-checked time so future runs can skip recently-checked entries if we want.
  index.lastAvailabilityCheck = new Date().toISOString();
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
  console.log(`\nWrote ${INDEX_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
