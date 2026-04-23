#!/usr/bin/env node
// scripts/reclassify-all-with-ai.mjs
//
// Full re-classification of every book in books-index.json via Claude Haiku 4.5.
// Replaces the older rule-based `reclassify-ukr-literature.mjs`: the AI gets
// the title, author, year and stripped description and returns one of the 11
// category slugs, using a tool_use schema for structured output.
//
// Usage:
//   node scripts/reclassify-all-with-ai.mjs                 # dry run, 30 books
//   node scripts/reclassify-all-with-ai.mjs --limit=30       # dry run, 30 books
//   node scripts/reclassify-all-with-ai.mjs --all            # dry run, all 6112
//   node scripts/reclassify-all-with-ai.mjs --all --apply    # full + write files
//
// Flags:
//   --all              process every book (default limits to 30 for a safe check)
//   --limit=N          process first N books
//   --batch-size=N     books per API call (default 30)
//   --workers=N        parallel workers (default 3)
//   --apply            write back to books-index.json, per-slug files, categories.json
//   --resume           skip slugs that already appear in the progress log
//   --only-slugs=a,b   classify only these slugs (comma-separated)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const INDEX_PATH = join(ROOT, 'src', 'data', 'books-index.json');
const BOOKS_DIR = join(ROOT, 'src', 'data', 'books');
const CATEGORIES_PATH = join(ROOT, 'src', 'data', 'categories.json');
const PROGRESS_PATH = join(ROOT, 'scripts', 'reclassify-ai-progress.json');
const LOG_PATH = join(ROOT, 'scripts', 'reclassify-ai-log.json');

const CATEGORY_SLUGS = [
  'ukr-literature', 'fiction', 'detective', 'romance', 'classic',
  'business', 'psychology', 'children', 'science', 'history', 'other',
];

// --- load .env.local (plain parser, no deps) --------------------------------
function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  const txt = readFileSync(envPath, 'utf8');
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (process.env[m[1]]) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
loadEnv();

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY missing in env or .env.local.');
  process.exit(1);
}

// --- args --------------------------------------------------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v === undefined ? true : v];
  })
);
const APPLY = !!args.apply;
const ALL = !!args.all;
const LIMIT = args.limit ? Number(args.limit) : ALL ? Infinity : 30;
const BATCH_SIZE = args['batch-size'] ? Number(args['batch-size']) : 30;
const WORKERS = args.workers ? Number(args.workers) : 3;
const RESUME = !!args.resume;
const ONLY_SLUGS = args['only-slugs']
  ? new Set(String(args['only-slugs']).split(',').map((s) => s.trim()))
  : null;

// --- prompt ------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert librarian classifying Ukrainian-language books into exactly one of 11 library categories. Given metadata (title, author, year, short description) you must pick the single best category slug.

Categories (slug → meaning):
- ukr-literature — works by Ukrainian authors ONLY. Rule #1 priority: if the author is Ukrainian (born in Ukraine OR writes in Ukrainian as native), always pick this, regardless of genre. Examples: Шевченко, Франко, Українка, Коцюбинський, Кобилянська, Стус, Симоненко, Тичина, Кокотюха, Дашвар, Андрухович, Забужко, Жадан, Дереш, Винничук, Шкляр, Кідрук, Костенко, Прохасько, Матіос, Малярчук, Ірванець, Роздобудько, Денисенко, Пагутяк, Гуцало, Винниченко, Багряний, Гончар, Сняданко. A translated foreign author (Ukrainian text, non-Ukrainian author) is NOT ukr-literature.
- classic — world classics pre-~1970 and Nobel laureates: Dickens, Tolstoy (Russian), Dostoevsky (Russian), Flaubert, Hemingway, Orwell, Kafka, Bulgakov, Salinger, Camus, Hugo, Balzac, Mann, Hesse, Joyce, Woolf, Faulkner, Steinbeck, early Márquez, Chekhov, Pushkin, Austen (pre-1900). Andrey Kurkov writes in Russian — classify as classic.
- fiction — sci-fi (Asimov, Heinlein, Dick, Lem, Herbert), fantasy (Tolkien, Sapkowski, Martin, Rothfuss, Jordan, Erikson), horror (King, Koontz, Barker, Hill), magic realism (late Márquez, Rushdie), modern literary fiction (Murakami, Franzen, McCarthy, Atwood, Ishiguro), YA fantasy for teens 13+ (Meyer, Collins, Riordan). NOTE: Harry Potter goes to children, not fiction.
- detective — Christie, Conan Doyle, Chandler, Nesbø, Grisham, Highsmith, Rankin, McFadden, Gerritsen, Flynn, Slaughter, Patterson, Thomas Harris, Lee Child, crime thrillers, mystery.
- romance — Nicholas Sparks, Danielle Steel, Regnery, Hazelwood, Kasten, Mason, contemporary romance, regency, dark romance (Reilly), romantasy. Sarah J. Maas fantasy-romance → fiction if fantasy dominates.
- history — real historical events, biographies of real people, war memoirs, political non-fiction. Grushevsky, Applebaum, Snyder, Plokhy, Churchill memoirs, WW2 non-fiction. Follett's Century trilogy is fiction, not history (even though set in historical times).
- children — for kids 0-13. Harry Potter despite fantasy → children because target audience is children. Astrid Lindgren, Dahl, Keene, Carroll, Milne, early readers, picture books.
- business — non-fiction management/entrepreneurship/finance self-help. Sinek, Collins (Jim), Covey, Graham (Benjamin), Kiyosaki, Ferriss.
- psychology — non-fiction psychology, self-help, therapy, motivation. Carnegie, Peterson (Jordan), Frankl, Kahneman, Brené Brown, Adler.
- science — pop-science, physics, biology, astronomy, medicine (popular). Harari (Sapiens is science), Dawkins, Sagan, Hawking, Mlodinow, Gleick, Greene.
- other — poetry collections, religious texts, dictionaries, reference guides, cookbooks, crafts, technical manuals, very niche. Do not put here if a genre category fits; use as last resort.

Decision order:
1. Is the author Ukrainian? → ukr-literature (overrides everything else).
2. Is the target audience children 0-13? → children.
3. Is it a real historical biography/memoir/non-fiction history? → history.
4. Is it non-fiction on business/psychology/science? → that slug.
5. Is it a romance novel? → romance. A detective/crime novel? → detective.
6. Is it pre-1970 world classic or Nobel laureate? → classic.
7. Modern fiction/sci-fi/fantasy/horror? → fiction.
8. Poetry/religion/reference/cookbook/technical/very niche? → other.

Return every input slug exactly once using the classify_books tool. Do not add or omit any slug. If metadata is too sparse to decide, use the provided "current" category as a fallback hint, but still return something.`;

const CLASSIFY_TOOL = {
  name: 'classify_books',
  description: 'Return the chosen category for every input book slug.',
  input_schema: {
    type: 'object',
    properties: {
      classifications: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slug: { type: 'string' },
            category: { type: 'string', enum: CATEGORY_SLUGS },
          },
          required: ['slug', 'category'],
        },
      },
    },
    required: ['classifications'],
  },
};

// --- data prep ---------------------------------------------------------------
function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function compactBook(b) {
  return {
    slug: b.slug,
    title: (b.title || '').slice(0, 200),
    author: (b.author || '').slice(0, 120),
    year: b.year || 0,
    current: b.category,
    desc: stripHtml(b.description || b.shortDescription || '').slice(0, 240),
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// --- API call ----------------------------------------------------------------
const client = new Anthropic({ apiKey: API_KEY });
const MODEL = 'claude-haiku-4-5-20251001';

async function classifyBatch(batch, batchIdx) {
  const userMsg = `Classify these ${batch.length} books. Return exactly ${batch.length} classifications, one per slug.\n\n${JSON.stringify(batch, null, 1)}`;

  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: Math.max(1024, batch.length * 80),
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        tools: [CLASSIFY_TOOL],
        tool_choice: { type: 'tool', name: 'classify_books' },
        messages: [{ role: 'user', content: userMsg }],
      });
      const toolUse = resp.content.find((c) => c.type === 'tool_use');
      if (!toolUse) throw new Error('no tool_use in response');
      const out = toolUse.input.classifications || [];
      const usage = resp.usage || {};
      return { classifications: out, usage };
    } catch (err) {
      lastErr = err;
      const status = err?.status || err?.response?.status;
      const retryable = status === 429 || status === 529 || status === 500 || status === 503;
      if (!retryable || attempt === 4) {
        console.error(`batch #${batchIdx} failed attempt ${attempt + 1}: ${err.message}`);
        if (!retryable) throw err;
      }
      const delay = Math.min(30000, 1000 * 2 ** attempt) + Math.floor(Math.random() * 500);
      console.error(`batch #${batchIdx} retry in ${delay}ms (status ${status})`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// --- worker pool -------------------------------------------------------------
async function runPool(batches, onBatchDone) {
  let next = 0;
  let completed = 0;
  const total = batches.length;
  const workerIds = Array.from({ length: WORKERS }, (_, i) => i);

  async function worker(wid) {
    while (true) {
      const idx = next++;
      if (idx >= batches.length) return;
      const batch = batches[idx];
      try {
        const { classifications, usage } = await classifyBatch(batch, idx);
        completed++;
        onBatchDone(idx, batch, classifications, usage);
        process.stdout.write(`\r[${completed}/${total}] w${wid} batch ${idx} ok   `);
      } catch (err) {
        completed++;
        console.error(`\n[${completed}/${total}] batch ${idx} FAILED: ${err.message}`);
      }
    }
  }

  await Promise.all(workerIds.map(worker));
  process.stdout.write('\n');
}

// --- main --------------------------------------------------------------------
async function main() {
  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
  const categories = JSON.parse(readFileSync(CATEGORIES_PATH, 'utf8'));

  let progress = {};
  if (RESUME && existsSync(PROGRESS_PATH)) {
    progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
    console.log(`resume: ${Object.keys(progress).length} slugs already classified`);
  }

  let books = index.books;
  if (ONLY_SLUGS) {
    books = books.filter((b) => ONLY_SLUGS.has(b.slug));
  }
  if (RESUME) {
    books = books.filter((b) => !progress[b.slug]);
  }
  if (Number.isFinite(LIMIT)) {
    books = books.slice(0, LIMIT);
  }

  console.log(`model: ${MODEL}`);
  console.log(`books to classify: ${books.length}`);
  console.log(`batch size: ${BATCH_SIZE}, workers: ${WORKERS}`);
  console.log(`apply: ${APPLY ? 'YES — will write files' : 'NO — dry run'}`);
  if (books.length === 0) {
    console.log('no books need API calls — using existing progress for apply.');
  }

  const totalUsage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  const t0 = Date.now();

  if (books.length > 0) {
    const compact = books.map(compactBook);
    const batches = chunk(compact, BATCH_SIZE);
    console.log(`batches: ${batches.length}`);

    function onBatchDone(idx, batch, classifications, usage) {
      const byBatch = new Map(classifications.map((c) => [c.slug, c.category]));
      for (const b of batch) {
        const cat = byBatch.get(b.slug);
        if (!cat || !CATEGORY_SLUGS.includes(cat)) {
          progress[b.slug] = { category: b.current, source: 'fallback', batch: idx };
        } else {
          progress[b.slug] = { category: cat, source: 'ai', batch: idx };
        }
      }
      totalUsage.input_tokens += usage.input_tokens || 0;
      totalUsage.output_tokens += usage.output_tokens || 0;
      totalUsage.cache_read_input_tokens += usage.cache_read_input_tokens || 0;
      totalUsage.cache_creation_input_tokens += usage.cache_creation_input_tokens || 0;
      if (idx % 5 === 0) {
        writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 0));
      }
    }

    await runPool(batches, onBatchDone);
    writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 0));
  }

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\ndone in ${secs}s.`);
  console.log('token usage:');
  console.log(`  input: ${totalUsage.input_tokens}`);
  console.log(`  output: ${totalUsage.output_tokens}`);
  console.log(`  cache_read: ${totalUsage.cache_read_input_tokens}`);
  console.log(`  cache_creation: ${totalUsage.cache_creation_input_tokens}`);
  // Haiku 4.5 pricing: $1/M input, $5/M output, cache read $0.10/M, write $1.25/M
  const cost =
    (totalUsage.input_tokens * 1.0 +
      totalUsage.output_tokens * 5.0 +
      totalUsage.cache_read_input_tokens * 0.1 +
      totalUsage.cache_creation_input_tokens * 1.25) /
    1_000_000;
  console.log(`  estimated cost: $${cost.toFixed(4)}`);

  // ---- summary ------------------------------------------------------------
  const before = {};
  const after = {};
  const changes = [];
  for (const b of index.books) {
    before[b.category] = (before[b.category] || 0) + 1;
    const entry = progress[b.slug];
    const newCat = entry ? entry.category : b.category;
    after[newCat] = (after[newCat] || 0) + 1;
    if (entry && newCat !== b.category) {
      changes.push({ slug: b.slug, title: b.title, author: b.author, from: b.category, to: newCat });
    }
  }

  console.log('\nbookCount before → after:');
  for (const slug of CATEGORY_SLUGS) {
    const b = before[slug] || 0;
    const a = after[slug] || 0;
    const diff = a - b;
    const sign = diff > 0 ? '+' : '';
    console.log(`  ${slug.padEnd(16)} ${String(b).padStart(5)} → ${String(a).padStart(5)}  (${sign}${diff})`);
  }

  console.log(`\nchanges: ${changes.length} books moved`);
  const byPair = {};
  for (const c of changes) {
    const k = `${c.from} → ${c.to}`;
    byPair[k] = (byPair[k] || 0) + 1;
  }
  const pairs = Object.entries(byPair).sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('top transitions:');
  for (const [k, n] of pairs) console.log(`  ${String(n).padStart(4)}  ${k}`);

  console.log('\nfirst 15 changes (for sanity check):');
  for (const c of changes.slice(0, 15)) {
    console.log(`  [${c.from} → ${c.to}]  ${c.author ? c.author + ' — ' : ''}${c.title}`);
  }

  // ---- write log ----------------------------------------------------------
  writeFileSync(LOG_PATH, JSON.stringify({
    model: MODEL,
    finishedAt: new Date().toISOString(),
    totalBooks: index.books.length,
    classified: Object.keys(progress).length,
    changes,
    before,
    after,
    usage: totalUsage,
    estCostUsd: cost,
  }, null, 2));
  console.log(`\nlog written: ${LOG_PATH}`);

  // ---- apply -------------------------------------------------------------
  if (!APPLY) {
    console.log('\nDRY RUN — pass --apply to write files.');
    return;
  }

  console.log('\napplying changes to books-index.json and per-slug files…');
  let touched = 0;
  const existingFiles = new Set(readdirSync(BOOKS_DIR));
  for (const b of index.books) {
    const entry = progress[b.slug];
    if (!entry) continue;
    if (entry.category === b.category) continue;
    b.category = entry.category;
    const fname = `${b.slug}.json`;
    if (existingFiles.has(fname)) {
      const fpath = join(BOOKS_DIR, fname);
      const obj = JSON.parse(readFileSync(fpath, 'utf8'));
      obj.category = entry.category;
      writeFileSync(fpath, JSON.stringify(obj, null, 2));
    }
    touched++;
  }

  index.lastUpdated = new Date().toISOString();
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2));

  const newCounts = {};
  for (const b of index.books) newCounts[b.category] = (newCounts[b.category] || 0) + 1;
  for (const c of categories) {
    c.bookCount = newCounts[c.slug] || 0;
  }
  writeFileSync(CATEGORIES_PATH, JSON.stringify(categories, null, 2));
  console.log(`applied. ${touched} books moved.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
