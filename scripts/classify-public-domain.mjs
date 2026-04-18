/**
 * Classify books as public domain via Wikidata wbsearchentities + wbgetentities.
 * Run: node scripts/classify-public-domain.mjs
 *
 * Strategy:
 *   1. wbsearchentities — search each author name, get candidate entity IDs
 *   2. wbgetentities   — batch-fetch entity claims (50 IDs per request)
 *   3. Check P31=Q5 (human) + P570 (death date)
 *   4. death_year + 70 < CURRENT_YEAR → isPublicDomain = true
 *
 * Cache: scripts/wikidata-cache.json (incremental — safe to re-run)
 * Output: src/data/books-index.json (updated in place)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = join(__dirname, '..');
const BOOKS_FILE = join(ROOT, 'src', 'data', 'books-index.json');
const CACHE_FILE = join(__dirname, 'wikidata-cache.json');

const CURRENT_YEAR  = new Date().getFullYear();
const PD_CUTOFF     = CURRENT_YEAR - 70;   // must have died ≤ this year

const MW_API        = 'https://www.wikidata.org/w/api.php';
const USER_AGENT    = 'UkrBooksClassifier/1.0 (https://ukrbooks.ink; dmca@ukrbooks.ink)';

const CONCURRENCY   = 3;    // parallel wbsearchentities calls
const SEARCH_DELAY  = 400;  // ms between launches
const ENTITY_BATCH  = 50;   // IDs per wbgetentities call
const RETRY_DELAY   = 8000; // ms on 429
const MAX_RETRIES   = 4;

// Wikidata entity ID for "human" (Q5)
const Q_HUMAN = 'Q5';

// Manual overrides: author name → { deathYear: number | null }
// null = alive or unknown → not PD
const MANUAL_OVERRIDES = {
  'Невідомий автор':    { deathYear: null },
};

// ─── helpers ────────────────────────────────────────────────────────────────

const loadCache  = () => existsSync(CACHE_FILE)
  ? (() => { try { return JSON.parse(readFileSync(CACHE_FILE, 'utf8')); } catch { return {}; } })()
  : {};
const saveCache  = (c) => writeFileSync(CACHE_FILE, JSON.stringify(c, null, 2), 'utf8');
const sleep      = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiFetch(params, retries = 0) {
  const url = new URL(MW_API);
  url.search = new URLSearchParams({ format: 'json', ...params }).toString();
  const res  = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } });

  if (res.status === 429 && retries < MAX_RETRIES) {
    const wait = RETRY_DELAY * (retries + 1);
    process.stdout.write(` [429, wait ${wait}ms]`);
    await sleep(wait);
    return apiFetch(params, retries + 1);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── Phase 1: search for entity IDs ─────────────────────────────────────────

/** Returns the best-matching entity ID for an author name, or null. */
async function searchAuthor(name) {
  // Try Ukrainian label first, then Russian (handles mixed-language author names)
  for (const lang of ['uk', 'ru', 'en']) {
    try {
      const data = await apiFetch({
        action: 'wbsearchentities',
        search:   name,
        language: lang,
        type:     'item',
        limit:    '5',
      });

      const hits = data.search ?? [];
      for (const hit of hits) {
        // Match if label or aliases contain the exact name (case-insensitive)
        const label   = (hit.label ?? '').toLowerCase();
        const aliases = (hit.aliases ?? []).map((a) => a.toLowerCase());
        const target  = name.toLowerCase();
        if (label === target || aliases.includes(target)) {
          return hit.id;  // e.g. "Q134046"
        }
      }
    } catch {
      // network error on one language → skip
    }
  }
  return null;
}

// ─── Phase 2: batch-fetch entity claims ─────────────────────────────────────

/** Fetch claims for a batch of entity IDs.
 *  Returns { entityId → { isHuman, deathYear } } */
async function fetchEntityClaims(ids) {
  const data = await apiFetch({
    action: 'wbgetentities',
    ids:    ids.join('|'),
    props:  'claims',
  });

  const result = {};
  for (const [id, entity] of Object.entries(data.entities ?? {})) {
    if (entity.missing !== undefined) { result[id] = null; continue; }

    const claims  = entity.claims ?? {};
    // P31 = instance of — check for Q5 (human)
    const isHuman = (claims.P31 ?? []).some(
      (c) => c.mainsnak?.datavalue?.value?.id === Q_HUMAN
    );
    if (!isHuman) { result[id] = null; continue; }

    // P570 = date of death
    const deathClaim = (claims.P570 ?? [])[0];
    const rawDeath   = deathClaim?.mainsnak?.datavalue?.value?.time;
    // rawDeath format: "+1861-03-10T00:00:00Z"
    const deathYear  = rawDeath ? parseInt(rawDeath.slice(1, 5), 10) : null;

    result[id] = { isHuman: true, deathYear };
  }
  return result;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📚 UkrBooks — Public Domain Classifier');
  console.log(`   PD cutoff: authors who died ≤ ${PD_CUTOFF}\n`);

  const index = JSON.parse(readFileSync(BOOKS_FILE, 'utf8'));
  const cache = loadCache();

  const allAuthors = [...new Set(index.books.map((b) => b.author))];
  const toQuery    = allAuthors.filter(
    (a) => !(a in cache) && !(a in MANUAL_OVERRIDES)
  );

  console.log(`Unique authors     : ${allAuthors.length}`);
  console.log(`Cached already     : ${allAuthors.length - toQuery.length}`);
  console.log(`To query           : ${toQuery.length}`);

  // ── Phase 1: resolve names → entity IDs ────────────────────────────────
  if (toQuery.length > 0) {
    console.log(`\n[Phase 1] Searching author names (${CONCURRENCY} parallel)…`);

    const authorToEntityId = {};   // name → entity ID or null
    let   done = 0;

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < toQuery.length; i += CONCURRENCY) {
      const chunk = toQuery.slice(i, i + CONCURRENCY);
      const tasks = chunk.map((name) =>
        searchAuthor(name).then((id) => { authorToEntityId[name] = id; })
      );
      // Stagger launches
      for (let j = 1; j < tasks.length; j++) await sleep(SEARCH_DELAY);
      await Promise.all(tasks);

      done += chunk.length;
      if (done % 50 === 0 || done === toQuery.length) {
        const found = Object.values(authorToEntityId).filter(Boolean).length;
        console.log(`  ${done}/${toQuery.length} searched, ${found} matched so far`);
      }
      if (i + CONCURRENCY < toQuery.length) await sleep(SEARCH_DELAY);
    }

    const matched = Object.entries(authorToEntityId).filter(([, v]) => v);
    console.log(`\nFound in Wikidata  : ${matched.length}/${toQuery.length}`);

    // Cache authors with no Wikidata match immediately
    for (const [name, id] of Object.entries(authorToEntityId)) {
      if (!id) cache[name] = 'NOT_FOUND';
    }
    saveCache(cache);

    // ── Phase 2: batch-fetch entity claims ─────────────────────────────────
    const entityIds = [...new Set(matched.map(([, id]) => id))];
    console.log(`\n[Phase 2] Fetching claims for ${entityIds.length} entities…`);

    const entityData = {};
    for (let i = 0; i < entityIds.length; i += ENTITY_BATCH) {
      const batch = entityIds.slice(i, i + ENTITY_BATCH);
      try {
        const claims = await fetchEntityClaims(batch);
        Object.assign(entityData, claims);
        console.log(`  Batch ${Math.floor(i / ENTITY_BATCH) + 1}: fetched ${batch.length} entities`);
      } catch (err) {
        console.error(`  ⚠ Batch failed: ${err.message}`);
      }
      if (i + ENTITY_BATCH < entityIds.length) await sleep(1000);
    }

    // ── Map entity data back to author names ─────────────────────────────
    for (const [name, id] of matched) {
      const entity = id ? entityData[id] : null;
      if (!entity) {
        cache[name] = 'NOT_FOUND';
      } else {
        cache[name] = entity.deathYear ?? null;
      }
    }
    saveCache(cache);
  }

  // ── Apply classification ───────────────────────────────────────────────
  let pdCount = 0, nonPdCount = 0, unknownCount = 0;

  const updatedBooks = index.books.map((book) => {
    const name = book.author;

    if (name in MANUAL_OVERRIDES) {
      const { deathYear } = MANUAL_OVERRIDES[name];
      const isPD = deathYear !== null && deathYear <= PD_CUTOFF;
      if (isPD) pdCount++; else nonPdCount++;
      return { ...book, isPublicDomain: isPD, authorDeathYear: deathYear };
    }

    const cached = cache[name];
    if (cached === 'NOT_FOUND' || cached === undefined) {
      unknownCount++;
      return { ...book, isPublicDomain: false, authorDeathYear: null };
    }

    const deathYear = cached !== null ? Number(cached) : null;
    const isPD = deathYear !== null && deathYear <= PD_CUTOFF;
    if (isPD) pdCount++; else nonPdCount++;
    return { ...book, isPublicDomain: isPD, authorDeathYear: deathYear };
  });

  writeFileSync(BOOKS_FILE, JSON.stringify({ ...index, books: updatedBooks }, null, 2), 'utf8');

  console.log('\n✅ Classification complete');
  console.log(`   Public domain      : ${pdCount} books`);
  console.log(`   Under copyright    : ${nonPdCount} books`);
  console.log(`   Not found in Wiki  : ${unknownCount} books (→ non-PD)`);
  console.log('\n   Updated: src/data/books-index.json');
  console.log('   Cache  : scripts/wikidata-cache.json');
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
