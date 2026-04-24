#!/usr/bin/env node
// Strips HTML tags from book.description in books-index.json so the React
// render path can drop dangerouslySetInnerHTML entirely. Mirrors the Python
// strip_html() logic in scripts/generate_catalog.py.
//
// Usage:
//   node scripts/sanitize-existing-descriptions.mjs            # DRY-RUN (default)
//   node scripts/sanitize-existing-descriptions.mjs --apply    # write changes

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOKS_PATH = path.join(ROOT, 'src/data/books-index.json');
const BACKUP_PATH = path.join(ROOT, 'src/data/books-index.json.pre-sanitize-bak');

const apply = process.argv.includes('--apply');

const STRIP_TAG_RE = /<[^>]+>/g;
const MULTI_SPACE_RE = /\s+/g;
const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(s) {
  return s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39);/g, m => HTML_ENTITIES[m] ?? m)
          .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function stripHtml(text) {
  const stripped = text.replace(STRIP_TAG_RE, ' ');
  const decoded = decodeEntities(stripped);
  return decoded.replace(MULTI_SPACE_RE, ' ').trim();
}

const data = JSON.parse(fs.readFileSync(BOOKS_PATH, 'utf8'));
const books = data.books;

let changed = 0;
let trimmed = 0;
const samples = [];

for (const b of books) {
  if (!b.description) continue;
  const original = b.description;
  let cleaned = stripHtml(original);
  if (cleaned.length > 1000) {
    cleaned = cleaned.slice(0, 1000);
    trimmed++;
  }
  if (cleaned !== original) {
    changed++;
    if (samples.length < 5) {
      samples.push({
        slug: b.slug,
        before: original.length > 200 ? original.slice(0, 200) + '…' : original,
        after: cleaned.length > 200 ? cleaned.slice(0, 200) + '…' : cleaned,
      });
    }
    if (apply) b.description = cleaned;
  }
}

console.log('');
console.log(`Sanitize Existing Descriptions ${apply ? '[APPLY]' : '[DRY-RUN]'}`);
console.log('=========================================');
console.log(`Total books:              ${books.length}`);
console.log(`Books with description:   ${books.filter(b => b.description).length}`);
console.log(`Descriptions changed:     ${changed}`);
console.log(`Descriptions trimmed >1000: ${trimmed}`);
console.log('');

if (samples.length) {
  console.log(`Sample changes (first ${samples.length}):`);
  for (const s of samples) {
    console.log(`  ${s.slug}`);
    console.log(`    BEFORE: ${JSON.stringify(s.before)}`);
    console.log(`    AFTER:  ${JSON.stringify(s.after)}`);
  }
  console.log('');
}

if (!apply) {
  console.log('DRY-RUN — no files written. Re-run with --apply to write changes.');
  process.exit(0);
}

if (changed === 0) {
  console.log('No changes needed. Backup not created.');
  process.exit(0);
}

fs.copyFileSync(BOOKS_PATH, BACKUP_PATH);
console.log(`Backup written: ${path.relative(ROOT, BACKUP_PATH)}`);

const json = JSON.stringify(data, null, 2);
fs.writeFileSync(BOOKS_PATH, json + '\n', 'utf8');
console.log(`Updated:        ${path.relative(ROOT, BOOKS_PATH)}`);
console.log(`${changed} descriptions sanitized.`);
