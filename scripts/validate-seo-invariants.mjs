#!/usr/bin/env node
// Validates SEO invariants before build. Fails (exit 1) on violations to
// block deploy of inconsistent sitemap vs noindex state. Pure Node, no deps.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BOOKS_PATH = path.join(ROOT, 'src/data/books-index.json');
const CATEGORIES_PATH = path.join(ROOT, 'src/data/categories.json');

const errors = [];
const warnings = [];

function fail(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }

const booksRaw = JSON.parse(fs.readFileSync(BOOKS_PATH, 'utf8'));
const categories = JSON.parse(fs.readFileSync(CATEGORIES_PATH, 'utf8'));
const books = booksRaw.books;

// --- Stats ----------------------------------------------------------------
const stats = {
  total: books.length,
  pdTrue: books.filter(b => b.isPublicDomain === true).length,
  pdFalse: books.filter(b => b.isPublicDomain === false).length,
  pdUnclass: books.filter(b => b.isPublicDomain == null).length,
  withDescription: books.filter(b => b.description).length,
  inSitemap: books.filter(b => b.isPublicDomain !== false).length,
  noindex: books.filter(b => b.isPublicDomain === false).length,
};

// --- Invariant checks -----------------------------------------------------

// 1. isPublicDomain must be boolean | null | undefined (no strings, numbers)
for (const b of books) {
  if (b.isPublicDomain != null && typeof b.isPublicDomain !== 'boolean') {
    fail(`book ${b.slug}: isPublicDomain has invalid type ${typeof b.isPublicDomain} (value: ${JSON.stringify(b.isPublicDomain)}); must be boolean | null | undefined`);
  }
}

// 2. slug uniqueness
const slugCounts = new Map();
for (const b of books) {
  if (!b.slug || typeof b.slug !== 'string') {
    fail(`book ${b.id || '?'}: missing or invalid slug`);
    continue;
  }
  if (b.slug.includes('/') || b.slug.includes(' ') || b.slug !== b.slug.trim()) {
    fail(`book ${b.slug}: slug contains forbidden chars (slash/space/whitespace)`);
  }
  slugCounts.set(b.slug, (slugCounts.get(b.slug) ?? 0) + 1);
}
for (const [slug, count] of slugCounts) {
  if (count > 1) fail(`duplicate book slug ${slug} (${count} occurrences)`);
}

// 3. description must be plain text (no <p>, <script>, <iframe>, on*= handlers)
//    Catches regression of the XSS hardening (Task 1).
const dangerousPatterns = [
  /<script\b/i,
  /<iframe\b/i,
  /<embed\b/i,
  /<object\b/i,
  /\bon\w+\s*=/i,
  /javascript:/i,
];
let withHtmlWrapper = 0;
let withDangerous = 0;
for (const b of books) {
  if (!b.description) continue;
  if (b.description.startsWith('<p>') || b.description.includes('</p>')) {
    withHtmlWrapper++;
  }
  for (const re of dangerousPatterns) {
    if (re.test(b.description)) {
      fail(`book ${b.slug}: description contains dangerous pattern ${re}`);
      withDangerous++;
      break;
    }
  }
}
if (withHtmlWrapper > 0) {
  warn(`${withHtmlWrapper}/${stats.withDescription} descriptions still contain <p>/</p> tags — Task 1 sanitize-existing-descriptions.mjs not yet applied`);
}

// 4. category slugs unique
const catSlugs = new Set();
for (const c of categories) {
  if (catSlugs.has(c.slug)) fail(`duplicate category slug ${c.slug}`);
  catSlugs.add(c.slug);
}

// 5. each book.category exists in categories.json (warn — old slugs may be redirected)
const bookCategories = new Set(books.map(b => b.category).filter(Boolean));
for (const cat of bookCategories) {
  if (!catSlugs.has(cat)) {
    warn(`books reference category "${cat}" which is not in categories.json (may be old slug; check redirects in next.config.ts)`);
  }
}

// 6. authors with PD books should have non-empty author (warning only —
//    lib/books.ts:normalizeAuthor() resolves empty/unknown to "Невідомий автор"
//    at runtime, so SEO output is fine; this is a data-quality signal).
let emptyAuthorIndexable = 0;
for (const b of books) {
  if (b.isPublicDomain !== false && (!b.author || !b.author.trim())) {
    emptyAuthorIndexable++;
  }
}
if (emptyAuthorIndexable > 0) {
  warn(`${emptyAuthorIndexable} indexable books have empty author field (runtime falls back to "Невідомий автор", but data is messy)`);
}

// --- Report ---------------------------------------------------------------
console.log('');
console.log('SEO Invariants Validator');
console.log('========================');
console.log(`Total books:            ${stats.total}`);
console.log(`  isPublicDomain=true:  ${stats.pdTrue} (indexable, in sitemap)`);
console.log(`  isPublicDomain=false: ${stats.pdFalse} (noindex, not in sitemap)`);
console.log(`  unclassified:         ${stats.pdUnclass} (indexable, in sitemap by default)`);
console.log(`Sitemap-books URL count: ${stats.inSitemap}`);
console.log(`Noindex book count:      ${stats.noindex}`);
console.log(`Books with description:  ${stats.withDescription}`);
console.log(`Categories:              ${categories.length}`);
console.log('');

if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
  console.log('');
}

if (errors.length) {
  console.error(`ERRORS (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  console.error('SEO invariant validation FAILED — fix above issues before build.');
  process.exit(1);
}

console.log('SEO invariants OK.');
process.exit(0);
