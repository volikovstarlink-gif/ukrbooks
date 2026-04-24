#!/usr/bin/env node
// One-off cleanup: move foreign-author books out of classics/ukrainian
// into classics/foreign. Uses the hardcoded UKRAINIAN_AUTHOR_NAMES /
// FOREIGN_AUTHOR_NAMES from src/lib/author-origin.ts.
//
// Strategy (conservative):
//   - Author in FOREIGN_AUTHOR_NAMES → move to classics/foreign
//   - Author in UKRAINIAN_AUTHOR_NAMES → keep in classics/ukrainian
//   - Neither: keep (don't risk moving a real Ukrainian out)
//
// Usage: node scripts/fix-classics-ukrainian.mjs [--apply]
//   Without --apply it prints the plan, no files touched.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const CATEGORIES_PATH = join(ROOT, 'src', 'data', 'categories.json');
const ORIGIN_TS = join(ROOT, 'src', 'lib', 'author-origin.ts');

function extractSet(name, src) {
  const re = new RegExp(name + String.raw` = new Set<string>\(\[([\s\S]*?)\]\)`);
  const m = src.match(re);
  if (!m) throw new Error('no match for ' + name);
  const body = m[1];
  const out = new Set();
  const re2 = /'([^']+)'|"([^"]+)"/g;
  let mm;
  while ((mm = re2.exec(body))) out.add(mm[1] ?? mm[2]);
  return out;
}

const src = readFileSync(ORIGIN_TS, 'utf8');
const UKRAINIAN = extractSet('UKRAINIAN_AUTHOR_NAMES', src);
const FOREIGN = extractSet('FOREIGN_AUTHOR_NAMES', src);

const apply = process.argv.includes('--apply');

const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const books = index.books;

const ukrClassics = books.filter((b) => b.category === 'classics' && b.subcategory === 'ukrainian');
const toMove = ukrClassics.filter((b) => FOREIGN.has(b.author));

console.log(`classics/ukrainian total: ${ukrClassics.length}`);
console.log(`→ classics/foreign moves (author in FOREIGN list): ${toMove.length}\n`);

// Summary by author
const byA = {};
for (const b of toMove) byA[b.author] = (byA[b.author] || 0) + 1;
for (const [a, n] of Object.entries(byA).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${a}`);
}

// Authors in classics/ukrainian that are in NEITHER list — show a few for
// manual review, don't move automatically.
const neither = ukrClassics.filter((b) => !UKRAINIAN.has(b.author) && !FOREIGN.has(b.author));
if (neither.length > 0) {
  console.log(`\nNot in either list (kept in classics/ukrainian, review manually if needed):`);
  const byAn = {};
  for (const b of neither) byAn[b.author] = (byAn[b.author] || 0) + 1;
  const sorted = Object.entries(byAn).sort((a, b) => b[1] - a[1]);
  for (const [a, n] of sorted.slice(0, 20)) {
    console.log(`  ${String(n).padStart(3)}  ${a}`);
  }
  if (sorted.length > 20) console.log(`  ... and ${sorted.length - 20} more`);
}

if (!apply) {
  console.log('\n(dry-run — pass --apply to write changes)');
  process.exit(0);
}

// ─── apply ──────────────────────────────────────────────────────────
const moveSlugs = new Set(toMove.map((b) => b.slug));

// 1. Rewrite index
for (const b of books) {
  if (moveSlugs.has(b.slug)) b.subcategory = 'foreign';
}
writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`\nwrote ${INDEX_PATH}`);

// 2. Rewrite individual book JSON files
let updated = 0;
for (const file of readdirSync(BOOKS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const path = join(BOOKS_DIR, file);
  const b = JSON.parse(readFileSync(path, 'utf8'));
  if (!moveSlugs.has(b.slug)) continue;
  b.subcategory = 'foreign';
  writeFileSync(path, JSON.stringify(b, null, 2) + '\n', 'utf8');
  updated++;
}
console.log(`updated ${updated} book files`);

// 3. Recompute subcategory bookCounts for classics
const cats = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf8'));
const classics = cats.find((c) => c.slug === 'classics');
if (classics && classics.subcategories) {
  const subCounts = {};
  for (const b of books) {
    if (b.category !== 'classics' || !b.subcategory) continue;
    subCounts[b.subcategory] = (subCounts[b.subcategory] || 0) + 1;
  }
  for (const s of classics.subcategories) s.bookCount = subCounts[s.slug] || 0;
  writeFileSync(CATEGORIES_PATH, JSON.stringify(cats, null, 2) + '\n', 'utf8');
  console.log(`wrote ${CATEGORIES_PATH} (classics subcategory counts recomputed)`);
}

console.log('\ndone.');
