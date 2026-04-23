#!/usr/bin/env node
/**
 * Curate isFeatured on books so Hero carousel shows top Ukrainian bestsellers.
 *
 * Strategy:
 *  - Hand-curated list of iconic titles known to exist in the catalog.
 *  - Title-only match (more reliable than author transliteration variance).
 *  - Prefer versions with real cover. Cap at 24.
 *
 * Run:
 *   node scripts/curate-hero-featured.mjs           # dry run
 *   node scripts/curate-hero-featured.mjs --apply   # write
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const APPLY = process.argv.includes('--apply');

// Each entry: [titleFragment, optionalAuthorFragment, priority].
// Priority 1 = must-have, 2 = nice-to-have.
// Title fragments are case-insensitive `.includes` matches.
const CURATED = [
  // --- Ukrainian classics ---
  ['захар беркут',    'франко',   1],
  ['бояриня',         'україн',   2],
  ['перехресні стежки','',        2],
  ['тіні забутих',    '',         1],
  ['повне видання творів тараса', '', 2],

  // --- Modern Ukrainian bestsellers ---
  ['солодка даруся',  'матіос',   1],
  ['ворошиловград',   'жадан',    1],
  ['музей покинутих', 'забужко',  1],
  ['польові дослід',  'забужко',  1],
  ['таємниця',        'андрухович', 1],
  ['московіада',      'андрухович', 2],
  ['рекреації',       'андрухович', 2],
  ['нація',           'матіос',   2],
  ['легенди львова',  'винничук', 2],
  ['вогнепальні',     'жадан',    2],
  ['anarchy in the ukr', 'жадан', 2],
  ['подорож на пуп',  'кідрук',   2],
  ['мексиканські хроніки','кідрук', 2],
  ['небратни',        'кідрук',   2],
  ['жорстоке небо',   'кідрук',   2],
  ['пікнік на льоду', 'курков',   2],
  ['червоний',        'кокотюха', 2],
  ['маруся',          'шкляр',    2],
  ['елементал',       'шкляр',    2],
  ['нація',           '',         2],

  // --- Foreign bestsellers in Ukrainian translation ---
  ['1984',             'орвелл',  1],
  ['колгосп тварин',   'орвелл',  1],
  ['гаррі поттер і фiлософський', '', 1],
  ['гаррі поттер і келих', '', 2],
  ['гаррі поттер і напівкровний', '', 2],
  ['гаррі поттер і орден', '', 2],
  ['володар перснів. частина перша', '', 1],
  ['володар перснів. частина друга', '', 2],
  ['володар перснів. частина третя', '', 2],
  ['гра престолів',    'мартін',  1],
  ['сто років самотності', 'маркес', 1],
  ['мовчання ягнят',   'харріс',  2],
  ['над прірвою у житі', 'селінджер', 2],
  ['щоденник анни',    'франк',   2],
  ['сніговик',         'несб',    2],
  ['кров на снігу',    'несб',    2],
  ['мене називають червоний', 'памук', 2],
  ['біла фортеця',     'памук',   2],
  ['чумні ночі',       'памук',   2],
  ['записник з моїми сумними', '', 2],
  ['сяйво',            'кінг',    2],
  ['безсоння',         'кінг',    2],
  ['біллі саммерс',    'кінг',    2],
  ['аутсайдер',        'кінг',    2],
];

function match(book, [title, author]) {
  const a = (book.author || '').toLowerCase();
  const t = (book.title || '').toLowerCase();
  if (title && !t.includes(title)) return false;
  if (author && !a.includes(author)) return false;
  return true;
}

function hasRealCover(book) {
  return book.coverImage && !book.coverImage.includes('placeholder');
}

function main() {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  const featured = [];
  const misses = [];

  for (const pat of CURATED) {
    const hits = index.books.filter((b) => match(b, pat));
    if (hits.length === 0) {
      misses.push(pat);
      continue;
    }
    const withCover = hits.filter(hasRealCover);
    const pick = (withCover[0] || hits[0]);
    if (!featured.some((f) => f.slug === pick.slug)) {
      featured.push({ ...pick, _priority: pat[2] });
    }
  }

  featured.sort((a, b) => {
    if (a._priority !== b._priority) return a._priority - b._priority;
    return a.title.localeCompare(b.title, 'uk');
  });

  const final = featured.slice(0, 24);

  console.log(`=== MATCHED (${final.length} unique / ${CURATED.length} patterns) ===`);
  for (const b of final) {
    console.log(`  [${b._priority}] ${b.title.slice(0, 45).padEnd(45)} — ${b.author.slice(0, 25)}${hasRealCover(b) ? '' : ' (NO COVER)'}`);
  }
  if (misses.length) {
    console.log(`\n=== NOT FOUND (${misses.length}) ===`);
    for (const m of misses) console.log(`  "${m[0]}" by "${m[1] || '*'}"`);
  }

  if (!APPLY) {
    console.log('\n(dry run — pass --apply to write)');
    return;
  }

  const featuredSlugs = new Set(final.map((b) => b.slug));
  let changed = 0;
  for (const book of index.books) {
    const shouldBe = featuredSlugs.has(book.slug);
    if (book.isFeatured !== shouldBe) {
      book.isFeatured = shouldBe;
      changed++;
    }
  }
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');

  let perFileUpdated = 0;
  for (const book of index.books) {
    const p = join(BOOKS_DIR, `${book.slug}.json`);
    if (!existsSync(p)) continue;
    const d = JSON.parse(readFileSync(p, 'utf-8'));
    if (d.isFeatured !== book.isFeatured) {
      d.isFeatured = book.isFeatured;
      writeFileSync(p, JSON.stringify(d, null, 2), 'utf-8');
      perFileUpdated++;
    }
  }
  console.log(`\nApplied: ${changed} index entries, ${perFileUpdated} per-book files updated.`);
}

main();
