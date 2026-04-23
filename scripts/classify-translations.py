#!/usr/bin/env python3
"""
Classify books in books-index.json as translations via Claude Haiku 4.5.

For each candidate book (title/description/author mentions переклад/перекладач/
translation/translated), ask Haiku to return:
  {"translatedFrom": "en|fr|de|pl|ru|es|cz|it|ja|other|null",
   "translator": "name or null",
   "confidence": "high|medium|low"}

Writes fields:
  - translatedFrom: language code (null if not a translation or unclear)
  - translator: string (null if unknown)
  - translationConfidence: "high" | "medium" | "low"

Skips books that already have translatedFrom set. Saves every 50 books.

Cost: ~$0.002 per book (Haiku 4.5 + cache on system prompt)
"""
from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock

import anthropic

SITE_ROOT = Path(r"D:\Claude\UkrBooks\Books_Website\ukrbooks")
BOOKS_INDEX = SITE_ROOT / "src" / "data" / "books-index.json"
PER_BOOK_DIR = SITE_ROOT / "src" / "data" / "books"

# Broad pre-filter — anything that might be a translation.
MARKERS = (
    "переклад", "перекл.", "перекладач", "перекладено",
    "translation", "translated", "transl.",
    "з англійської", "з російської", "з польської", "з німецької",
    "з французької", "з іспанської", "з італійської",
    "translated from", "пер. з",
)

HAIKU_SYSTEM = """Ти класифікуєш українські видання книг: чи це переклад іншомовного оригіналу.

Виходячи з назви, автора, опису — визначи:
1. translatedFrom — мова оригіналу (код ISO 639-1): en/fr/de/pl/ru/es/it/ja/cz/other. Якщо книга написана українською автором — null.
2. translator — ім'я перекладача, якщо явно згадано. Інакше null.
3. confidence — high (явно сказано "переклад з X"), medium (автор явно іншомовний — напр. King, Rowling), low (здогад).

ВАЖЛИВО:
- Українські автори (Шевченко, Франко, Забужко, Андрухович, Костенко, Дашвар, Роздобудько тощо) — завжди null, навіть якщо у описі слово "переклад".
- Російськомовні автори доби УРСР, які писали українською — null.
- Діаспорні видання українських авторів — null.
- Якщо опис містить "Translation of Ukrainian book" — null (це переклад з укр, а не на укр).
- Роулінг, Кінг, Толкін, Воннегут, Коельо тощо — автори іншомовні → translatedFrom = відповідна мова.

Поверни ТІЛЬКИ валідний JSON без markdown, без коментарів:
{"translatedFrom": "en", "translator": "Віктор Морозов", "confidence": "high"}
або
{"translatedFrom": null, "translator": null, "confidence": "high"}"""


def log(msg: str) -> None:
    try:
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
    except UnicodeEncodeError:
        sys.stdout.buffer.write((msg + "\n").encode("utf-8", "replace"))


def is_candidate(book: dict) -> bool:
    if book.get("language") and book["language"] != "uk":
        return False
    if "translatedFrom" in book:
        return False
    blob = " ".join([
        str(book.get("title", "")),
        str(book.get("author", "")),
        str(book.get("description", "")),
        str(book.get("shortDescription", "")),
    ]).lower()
    return any(m in blob for m in MARKERS)


def classify(book: dict, client: anthropic.Anthropic) -> dict | None:
    user_msg = (
        f"Назва: {book.get('title', '')[:200]}\n"
        f"Автор: {book.get('author', '')[:100]}\n"
        f"Опис: {(book.get('description') or book.get('shortDescription') or '')[:600]}"
    )

    for attempt in range(4):
        try:
            resp = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=200,
                system=[{
                    "type": "text",
                    "text": HAIKU_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }],
                messages=[{"role": "user", "content": user_msg}],
            )
        except anthropic.RateLimitError:
            time.sleep((2 ** attempt) + random.random())
            continue
        except anthropic.APIError as e:
            if attempt < 2:
                time.sleep(1 + random.random())
                continue
            log(f"  ! api err {book.get('slug')}: {type(e).__name__}")
            return None

        for block in resp.content:
            if block.type == "text":
                text = block.text.strip()
                # strip possible markdown fencing
                text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text).strip()
                try:
                    data = json.loads(text)
                except json.JSONDecodeError:
                    log(f"  ! bad json {book.get('slug')}: {text[:100]}")
                    return None
                # Normalize
                tf = data.get("translatedFrom")
                if tf == "null" or tf == "":
                    tf = None
                tr = data.get("translator")
                if tr in ("null", ""):
                    tr = None
                conf = data.get("confidence") or "low"
                if conf not in ("high", "medium", "low"):
                    conf = "low"
                return {
                    "translatedFrom": tf,
                    "translator": tr,
                    "translationConfidence": conf,
                }
        return None
    return None


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except (OSError, ValueError):
            pass

    ap = argparse.ArgumentParser()
    ap.add_argument("--anthropic-key", default=os.environ.get("ANTHROPIC_API_KEY"))
    ap.add_argument("--index", type=Path, default=BOOKS_INDEX)
    ap.add_argument("--workers", type=int, default=10)
    ap.add_argument("--limit", type=int, default=0,
                    help="Max books to process (0 = all candidates)")
    ap.add_argument("--checkpoint-every", type=int, default=50)
    ap.add_argument("--dry-run", action="store_true",
                    help="Print candidates, do not call API")
    args = ap.parse_args()

    if not args.anthropic_key:
        env_path = SITE_ROOT / ".env.local"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("ANTHROPIC_API_KEY="):
                    args.anthropic_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not args.anthropic_key and not args.dry_run:
        log("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    idx = json.loads(args.index.read_text(encoding="utf-8"))
    books = idx["books"]
    candidates = [b for b in books if is_candidate(b)]
    if args.limit:
        candidates = candidates[: args.limit]
    log(f"Total books: {len(books)}")
    log(f"Candidates for classification: {len(candidates)}")

    if args.dry_run:
        for b in candidates[:10]:
            log(f"  - {b.get('title','')[:60]} | {b.get('author','')[:40]} | {b.get('slug')}")
        log(f"  ... ({len(candidates)} total)")
        return

    if not candidates:
        log("Nothing to classify.")
        return

    client = anthropic.Anthropic(api_key=args.anthropic_key)
    by_slug = {b["slug"]: b for b in books}

    lock = Lock()
    done = 0
    translated = 0
    not_translated = 0
    failed = 0
    by_lang: dict[str, int] = {}
    t0 = time.time()
    total = len(candidates)

    def worker(b: dict):
        result = classify(b, client)
        return b["slug"], result

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(worker, b): b for b in candidates}
        for fut in as_completed(futures):
            try:
                slug, result = fut.result()
            except Exception as e:
                log(f"  ! worker err: {type(e).__name__}: {e}")
                with lock:
                    done += 1
                    failed += 1
                continue

            with lock:
                done += 1
                book = by_slug.get(slug)
                if not book or not result:
                    failed += 1
                else:
                    book["translatedFrom"] = result["translatedFrom"]
                    book["translator"] = result["translator"]
                    book["translationConfidence"] = result["translationConfidence"]
                    if result["translatedFrom"]:
                        translated += 1
                        lang = result["translatedFrom"]
                        by_lang[lang] = by_lang.get(lang, 0) + 1
                    else:
                        not_translated += 1

                if done % args.checkpoint_every == 0 or done == total:
                    rate = done / (time.time() - t0) if time.time() > t0 else 0
                    eta = (total - done) / rate if rate > 0 else 0
                    log(
                        f"  [{done}/{total}] translated={translated} not={not_translated} "
                        f"fail={failed} {rate:.1f}/s eta={eta:.0f}s"
                    )
                    args.index.write_text(
                        json.dumps(idx, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )

    # Final save
    args.index.write_text(
        json.dumps(idx, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Sync per-book JSONs
    synced = 0
    for b in candidates:
        slug = b["slug"]
        cur = by_slug.get(slug)
        if not cur or "translatedFrom" not in cur:
            continue
        per = PER_BOOK_DIR / f"{slug}.json"
        if not per.exists():
            continue
        try:
            pb = json.loads(per.read_text(encoding="utf-8"))
            pb["translatedFrom"] = cur["translatedFrom"]
            pb["translator"] = cur["translator"]
            pb["translationConfidence"] = cur["translationConfidence"]
            per.write_text(
                json.dumps(pb, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            synced += 1
        except Exception as e:
            log(f"  ! sync err {slug}: {e}")

    log("\n=== DONE ===")
    log(f"  translated={translated}  not={not_translated}  fail={failed}  synced={synced}")
    log(f"  by language: {dict(sorted(by_lang.items(), key=lambda x: -x[1]))}")
    log(f"  time: {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
