#!/usr/bin/env node
/**
 * Apply Sonnet AI classification results to books-index.json + per-book JSONs + categories.json.
 *
 * Reads all scripts/classify-results/batch-*.json, merges into dataset.
 * Books not covered by AI results keep their current heuristic category.
 *
 * Usage:
 *   node scripts/apply-classification.mjs                # dry run
 *   node scripts/apply-classification.mjs --apply        # write
 *   node scripts/apply-classification.mjs --apply --force-low  # apply even low-confidence overrides
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const CATEGORIES_PATH = join(ROOT, 'src', 'data', 'categories.json');
const RESULTS_DIR = join(ROOT, 'scripts', 'classify-results');
const REPORT_PATH = join(ROOT, 'scripts', 'classification-report.md');

const APPLY = process.argv.includes('--apply');
const FORCE_LOW = process.argv.includes('--force-low');

/** Agents sometimes emit sub slugs that aren't in the schema. Normalize
 *  to the closest valid one per top-level. Keeps ~all classifications
 *  usable instead of dumping to "uncategorized". */
const SUB_ALIAS = {
  'literature-ukr': {
    prose: 'novels',
    'historical-fiction': 'historical',
    thriller: 'detectives',
    romance: 'sentimental',
    drama: 'novels',
    poetry: 'novels', // poetry belongs in `poetry/*` top but fallback here if stuck
    short: 'stories',
    short_stories: 'stories',
  },
  'literature-foreign': {
    prose: 'novels',
    'historical-fiction': 'historical',
    thriller: 'detectives',
    romance: 'sentimental',
    drama: 'novels',
    horror: 'novels',
    classics: 'novels',
  },
  classics: {
    modern: 'foreign',
    drama: 'ukrainian',
    poetry: 'poetry-classic',
    'ukr-classics': 'ukrainian',
  },
  fantasy: {
    horror: 'mystery-horror',
    mystery: 'mystery-horror',
    'sci_fi': 'sci-fi',
    scifi: 'sci-fi',
  },
  poetry: {
    classic: 'world',
    modern: 'ukrainian-modern',
    ukrainian: 'ukrainian-modern',
  },
  children: {
    historical: 'prose',
    humor: 'prose',
    puzzle: 'educational',
    poetry: 'poems',
    poem: 'poems',
    mythology: 'fairytales',
    drama: 'prose',
    adventure: 'adventures',
    fantasy: 'prose',
    detective: 'prose',
  },
  teen: {
    romance: 'prose',
    historical: 'prose',
    adventure: 'prose',
    sci_fi: 'fantasy',
    scifi: 'fantasy',
  },
  history: {
    'russo-ukrainian': 'russo-ukrainian-war',
    war: 'russo-ukrainian-war',
    memoir: 'memoirs',
    biography: 'biographies',
    document: 'documents',
  },
  nonfiction: {
    philosophy: 'religion-philosophy',
    religion: 'religion-philosophy',
    arts: 'culture',
    art: 'culture',
    essay: 'essays',
    society: 'politics',
  },
  'self-help': {
    selfhelp: 'motivation',
    'self-development': 'motivation',
    family: 'relationships',
  },
  'business-science': {
    economics: 'business',
    tech: 'science-tech',
    technology: 'science-tech',
    science: 'science-tech',
    dictionary: 'reference',
    encyclopedia: 'reference',
  },
  other: {
    foreign: 'foreign-language',
    unknown: 'uncategorized',
    unclassified: 'uncategorized',
  },
};

/** Top-level aliases (rare). */
const TOP_ALIAS = {
  literature: 'literature-ukr', // ambiguous but most common default
  'ukr-literature': 'literature-ukr',
  fiction: 'fantasy',
  classic: 'classics',
  business: 'business-science',
  science: 'business-science',
  psychology: 'self-help',
};

function normalizeSlugs(topRaw, subRaw, validTops, validSubs) {
  let top = topRaw;
  let sub = subRaw;
  if (!validTops.has(top) && TOP_ALIAS[top]) top = TOP_ALIAS[top];
  if (!validTops.has(top)) return null;
  if (validSubs[top].has(sub)) return [top, sub];
  const alias = (SUB_ALIAS[top] || {})[sub];
  if (alias && validSubs[top].has(alias)) return [top, alias];
  // Last fallback — use first valid sub for this top
  const fallback = Array.from(validSubs[top])[0];
  if (fallback) return [top, fallback];
  return null;
}

function loadResults() {
  if (!existsSync(RESULTS_DIR)) return [];
  const files = readdirSync(RESULTS_DIR).filter((f) => f.startsWith('batch-') && f.endsWith('.json')).sort();
  const all = [];
  for (const f of files) {
    try {
      const arr = JSON.parse(readFileSync(join(RESULTS_DIR, f), 'utf-8'));
      if (!Array.isArray(arr)) {
        console.warn(`  ! ${f}: not an array, skipping`);
        continue;
      }
      for (const r of arr) all.push({ ...r, _batchFile: f });
    } catch (e) {
      console.warn(`  ! ${f}: ${e.message}`);
    }
  }
  return all;
}

function main() {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));
  const categories = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf-8'));
  const validTops = new Set(categories.map((c) => c.slug));
  const validSubs = {};
  for (const c of categories) {
    validSubs[c.slug] = new Set((c.subcategories || []).map((s) => s.slug));
  }

  // Normalize confidence — some agents emit floats (0.95), others strings ("high").
  const normalizeConf = (c) => {
    if (typeof c === 'string') {
      const s = c.toLowerCase();
      if (s === 'high' || s === 'medium' || s === 'low') return s;
      return 'medium';
    }
    if (typeof c === 'number') {
      if (c >= 0.8) return 'high';
      if (c >= 0.5) return 'medium';
      return 'low';
    }
    return 'medium';
  };

  const results = loadResults();
  for (const r of results) r.confidence = normalizeConf(r.confidence);
  console.log(`Loaded ${results.length} classification results from ${RESULTS_DIR}`);
  if (!results.length) {
    console.log('No results to apply. Did you run the Sonnet classifiers?');
    return;
  }

  // Build slug -> result map (last one wins if duplicates)
  const bySlug = new Map();
  let invalid = 0;
  let normalized = 0;
  for (const r of results) {
    if (!r.slug || !r.topCategory || !r.subCategory) {
      invalid++;
      continue;
    }
    const normed = normalizeSlugs(r.topCategory, r.subCategory, validTops, validSubs);
    if (!normed) {
      invalid++;
      continue;
    }
    if (normed[0] !== r.topCategory || normed[1] !== r.subCategory) {
      normalized++;
    }
    r.topCategory = normed[0];
    r.subCategory = normed[1];
    bySlug.set(r.slug, r);
  }
  console.log(`Valid: ${bySlug.size} (normalized: ${normalized}), invalid: ${invalid}`);

  // Stats
  const stats = {};
  const subStats = {};
  const langStats = {};
  const confStats = { high: 0, medium: 0, low: 0 };
  let changed = 0;
  let skippedLow = 0;

  for (const book of index.books) {
    const r = bySlug.get(book.slug);
    if (!r) {
      // Keep existing
      const cat = book.category;
      const sub = book.subcategory;
      stats[cat] = (stats[cat] || 0) + 1;
      subStats[`${cat}/${sub}`] = (subStats[`${cat}/${sub}`] || 0) + 1;
      continue;
    }
    confStats[r.confidence || 'low']++;
    // Skip low-confidence overrides (unless --force-low)
    if (r.confidence === 'low' && !FORCE_LOW) {
      skippedLow++;
      const cat = book.category;
      const sub = book.subcategory;
      stats[cat] = (stats[cat] || 0) + 1;
      subStats[`${cat}/${sub}`] = (subStats[`${cat}/${sub}`] || 0) + 1;
      continue;
    }
    if (book.category !== r.topCategory || book.subcategory !== r.subCategory) {
      changed++;
    }
    book.category = r.topCategory;
    book.subcategory = r.subCategory;
    if (r.detectedLanguage && r.detectedLanguage !== book.language) {
      book.language = r.detectedLanguage;
    }
    book.categoryConfidence = r.confidence;
    stats[r.topCategory] = (stats[r.topCategory] || 0) + 1;
    subStats[`${r.topCategory}/${r.subCategory}`] = (subStats[`${r.topCategory}/${r.subCategory}`] || 0) + 1;
    langStats[r.detectedLanguage || 'unknown'] = (langStats[r.detectedLanguage || 'unknown'] || 0) + 1;
  }

  console.log(`\n=== CONFIDENCE ===`);
  console.log(`  high:   ${confStats.high}`);
  console.log(`  medium: ${confStats.medium}`);
  console.log(`  low:    ${confStats.low} ${FORCE_LOW ? '(applied)' : '(skipped)'}`);
  console.log(`  books changed: ${changed}, low skipped: ${skippedLow}`);

  console.log(`\n=== LANGUAGE DETECTED ===`);
  Object.entries(langStats).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k.padEnd(10)} ${v}`));

  console.log(`\n=== TOP-LEVEL DISTRIBUTION ===`);
  for (const cat of categories) {
    console.log(`  ${cat.slug.padEnd(22)} ${stats[cat.slug] || 0}`);
  }

  console.log(`\n=== SUB DISTRIBUTION (top 25) ===`);
  Object.entries(subStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .forEach(([k, v]) => console.log(`  ${k.padEnd(40)} ${v}`));

  // Update categories.json bookCount
  for (const cat of categories) {
    cat.bookCount = stats[cat.slug] || 0;
    for (const sub of cat.subcategories || []) {
      sub.bookCount = subStats[`${cat.slug}/${sub.slug}`] || 0;
    }
  }

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
    if (book.categoryConfidence) data.categoryConfidence = book.categoryConfidence;
    if (book.language) data.language = book.language;
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
    bookFilesUpdated++;
  }
  console.log(`\nApplied. Updated ${bookFilesUpdated} per-book JSONs + index + categories.`);

  // Write human-readable report
  const lines = [
    `# Classification Report`,
    ``,
    `Applied at ${new Date().toISOString()}. AI-refined ${bySlug.size} books from ${readdirSync(RESULTS_DIR).length} batches.`,
    ``,
    `## Confidence`,
    `- high: ${confStats.high}`,
    `- medium: ${confStats.medium}`,
    `- low: ${confStats.low} (${FORCE_LOW ? 'applied' : 'skipped — using baseline'})`,
    ``,
    `## Top-level distribution`,
    ``,
    ...categories.map((c) => `- **${c.name}** (${c.slug}): ${c.bookCount}`),
    ``,
    `## Language distribution`,
    ``,
    ...Object.entries(langStats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k}: ${v}`),
  ];
  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`Report: ${REPORT_PATH}`);
}

main();
