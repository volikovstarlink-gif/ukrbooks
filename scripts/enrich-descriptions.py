#!/usr/bin/env python3
"""
3-source pipeline for generating book descriptions:
  1. Wikipedia (uk + en) — free, first paragraph if article found
  2. Google Books API — free, description field if book indexed
  3. Claude Haiku 4.5 — always works, ~$0.002/book

Runs in parallel (20 threads). Saves checkpoints every 100 books.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock

import anthropic

SITE_ROOT = Path(r"D:\Claude\UkrBooks\Books_Website\ukrbooks")
BOOKS_INDEX = SITE_ROOT / "src" / "data" / "books-index.json"
USER_AGENT = "UkrBooks/1.0 (https://ukrbooks.ink)"

HAIKU_SYSTEM = """Ти генеруєш короткі описи українських книг.

Вимоги:
- Українською мовою
- 2-3 речення (до 280 символів)
- Фактично, без маркетингових кліше
- Без фраз "ця книга", "автор книги", "видання містить" — одразу про суть
- Якщо це діаспорне видання 1920-90-х — згадай контекст

Поверни ТІЛЬКИ опис, без передмов чи коментарів."""


def log(msg: str) -> None:
    try:
        sys.stdout.write(msg + "\n")
        sys.stdout.flush()
    except UnicodeEncodeError:
        sys.stdout.buffer.write((msg + "\n").encode("utf-8", "replace"))


# ───────── Wikipedia ─────────

def fetch_wikipedia(title: str, author: str, lang: str = "uk") -> str | None:
    """Search Wikipedia, return opening paragraph if found."""
    # Try title + author as query
    query = f"{title} {author}".strip()[:200]
    search_url = (
        f"https://{lang}.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode({
            "action": "query",
            "format": "json",
            "list": "search",
            "srsearch": query,
            "srlimit": 1,
            "srprop": "snippet",
        })
    )
    try:
        req = urllib.request.Request(search_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, json.JSONDecodeError):
        return None

    hits = data.get("query", {}).get("search", [])
    if not hits:
        return None
    page_title = hits[0].get("title")
    if not page_title:
        return None

    # Fetch the opening paragraph
    extract_url = (
        f"https://{lang}.wikipedia.org/w/api.php?"
        + urllib.parse.urlencode({
            "action": "query",
            "format": "json",
            "titles": page_title,
            "prop": "extracts",
            "exintro": 1,
            "explaintext": 1,
            "redirects": 1,
        })
    )
    try:
        req = urllib.request.Request(extract_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, json.JSONDecodeError):
        return None

    pages = data.get("query", {}).get("pages", {})
    for _pid, page in pages.items():
        extract = page.get("extract") or ""
        extract = re.sub(r"\s+", " ", extract).strip()
        if len(extract) >= 120:
            # Take first 2-3 sentences, max 400 chars
            sentences = re.split(r"(?<=[.!?])\s+", extract)
            result = ""
            for s in sentences:
                if len(result) + len(s) + 1 > 400:
                    break
                result = (result + " " + s).strip() if result else s
            if len(result) >= 100:
                return result
    return None


# ───────── Google Books ─────────

def fetch_google_books(title: str, author: str, api_key: str) -> str | None:
    """Search Google Books, return description if found."""
    q_parts = [f'intitle:"{title[:80]}"']
    if author and author != "Невідомий автор":
        words = [w for w in author.split() if len(w) >= 3]
        if words:
            q_parts.append(f'inauthor:"{max(words, key=len)}"')
    url = (
        "https://www.googleapis.com/books/v1/volumes?"
        + urllib.parse.urlencode({
            "q": " ".join(q_parts),
            "key": api_key,
            "maxResults": "3",
        })
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 429:
            time.sleep(2)
        return None
    except (urllib.error.URLError, OSError, json.JSONDecodeError):
        return None

    for item in (data.get("items") or [])[:3]:
        desc = (item.get("volumeInfo") or {}).get("description")
        if desc:
            desc = re.sub(r"<[^>]+>", "", desc)
            desc = re.sub(r"\s+", " ", desc).strip()
            if len(desc) >= 80:
                return desc[:500]
    return None


# ───────── Claude Haiku ─────────

def generate_claude(book: dict, client: anthropic.Anthropic) -> str | None:
    """Generate description via Claude Haiku 4.5 with prompt caching on system."""
    user_msg = f"""Назва: {book.get('title', 'Без назви')[:200]}
Автор: {book.get('author', 'Невідомий')[:100]}
Рік: {book.get('year') or '?'}
Категорія: {book.get('category', 'ukr-literature')}"""

    try:
        resp = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=400,
            system=[
                {
                    "type": "text",
                    "text": HAIKU_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[{"role": "user", "content": user_msg}],
        )
    except anthropic.RateLimitError:
        time.sleep(5)
        return None
    except (anthropic.APIError, Exception) as e:
        log(f"    ! haiku error: {type(e).__name__}")
        return None

    for block in resp.content:
        if block.type == "text":
            text = block.text.strip()
            # Limit to 280 chars
            if len(text) > 280:
                cut = text[:280]
                m = re.search(r"[.!?](?=[^.!?]*$)", cut)
                text = cut[: m.end()].strip() if m else cut.rsplit(" ", 1)[0] + "..."
            return text
    return None


# ───────── Pipeline ─────────

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


def process_book(book: dict, gb_key: str, anthropic_client: anthropic.Anthropic) -> tuple[str, dict]:
    """Try all 3 sources in order. Returns (slug, {description, source})."""
    slug = book["slug"]

    # 1. Wikipedia (uk, then en)
    desc = fetch_wikipedia(book.get("title", ""), book.get("author", ""), "uk")
    if desc:
        return slug, {"description": desc, "source": "wikipedia:uk"}

    desc = fetch_wikipedia(book.get("title", ""), book.get("author", ""), "en")
    if desc:
        return slug, {"description": desc, "source": "wikipedia:en"}

    # 2. Google Books
    desc = fetch_google_books(book.get("title", ""), book.get("author", ""), gb_key)
    if desc:
        return slug, {"description": desc, "source": "google_books"}

    # 3. Claude Haiku
    desc = generate_claude(book, anthropic_client)
    if desc:
        return slug, {"description": desc, "source": "claude_haiku"}

    return slug, {"description": None, "source": None}


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except (OSError, ValueError):
            pass

    ap = argparse.ArgumentParser()
    ap.add_argument("--google-key", default=os.environ.get("GOOGLE_BOOKS_API_KEY"))
    ap.add_argument("--anthropic-key", default=os.environ.get("ANTHROPIC_API_KEY"))
    ap.add_argument("--index", type=Path, default=BOOKS_INDEX)
    ap.add_argument("--workers", type=int, default=20)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--checkpoint-every", type=int, default=100)
    args = ap.parse_args()

    # Load env.local if keys missing
    if not args.google_key or not args.anthropic_key:
        env_path = SITE_ROOT / ".env.local"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.strip().startswith("#"):
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k == "GOOGLE_BOOKS_API_KEY" and not args.google_key:
                        args.google_key = v
                    elif k == "ANTHROPIC_API_KEY" and not args.anthropic_key:
                        args.anthropic_key = v

    if not args.google_key:
        log("ERROR: GOOGLE_BOOKS_API_KEY not set")
        sys.exit(1)
    if not args.anthropic_key:
        log("ERROR: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=args.anthropic_key)

    idx = json.loads(args.index.read_text(encoding="utf-8"))

    def is_empty(d):
        if not d:
            return True
        s = d.strip()
        return s in ("", "<p></p>", "<p> </p>")

    need = [b for b in idx["books"] if is_empty(b.get("description"))]
    if args.limit:
        need = need[: args.limit]
    log(f"Candidates: {len(need)}")

    lock = Lock()
    counts = {"wikipedia:uk": 0, "wikipedia:en": 0, "google_books": 0, "claude_haiku": 0, "failed": 0}
    completed = 0
    t0 = time.time()

    by_slug = {b["slug"]: b for b in idx["books"]}

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(process_book, b, args.google_key, client): b for b in need}
        for fut in as_completed(futures):
            try:
                slug, result = fut.result()
            except Exception as e:
                log(f"  ! worker error: {type(e).__name__}: {e}")
                completed += 1
                counts["failed"] += 1
                continue

            with lock:
                completed += 1
                if result["description"]:
                    book = by_slug.get(slug)
                    if book:
                        book["description"] = result["description"]
                        book["shortDescription"] = short_description(result["description"])
                    counts[result["source"]] += 1
                else:
                    counts["failed"] += 1

                if completed % args.checkpoint_every == 0:
                    elapsed = time.time() - t0
                    rate = completed / elapsed
                    eta = (len(need) - completed) / rate if rate > 0 else 0
                    log(
                        f"  [{completed}/{len(need)}] "
                        + f"wiki_uk={counts['wikipedia:uk']} wiki_en={counts['wikipedia:en']} "
                        + f"gb={counts['google_books']} haiku={counts['claude_haiku']} "
                        + f"fail={counts['failed']}  {rate:.1f}/s eta={eta:.0f}s"
                    )
                    # Periodic save
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
    per_dir = SITE_ROOT / "src" / "data" / "books"
    synced = 0
    for b in need:
        slug = b["slug"]
        updated = by_slug.get(slug)
        if not updated or not updated.get("description"):
            continue
        per = per_dir / f"{slug}.json"
        if not per.exists():
            continue
        try:
            pb = json.loads(per.read_text(encoding="utf-8"))
            pb["description"] = updated["description"]
            pb["shortDescription"] = updated.get("shortDescription", "")
            per.write_text(json.dumps(pb, ensure_ascii=False, indent=2), encoding="utf-8")
            synced += 1
        except Exception as e:
            log(f"  ! per-book sync err {slug}: {e}")
    log(f"Synced {synced} per-book JSONs")

    log("\n=== SUMMARY ===")
    for k, v in counts.items():
        log(f"  {k}: {v}")
    log(f"  total time: {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
