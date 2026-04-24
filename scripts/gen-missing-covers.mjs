#!/usr/bin/env node
// Generate programmatic covers for books that currently use placeholder.jpg
// (or have empty coverImage). Uses sharp + SVG templates, no external APIs.
//
// Output per book: public/covers/<slug>.jpg AND public/covers/<slug>.webp
// (matches the existing naming pattern; getCoverUrl in src/lib/utils.ts
// rewrites .jpg → .webp at render time, and /api/download serves either).
//
// Each cover: 400x600, category-tinted gradient, title wrapped top,
// author italics at bottom, subtle frame. Deterministic — re-running
// produces identical files.
//
// Usage: node scripts/gen-missing-covers.mjs [--apply]
//   Without --apply it only prints the plan — no files touched.

import sharp from 'sharp';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const COVERS_DIR = join(ROOT, 'public', 'covers');

/** Category → gradient palette [top, bottom]. Picked to feel thematically
 *  right without being garish: warm browns for classics, blues for foreign
 *  lit, purples for fantasy, earthy greens for history, etc. */
const PALETTES = {
  'literature-ukr':     ['#D4AF37', '#8B6914'],  // Ukrainian gold
  'literature-foreign': ['#3A5F8F', '#1F3557'],  // deep blue
  'classics':           ['#8B4513', '#4A2508'],  // mahogany
  'fantasy':            ['#5D4E8C', '#2A1F4F'],  // purple
  'poetry':             ['#B03060', '#58142C'],  // wine
  'children':           ['#E67E22', '#8B4A0C'],  // amber
  'teen':               ['#2E8B57', '#14432B'],  // sea green
  'history':            ['#6B4423', '#2E1F10'],  // earth
  'nonfiction':         ['#556B7F', '#2F3E4D'],  // slate
  'self-help':          ['#008B8B', '#004545'],  // teal
  'business-science':   ['#4B6584', '#1E2A38'],  // steel blue
  'other':              ['#556B7F', '#2F3E4D'],
};
const DEFAULT_PALETTE = ['#556B7F', '#2F3E4D'];

const WIDTH = 400;
const HEIGHT = 600;

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Greedy word-wrap. Ukrainian titles can have long compound words —
 *  we wrap on spaces only, never break inside a word. */
function wrapText(text, maxChars) {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? cur + ' ' + w : w;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function buildSvg(title, author, palette) {
  const [c1, c2] = palette;
  // Title: max 5 lines, ~18 chars per line (fits 30pt serif)
  const titleLines = wrapText(title || 'Без назви', 18).slice(0, 5);
  const titleFontSize = titleLines.length > 3 ? 26 : 30;
  const titleLineHeight = titleFontSize + 8;
  const titleBlockHeight = titleLines.length * titleLineHeight;
  const titleStartY = 170 - (titleBlockHeight / 2) + titleFontSize;

  // Author: max 2 lines, ~24 chars per line (fits 18pt italic)
  const authorLines = wrapText(author === 'Невідомий автор' ? '' : (author || ''), 24).slice(0, 2);
  const authorStartY = 500;

  let titleEls = '';
  for (let i = 0; i < titleLines.length; i++) {
    titleEls += `<text x="${WIDTH / 2}" y="${titleStartY + i * titleLineHeight}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleFontSize}" font-weight="bold" fill="#ffffff" text-anchor="middle">${escapeXml(titleLines[i])}</text>`;
  }

  let authorEls = '';
  for (let i = 0; i < authorLines.length; i++) {
    authorEls += `<text x="${WIDTH / 2}" y="${authorStartY + i * 24}" font-family="Georgia, 'Times New Roman', serif" font-size="17" fill="#e8e8e8" text-anchor="middle" font-style="italic">${escapeXml(authorLines[i])}</text>`;
  }

  return `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="14" y="14" width="${WIDTH - 28}" height="${HEIGHT - 28}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
  <line x1="60" y1="${titleStartY + titleBlockHeight + 25}" x2="${WIDTH - 60}" y2="${titleStartY + titleBlockHeight + 25}" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
  ${titleEls}
  ${authorEls}
  <text x="${WIDTH / 2}" y="${HEIGHT - 30}" font-family="Georgia, serif" font-size="11" fill="rgba(255,255,255,0.4)" text-anchor="middle" letter-spacing="3">UKRBOOKS</text>
</svg>`;
}

// ─── main ──────────────────────────────────────────────────────────
const apply = process.argv.includes('--apply');

const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const targets = index.books.filter((b) => {
  const img = b.coverImage || '';
  return !img || img.includes('placeholder');
});

console.log(`Books without real cover: ${targets.length}`);
if (!apply) {
  const byCat = {};
  for (const b of targets) byCat[b.category] = (byCat[b.category] || 0) + 1;
  console.log('By category:');
  for (const [c, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}  ${c}`);
  }
  console.log('\n(dry-run — pass --apply to write covers + update JSON)');
  process.exit(0);
}

// Apply
let generated = 0;
let updatedFiles = 0;
const slugsToUpdate = new Set();

for (const book of targets) {
  const palette = PALETTES[book.category] || DEFAULT_PALETTE;
  const svg = buildSvg(book.title, book.author, palette);
  const jpgPath = join(COVERS_DIR, `${book.slug}.jpg`);
  const webpPath = join(COVERS_DIR, `${book.slug}.webp`);

  const svgBuf = Buffer.from(svg);
  await sharp(svgBuf).jpeg({ quality: 85 }).toFile(jpgPath);
  await sharp(svgBuf).webp({ quality: 82 }).toFile(webpPath);

  book.coverImage = `/covers/${book.slug}.jpg`;
  slugsToUpdate.add(book.slug);
  generated++;
}

writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`Generated covers: ${generated}`);
console.log(`wrote ${INDEX_PATH}`);

// Update per-book JSON files
for (const file of readdirSync(BOOKS_DIR)) {
  if (!file.endsWith('.json')) continue;
  const path = join(BOOKS_DIR, file);
  const b = JSON.parse(readFileSync(path, 'utf8'));
  if (!slugsToUpdate.has(b.slug)) continue;
  b.coverImage = `/covers/${b.slug}.jpg`;
  writeFileSync(path, JSON.stringify(b, null, 2) + '\n', 'utf8');
  updatedFiles++;
}
console.log(`updated per-book files: ${updatedFiles} (rest — index-only entries)`);

console.log('\ndone.');
