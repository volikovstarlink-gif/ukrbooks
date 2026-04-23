#!/usr/bin/env python3
"""
Extract first ~2KB of body text from every book in books-index.json.

Output: scripts/classify-queue/<slug>.json — one file per book with:
  { slug, title, author, year, existingDescription, bodyPreview, isScanned, source }

Then batches into scripts/classify-queue/batch-NNN.json (50 books each) for AI classification.

Handles EPUB, FB2, PDF, TXT. Resumable — skips books whose preview already exists.

Usage:
  python scripts/extract-previews.py               # extract all, create batches
  python scripts/extract-previews.py --limit 50    # first 50 only
  python scripts/extract-previews.py --batch-only  # recreate batches from existing previews
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parent.parent
BOOKS_ROOT = ROOT.parent / "Books"
INDEX_PATH = ROOT / "src" / "data" / "books-index.json"
QUEUE_DIR = ROOT / "scripts" / "classify-queue"
QUEUE_DIR.mkdir(parents=True, exist_ok=True)

PREVIEW_CHARS = 2000
BATCH_SIZE = 50

# ------------------------- Extractors -------------------------

def extract_epub(path: Path) -> str:
    from ebooklib import epub, ITEM_DOCUMENT
    from bs4 import BeautifulSoup

    book = epub.read_epub(str(path), options={"ignore_ncx": True})
    text_parts: list[str] = []
    for item in book.get_items_of_type(ITEM_DOCUMENT):
        soup = BeautifulSoup(item.get_content(), "html.parser")
        for tag in soup(["script", "style", "nav", "header", "footer"]):
            tag.decompose()
        t = soup.get_text(separator=" ", strip=True)
        if t:
            text_parts.append(t)
        if sum(len(x) for x in text_parts) > PREVIEW_CHARS * 3:
            break
    return "\n\n".join(text_parts)


def extract_fb2(path: Path) -> str:
    from lxml import etree

    tree = etree.parse(str(path))
    root = tree.getroot()
    ns = {"fb": "http://www.gribuser.ru/xml/fictionbook/2.0"}
    parts: list[str] = []
    for p in root.iterfind(".//fb:body//fb:p", ns):
        t = "".join(p.itertext()).strip()
        if t:
            parts.append(t)
        if sum(len(x) for x in parts) > PREVIEW_CHARS * 2:
            break
    # fallback: no namespace
    if not parts:
        for p in root.iterfind(".//body//p"):
            t = "".join(p.itertext()).strip()
            if t:
                parts.append(t)
            if sum(len(x) for x in parts) > PREVIEW_CHARS * 2:
                break
    return "\n\n".join(parts)


def extract_pdf(path: Path) -> tuple[str, bool]:
    """Returns (text, is_scanned). is_scanned=True when no text layer."""
    from pdfminer.high_level import extract_text

    try:
        text = extract_text(str(path), maxpages=5)
    except Exception:
        return "", True
    clean = re.sub(r"\s+", " ", text or "").strip()
    is_scanned = len(clean) < 100
    return clean, is_scanned


def extract_txt(path: Path) -> str:
    for enc in ("utf-8", "cp1251", "windows-1251", "latin-1"):
        try:
            return path.read_text(encoding=enc)[: PREVIEW_CHARS * 3]
        except UnicodeDecodeError:
            continue
    return ""


def pick_file(book: dict) -> Optional[tuple[Path, str]]:
    """Return (absolute_path, format) for the best available source file, or None."""
    # Priority: epub > fb2 > txt > pdf
    priority = {"epub": 0, "fb2": 1, "txt": 2, "pdf": 3}
    files = sorted(book.get("files", []), key=lambda f: priority.get(f["format"], 9))
    for f in files:
        p = BOOKS_ROOT / f["fileDir"] / f["filename"]
        if p.exists():
            return p, f["format"]
    return None


# ------------------------- Main loop -------------------------

def extract_preview(book: dict) -> dict:
    picked = pick_file(book)
    out = {
        "slug": book["slug"],
        "title": book["title"],
        "author": book.get("author", ""),
        "year": book.get("year"),
        "existingDescription": (book.get("description") or "")[:800],
        "currentCategory": book.get("category", ""),
        "language": book.get("language", "uk"),
        "bodyPreview": "",
        "isScanned": False,
        "source": "none",
    }
    if not picked:
        return out
    path, fmt = picked
    text = ""
    is_scanned = False
    try:
        if fmt == "epub":
            text = extract_epub(path)
        elif fmt == "fb2":
            text = extract_fb2(path)
        elif fmt == "pdf":
            text, is_scanned = extract_pdf(path)
        elif fmt == "txt":
            text = extract_txt(path)
    except Exception as e:
        out["error"] = f"{type(e).__name__}: {str(e)[:200]}"
    clean = re.sub(r"\s+", " ", text or "").strip()
    out["bodyPreview"] = clean[:PREVIEW_CHARS]
    out["isScanned"] = is_scanned
    out["source"] = fmt
    return out


def write_batches(all_previews: list[dict]) -> int:
    """Group previews into batches of BATCH_SIZE, write to batch-NNN.json files."""
    # Delete stale batch files
    for f in QUEUE_DIR.glob("batch-*.json"):
        f.unlink()
    # Sort by slug for deterministic batching
    all_previews.sort(key=lambda p: p["slug"])
    total = 0
    batch_idx = 0
    for i in range(0, len(all_previews), BATCH_SIZE):
        batch = all_previews[i : i + BATCH_SIZE]
        batch_idx += 1
        out = QUEUE_DIR / f"batch-{batch_idx:03d}.json"
        out.write_text(json.dumps(batch, ensure_ascii=False, indent=2), encoding="utf-8")
        total += len(batch)
    return batch_idx


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--batch-only", action="store_true", help="Skip extraction, only recreate batches")
    args = ap.parse_args()

    index = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    books = index["books"]
    if args.limit:
        books = books[: args.limit]

    if args.batch_only:
        # Re-batch from existing per-book previews
        previews = []
        for f in QUEUE_DIR.glob("*.json"):
            if f.name.startswith("batch-"):
                continue
            previews.append(json.loads(f.read_text(encoding="utf-8")))
        n = write_batches(previews)
        print(f"Re-batched {len(previews)} previews into {n} batches.")
        return 0

    n_total = len(books)
    n_done = 0
    n_skipped = 0
    n_failed = 0
    n_no_file = 0
    previews: list[dict] = []
    for i, book in enumerate(books, 1):
        out_path = QUEUE_DIR / f"{book['slug']}.json"
        if out_path.exists():
            try:
                previews.append(json.loads(out_path.read_text(encoding="utf-8")))
                n_skipped += 1
                continue
            except Exception:
                pass
        data = extract_preview(book)
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        previews.append(data)
        if data["source"] == "none":
            n_no_file += 1
        elif "error" in data:
            n_failed += 1
        else:
            n_done += 1
        if i % 100 == 0 or i == n_total:
            print(f"[{i}/{n_total}] done={n_done} skip={n_skipped} fail={n_failed} nofile={n_no_file}", flush=True)

    n_batches = write_batches(previews)
    print(f"\nSummary:\n  total={n_total} done={n_done} skipped={n_skipped} failed={n_failed} no_file={n_no_file}")
    print(f"  {n_batches} batches written to {QUEUE_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
