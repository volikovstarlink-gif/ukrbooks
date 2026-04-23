#!/usr/bin/env node
/**
 * Initial heuristic migration of 6112 books from 11 flat categories
 * to the new 12 top-level + sub tree. Uses old category + author + title
 * hints to assign the best-guess top+sub. AI refinement runs after this.
 *
 * Usage:
 *   node scripts/migrate-categories-initial.mjs           # dry run
 *   node scripts/migrate-categories-initial.mjs --apply   # write files
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const CATEGORIES_PATH = join(ROOT, 'src', 'data', 'categories.json');

const APPLY = process.argv.includes('--apply');

// ----------- Known Ukrainian authors (for classic detection) -----------
const UKR_CLASSICS_AUTHORS = new Set([
  'тарас шевченко', 'іван франко', 'леся українка', 'михайло коцюбинський',
  'ольга кобилянська', 'василь стефаник', 'панас мирний', 'іван нечуй-левицький',
  'борис грінченко', 'микола гоголь', 'григорій сковорода', 'іван котляревський',
  'пантелеймон куліш', 'тарас шевченко', 'марко вовчок', 'іван багряний',
  'володимир винниченко', 'михайло грушевський', 'павло тичина', 'максим рильський',
  'володимир сосюра', 'остап вишня', 'юрій яновський', 'олександр довженко',
  'олесь гончар', 'валерʼян підмогильний', 'микола хвильовий', 'євген маланюк',
  'богдан-ігор антонич', 'микола бажан', 'ліна костенко', 'василь стус',
  'іван драч', 'дмитро павличко', 'григір тютюнник',
]);

// ----------- Russian / foreign classic authors (heuristic) -----------
const FOREIGN_CLASSIC_MARKERS = [
  'достоевск', 'толстой', 'чехов', 'пушкин', 'гоголь', 'тургенев', 'булгаков',
  'dostoev', 'tolstoy', 'chekhov', 'hemingway', 'dickens', 'dumas', 'balzac',
  'hugo', 'tolkien', 'orwell', 'kafka', 'camus', 'nietzsche', 'сартр',
  'шекспір', 'shakespeare', 'goethe', 'ґете', 'бальзак',
];

// ----------- Genre keyword patterns (in title + description) -----------
const KEYWORDS = {
  poetry: /\b(поезі|вірш|сонет|балад|ode|poem)\b/i,
  historical: /\b(історич|мемуар|спогад|щоденник|козак|гетьман|упа|оун|бандер|мазеп|січов)\b/i,
  war: /\b(війн|атб|бахмут|маріупол|ато|окуп|донбас|крим)\b/i,
  children: /\b(казк|дитяч|для дітей|малюк|дошкіл|абетк)\b/i,
  fantasy: /\b(фентез|драко|маг|чарівн|ельф|відьм|гномів|чаклун)\b/i,
  scifi: /\b(фантастик|космос|зоряні|робот|кібер|android|inozemets)\b/i,
  horror: /\b(жах|хоррор|horror|nightmare|demon|монстр)\b/i,
  dystopia: /\b(антиутоп|dystop|постапо|apocalyps|1984)\b/i,
  detective: /\b(детектив|слідств|убив|вбивств|slidstvo|crime|murder|розслід)\b/i,
  romance: /\b(кохан|любов|романтич|romance|love)\b/i,
  business: /\b(бізнес|business|стартап|startup|підприємниц|маркетинг|management)\b/i,
  selfhelp: /\b(саморозвит|мотивац|звичк|продуктивн|self-help|psycho)\b/i,
  philosophy: /\b(філософ|релігі|теолог|біблі|коран|буддиз)\b/i,
};

// ----------- Main classification function -----------
function classify(book) {
  const oldCat = book.category;
  const author = (book.author || '').toLowerCase();
  const title = (book.title || '').toLowerCase();
  const desc = ((book.description || book.shortDescription || '')).toLowerCase();
  const corpus = `${title} ${desc}`;
  const year = book.year;
  const isUkrAuthor = Array.from(UKR_CLASSICS_AUTHORS).some((a) => author.includes(a));
  const isForeignMarker = FOREIGN_CLASSIC_MARKERS.some((m) => author.includes(m));

  // -------- Poetry detection (can override any category) --------
  if (KEYWORDS.poetry.test(title)) {
    if (isUkrAuthor || /українськ/i.test(author)) return ['poetry', 'ukrainian-modern'];
    return ['poetry', 'world'];
  }

  // -------- By old category --------
  switch (oldCat) {
    case 'ukr-literature': {
      // Poetry check already above
      if (KEYWORDS.historical.test(corpus)) return ['history', 'ukraine'];
      if (KEYWORDS.war.test(corpus)) return ['literature-ukr', 'war'];
      if (KEYWORDS.children.test(corpus)) return ['children', 'prose'];
      if (year && year < 1960) return ['classics', 'ukrainian'];
      if (isUkrAuthor) return ['classics', 'ukrainian'];
      if (KEYWORDS.detective.test(corpus)) return ['literature-ukr', 'detectives'];
      // Detect non-Ukrainian (English-only title)
      if (/^[a-z\s0-9.,!?'":;()\-]+$/i.test(book.title || '')) return ['other', 'foreign-language'];
      return ['literature-ukr', 'novels'];
    }
    case 'fiction': {
      if (KEYWORDS.scifi.test(corpus)) return ['fantasy', 'sci-fi'];
      if (KEYWORDS.horror.test(corpus)) return ['fantasy', 'mystery-horror'];
      if (KEYWORDS.dystopia.test(corpus)) return ['fantasy', 'dystopia'];
      return ['fantasy', 'fantasy'];
    }
    case 'detective': {
      if (isUkrAuthor || /кокотюх|андр[уу]хович|жадан/i.test(author)) {
        return ['literature-ukr', 'detectives'];
      }
      return ['literature-foreign', 'detectives'];
    }
    case 'romance': {
      if (isUkrAuthor) return ['literature-ukr', 'sentimental'];
      return ['literature-foreign', 'sentimental'];
    }
    case 'classic': {
      if (isUkrAuthor) return ['classics', 'ukrainian'];
      if (isForeignMarker) return ['classics', 'foreign'];
      if (year && year < 1900) return ['classics', 'antique'];
      // Default: most "classic" in current tag are actually modern foreign prose
      return ['literature-foreign', 'novels'];
    }
    case 'children': {
      if (KEYWORDS.poetry.test(corpus)) return ['children', 'poems'];
      if (/казк/i.test(corpus) || /казк/i.test(title)) return ['children', 'fairytales'];
      return ['children', 'prose'];
    }
    case 'history': {
      if (KEYWORDS.war.test(corpus)) return ['history', 'russo-ukrainian-war'];
      if (/мемуар|спогад|щоденник|автобіогра/i.test(corpus)) return ['history', 'memoirs'];
      if (/біограф|життєпис/i.test(corpus)) return ['history', 'biographies'];
      if (/українськ|укра[їі]н|київ|козак|гетьман|оун|упа|мазеп/i.test(corpus)) return ['history', 'ukraine'];
      return ['history', 'world'];
    }
    case 'business':
      return ['business-science', 'business'];
    case 'psychology':
      if (KEYWORDS.selfhelp.test(corpus)) return ['self-help', 'motivation'];
      return ['self-help', 'psychology'];
    case 'science':
      if (/словник|довідник|енциклопед/i.test(title)) return ['business-science', 'reference'];
      return ['business-science', 'science-tech'];
    case 'other': {
      // Try to detect foreign-language first
      if (/^[a-z\s0-9.,!?'":;()\-]+$/i.test(book.title || '')) return ['other', 'foreign-language'];
      if (KEYWORDS.historical.test(corpus) || KEYWORDS.war.test(corpus)) return ['history', 'documents'];
      if (KEYWORDS.poetry.test(corpus)) return ['poetry', 'ukrainian-modern'];
      if (KEYWORDS.philosophy.test(corpus)) return ['nonfiction', 'religion-philosophy'];
      return ['other', 'uncategorized'];
    }
    default:
      return ['other', 'uncategorized'];
  }
}

// ----------- Run -----------
function main() {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  const categories = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf-8'));
  const stats = {};
  const subStats = {};

  for (const book of index.books) {
    const [cat, sub] = classify(book);
    book.category = cat;
    book.subcategory = sub;
    stats[cat] = (stats[cat] || 0) + 1;
    const k = `${cat}/${sub}`;
    subStats[k] = (subStats[k] || 0) + 1;
  }

  // Update bookCount in categories.json
  for (const cat of categories) {
    cat.bookCount = stats[cat.slug] || 0;
    for (const sub of cat.subcategories || []) {
      sub.bookCount = subStats[`${cat.slug}/${sub.slug}`] || 0;
    }
  }

  console.log('=== TOP-LEVEL DISTRIBUTION ===');
  for (const cat of categories) {
    console.log(`  ${cat.slug.padEnd(22)} ${cat.bookCount}`);
  }
  console.log('=== SUB DISTRIBUTION (top 20) ===');
  Object.entries(subStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([k, v]) => console.log(`  ${k.padEnd(35)} ${v}`));

  if (!APPLY) {
    console.log('\n(dry run — pass --apply to write)');
    return;
  }

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
  writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2), 'utf-8');

  let bookFilesUpdated = 0;
  for (const book of index.books) {
    const path = join(BOOKS_DIR, `${book.slug}.json`);
    if (!existsSync(path)) continue;
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    data.category = book.category;
    data.subcategory = book.subcategory;
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    bookFilesUpdated++;
  }
  console.log(`\nApplied. Updated ${bookFilesUpdated} per-book JSONs + index + categories.`);
}

main();
