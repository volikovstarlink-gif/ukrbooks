#!/usr/bin/env node
// Inspection script — mirrors src/lib/author-origin.ts to dump column
// assignments. Regenerate whenever the TS file changes.
import { readFileSync } from 'node:fs';

const data = JSON.parse(
  readFileSync(new URL('../src/data/books-index.json', import.meta.url), 'utf8'),
);
const src = readFileSync(new URL('../src/lib/author-origin.ts', import.meta.url), 'utf8');

function extract(name, isSet) {
  const re = isSet
    ? new RegExp(`${name} = new Set<string>\\(\\[([\\s\\S]*?)\\]\\)`)
    : new RegExp(`${name} = \\[([\\s\\S]*?)\\]`);
  const body = src.match(re)[1];
  const out = [];
  const re2 = /'([^']+)'|"([^"]+)"/g;
  let m;
  while ((m = re2.exec(body))) out.push(m[1] ?? m[2]);
  return isSet ? new Set(out) : out;
}

const UK = extract('UKRAINIAN_AUTHOR_NAMES', true);
const FG = extract('FOREIGN_AUTHOR_NAMES', true);
const SUFFIXES = extract('SLAVIC_SURNAME_SUFFIXES', false);
const FIRST = extract('SLAVIC_FIRST_NAMES', true);

const normToken = (t) => t.toLowerCase().replace(/[’'ʼ.,;:()]/g, '').trim();
const isFullTok = (t) => t.replace(/[.,;:()]/g, '').length > 2;
const hasSlavicSurname = (n) => {
  for (const tok of n.trim().split(/[\s,]+/)) {
    if (!isFullTok(tok)) continue;
    const low = tok.toLowerCase().replace(/[’'ʼ]/g, "'");
    if (SUFFIXES.some((s) => low.endsWith(s))) return true;
  }
  return false;
};
const hasSlavicFirstName = (n) => {
  for (const t of n.trim().split(/[\s,]+/)) {
    const x = normToken(t);
    if (x && FIRST.has(x)) return true;
  }
  return false;
};

const UNKNOWN = 'Невідомий автор';
const byAuthor = new Map();
for (const b of data.books) {
  if (b.author === UNKNOWN) continue;
  if (!byAuthor.has(b.author)) byAuthor.set(b.author, []);
  byAuthor.get(b.author).push(b);
}
const publicAuthors = [];
for (const [name, books] of byAuthor) {
  if (books.some((b) => b.isPublicDomain !== false)) publicAuthors.push({ name, books });
}

function classify(a) {
  if (FG.has(a.name)) return 'foreign';
  if (UK.has(a.name)) return 'uk';
  if (a.books.some((b) => b.category === 'literature-ukr')) return 'uk';
  if (a.books.some((b) => b.category === 'literature-foreign')) return 'foreign';
  if (hasSlavicFirstName(a.name) || hasSlavicSurname(a.name)) return 'uk';
  return 'foreign';
}

const uk = [], fg = [];
for (const a of publicAuthors) (classify(a) === 'uk' ? uk : fg).push(a.name);
uk.sort((a, b) => a.localeCompare(b, 'uk'));
fg.sort((a, b) => a.localeCompare(b, 'uk'));

console.log(`UK hardcoded: ${UK.size}, FG hardcoded: ${FG.size}, first-names: ${FIRST.size}, suffixes: ${SUFFIXES.length}`);
console.log(`Total public authors: ${publicAuthors.length}`);
console.log(`UK column: ${uk.length}`);
console.log(`FG column: ${fg.length}`);
console.log(`\n--- FOREIGN BUCKET (full) ---`);
for (const n of fg) console.log(n);
