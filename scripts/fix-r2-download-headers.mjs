#!/usr/bin/env node
/**
 * One-off migration: rewrite R2 object metadata so that every book file
 * downloads directly (instead of rendering inline in iOS Safari / Mi Browser).
 *
 * For each .fb2/.epub/.pdf object in the `ukrbooks-files` bucket:
 *   - Content-Type       → application/octet-stream
 *   - Content-Disposition → attachment
 *
 * Uses a CopyObject to self with MetadataDirective=REPLACE — no bytes move,
 * only headers flip. Safe to re-run; operation is idempotent.
 *
 * Usage:
 *   node scripts/fix-r2-download-headers.mjs --limit 3   # dry sample
 *   node scripts/fix-r2-download-headers.mjs --dry       # list only, no writes
 *   node scripts/fix-r2-download-headers.mjs             # full prod run
 */

import { S3Client, ListObjectsV2Command, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse .env.production for R2 credentials (don't pull them into process.env globally).
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, '..', '.env.production'), 'utf8')
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
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
});

const EXT_MIME = {
  epub: 'application/epub+zip',
  fb2: 'application/x-fictionbook+xml',
  pdf: 'application/pdf',
};

const TARGET_EXTS = new Set(Object.keys(EXT_MIME));

async function listAllKeys() {
  const keys = [];
  let token;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token,
    }));
    for (const obj of res.Contents || []) {
      const ext = obj.Key.split('.').pop()?.toLowerCase();
      if (ext && TARGET_EXTS.has(ext)) keys.push(obj.Key);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function fixKey(key) {
  // CopyObject to self with MetadataDirective=REPLACE rewrites the headers
  // without re-uploading bytes. R2 supports this (S3-compatible).
  await s3.send(new CopyObjectCommand({
    Bucket: BUCKET,
    Key: key,
    CopySource: `/${BUCKET}/${encodeURIComponent(key)}`,
    MetadataDirective: 'REPLACE',
    ContentType: 'application/octet-stream',
    ContentDisposition: 'attachment',
  }));
}

async function headKey(key) {
  const res = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return {
    contentType: res.ContentType,
    contentDisposition: res.ContentDisposition,
    size: res.ContentLength,
  };
}

async function main() {
  console.log(`Listing objects in bucket "${BUCKET}"…`);
  const keys = await listAllKeys();
  console.log(`Found ${keys.length} book files (.fb2/.epub/.pdf).`);

  const toProcess = keys.slice(0, Math.min(limit, keys.length));
  console.log(`Will process: ${toProcess.length}${dryRun ? ' (DRY RUN — headers only)' : ''}\n`);

  let done = 0, errors = 0;
  const CONCURRENCY = dryRun ? 1 : 16;

  async function worker(queue) {
    while (queue.length) {
      const key = queue.shift();
      if (!key) return;
      try {
        if (dryRun) {
          const h = await headKey(key);
          console.log(`  [head] ${key}`);
          console.log(`         type=${h.contentType}  disposition=${h.contentDisposition ?? '(none)'}`);
        } else {
          await fixKey(key);
          done++;
          if (done % 250 === 0 || done <= 3) {
            console.log(`  [${done}/${toProcess.length}] ${key}`);
          }
        }
      } catch (err) {
        errors++;
        console.error(`  ERROR on ${key}: ${err.message}`);
      }
    }
  }

  const queue = [...toProcess];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

  console.log(`\nDone. updated=${done} errors=${errors} total=${toProcess.length}`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
