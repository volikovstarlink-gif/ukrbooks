#!/usr/bin/env python3
"""
Haiku-only retry pass for books that still have empty description after
the main 3-source pipeline. Low concurrency + exponential backoff on 429.
"""
from __future__ import annotations

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

HAIKU_SYSTEM = """Ти генеруєш короткі описи українських книг.

Вимоги:
- Українською мовою
- 2-3 речення (до 280 символів)
- Фактично, без маркетингових кліше
- Без фраз "ця книга", "автор книги", "видання містить" — одразу про суть
- Якщо це діаспорне видання 1920-90-х — згадай контекст

Поверни ТІЛЬКИ опис, без передмов чи коментарів."""


def log(msg: str) -> None:
    sys.stdout.buffer.write((msg + "\n").encode("utf-8", "replace"))
    sys.stdout.flush()


def short_description(desc: str, limit: int = 160) -> str:
    desc = desc.strip()
    if len(desc) <= limit:
        return desc
    cut = desc[:limit]
    m = re.search(r"[.!?](?=[^.!?]*$)", cut)
    if m:
        return cut[: m.end()].strip()
    last_space = cut.rfind(" ")
    if last_space > 40:
        return cut[:last_space].rstrip(",.;:") + "..."
    return cut + "..."


def generate(book: dict, client: anthropic.Anthropic) -> str | None:
    user_msg = (
        f"Назва: {book.get('title', 'Без назви')[:200]}\n"
        f"Автор: {book.get('author', 'Невідомий')[:100]}\n"
        f"Рік: {book.get('year') or '?'}\n"
        f"Категорія: {book.get('category', 'ukr-literature')}"
    )

    for attempt in range(5):
        try:
            resp = client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=400,
                system=[{"type": "text", "text": HAIKU_SYSTEM,
                         "cache_control": {"type": "ephemeral"}}],
                messages=[{"role": "user", "content": user_msg}],
            )
            for block in resp.content:
                if block.type == "text":
                    text = block.text.strip()
                    if len(text) > 280:
                        cut = text[:280]
                        m = re.search(r"[.!?](?=[^.!?]*$)", cut)
                        text = cut[: m.end()].strip() if m else cut.rsplit(" ", 1)[0] + "..."
                    return text
            return None
        except anthropic.RateLimitError:
            backoff = (2 ** attempt) + random.random() * 2
            time.sleep(min(backoff, 30))
            continue
        except (anthropic.APIError, Exception) as e:
            if attempt < 3:
                time.sleep(2 + random.random())
                continue
            log(f"    ! error {book.get('slug')}: {type(e).__name__}")
            return None
    return None


def is_empty(d):
    if not d:
        return True
    s = d.strip()
    return s in ("", "<p></p>", "<p> </p>")


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        env_path = SITE_ROOT / ".env.local"
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("ANTHROPIC_API_KEY="):
                api_key = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if not api_key:
        log("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    idx = json.loads(BOOKS_INDEX.read_text(encoding="utf-8"))
    need = [b for b in idx["books"] if is_empty(b.get("description"))]
    log(f"Candidates still empty: {len(need)}")
    if not need:
        return

    by_slug = {b["slug"]: b for b in idx["books"]}
    lock = Lock()
    done = 0
    ok = 0
    fail = 0
    t0 = time.time()
    total = len(need)

    def worker(b):
        desc = generate(b, client)
        return b["slug"], desc

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(worker, b): b for b in need}
        for fut in as_completed(futures):
            slug, desc = fut.result()
            with lock:
                done += 1
                if desc:
                    book = by_slug.get(slug)
                    if book:
                        book["description"] = desc
                        book["shortDescription"] = short_description(desc)
                    ok += 1
                else:
                    fail += 1
                if done % 20 == 0 or done == total:
                    rate = done / (time.time() - t0)
                    log(f"  [{done}/{total}] ok={ok} fail={fail} {rate:.1f}/s")
                    BOOKS_INDEX.write_text(
                        json.dumps(idx, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )

    BOOKS_INDEX.write_text(
        json.dumps(idx, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Sync per-book JSONs
    synced = 0
    for b in need:
        slug = b["slug"]
        cur = by_slug.get(slug)
        if not cur or is_empty(cur.get("description")):
            continue
        per = PER_BOOK_DIR / f"{slug}.json"
        if not per.exists():
            continue
        try:
            pb = json.loads(per.read_text(encoding="utf-8"))
            pb["description"] = cur["description"]
            pb["shortDescription"] = cur.get("shortDescription", "")
            per.write_text(json.dumps(pb, ensure_ascii=False, indent=2), encoding="utf-8")
            synced += 1
        except Exception as e:
            log(f"  ! sync err {slug}: {e}")

    log(f"\n=== DONE === ok={ok} fail={fail} synced={synced} time={time.time()-t0:.0f}s")


if __name__ == "__main__":
    main()
