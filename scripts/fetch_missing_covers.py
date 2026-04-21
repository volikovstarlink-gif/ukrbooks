#!/usr/bin/env python3
"""
Fetch missing book covers for ukrbooks.

Strategy (try in order; stop as soon as one succeeds):
  1. Open Library — search by title+author, download cover from covers.openlibrary.org
  2. Google Books — search by title+author, download thumbnail from books.google.com
  3. Extract embedded cover from the book file on R2 (prefer EPUB, fall back to FB2)

If none of the three produce a usable image, the book keeps its placeholder.

The script is idempotent — re-running picks up only books that still point
at /covers/placeholder.jpg. Progress is printed live so this can be monitored.

Usage:
    python scripts/fetch_missing_covers.py              # real run
    python scripts/fetch_missing_covers.py --limit 10   # test on 10 books
    python scripts/fetch_missing_covers.py --skip-internet  # only EPUB/FB2 extraction
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from xml.etree import ElementTree

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
BOOKS_INDEX = ROOT / "src" / "data" / "books-index.json"
COVERS_DIR = ROOT / "public" / "covers"
R2_BASE = "https://files.ukrbooks.ink"
PLACEHOLDER = "/covers/placeholder.jpg"

USER_AGENT = "ukrbooks-cover-fetcher/1.0 (+https://ukrbooks.ink)"
HTTP_TIMEOUT = 20
MIN_IMAGE_BYTES = 2048  # anything smaller is probably a blank/tiny placeholder

# Rate-limit politeness
OL_DELAY = 0.6   # Open Library recommends ~100 rpm
GB_DELAY = 0.4


# ---------------------------------------------------------------------------
# Tiny helpers
# ---------------------------------------------------------------------------
def http_get(url: str, timeout: int = HTTP_TIMEOUT) -> tuple[int, bytes, dict]:
    """Return (status, body, headers). Never raises for HTTP errors."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode(), resp.read(), dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read() if e.fp else b"", dict(e.headers or {})
    except Exception as e:
        return 0, str(e).encode(), {}


def looks_like_image(body: bytes) -> str | None:
    """Return 'jpg', 'png', 'webp', or None based on magic bytes."""
    if len(body) < MIN_IMAGE_BYTES:
        return None
    if body[:3] == b"\xff\xd8\xff":
        return "jpg"
    if body[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if body[:4] == b"RIFF" and body[8:12] == b"WEBP":
        return "webp"
    return None


def save_cover(body: bytes, slug: str, ext: str) -> str:
    """Write image bytes to public/covers/{slug}.{ext}; return web path."""
    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    path = COVERS_DIR / f"{slug}.{ext}"
    path.write_bytes(body)
    return f"/covers/{slug}.{ext}"


# ---------------------------------------------------------------------------
# Source 1: Open Library
# ---------------------------------------------------------------------------
def try_open_library(title: str, author: str) -> bytes | None:
    q = urllib.parse.urlencode({"title": title, "author": author, "limit": 3})
    url = f"https://openlibrary.org/search.json?{q}"
    status, body, _ = http_get(url)
    if status != 200:
        return None
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None
    for doc in data.get("docs", []):
        cover_id = doc.get("cover_i")
        if not cover_id:
            continue
        cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
        s, b, _ = http_get(cover_url)
        if s == 200 and looks_like_image(b):
            return b
    return None


# ---------------------------------------------------------------------------
# Source 2: Google Books
# ---------------------------------------------------------------------------
def try_google_books(title: str, author: str) -> bytes | None:
    q = urllib.parse.quote(f'intitle:"{title}" inauthor:"{author}"')
    url = f"https://www.googleapis.com/books/v1/volumes?q={q}&maxResults=3"
    status, body, _ = http_get(url)
    if status != 200:
        return None
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return None
    for item in data.get("items", []):
        img = item.get("volumeInfo", {}).get("imageLinks") or {}
        # Prefer larger variants. thumbnail is typically 128x192; we up-scale the
        # zoom/fife param to get the largest available.
        link = (
            img.get("extraLarge")
            or img.get("large")
            or img.get("medium")
            or img.get("thumbnail")
            or img.get("smallThumbnail")
        )
        if not link:
            continue
        # Google Books serves via books.google.com/books/content?...&zoom=N
        # zoom=0 → largest, 1 → medium, 5 → thumbnail. Request zoom=0.
        link = link.replace("http://", "https://")
        link = re.sub(r"&zoom=\d+", "&zoom=0", link)
        s, b, _ = http_get(link)
        if s == 200 and looks_like_image(b):
            return b
    return None


# ---------------------------------------------------------------------------
# Source 3: Embedded cover from the book file
# ---------------------------------------------------------------------------
def extract_epub_cover(epub_bytes: bytes) -> bytes | None:
    try:
        with zipfile.ZipFile(io.BytesIO(epub_bytes)) as z:
            # Find OPF via container.xml
            try:
                container = z.read("META-INF/container.xml")
            except KeyError:
                return None
            m = re.search(rb'full-path="([^"]+)"', container)
            if not m:
                return None
            opf_path = m.group(1).decode("utf-8")
            opf = z.read(opf_path).decode("utf-8", errors="replace")
            opf_dir = opf_path.rsplit("/", 1)[0] if "/" in opf_path else ""

            # 1) manifest item with properties="cover-image" (EPUB3)
            m = re.search(
                r'<item[^>]+properties="[^"]*cover-image[^"]*"[^>]+href="([^"]+)"',
                opf,
            ) or re.search(
                r'<item[^>]+href="([^"]+)"[^>]+properties="[^"]*cover-image',
                opf,
            )
            if m:
                href = m.group(1)
            else:
                # 2) <meta name="cover" content="ID"> → manifest item with that id
                mm = re.search(r'<meta[^>]+name="cover"[^>]+content="([^"]+)"', opf)
                href = None
                if mm:
                    cover_id = mm.group(1)
                    mh = re.search(
                        rf'<item[^>]+id="{re.escape(cover_id)}"[^>]+href="([^"]+)"',
                        opf,
                    ) or re.search(
                        rf'<item[^>]+href="([^"]+)"[^>]+id="{re.escape(cover_id)}"',
                        opf,
                    )
                    if mh:
                        href = mh.group(1)
                if not href:
                    # 3) Fallback: first image item in manifest
                    mh = re.search(
                        r'<item[^>]+href="([^"]+\.(?:jpe?g|png|webp))"[^>]*media-type="image/',
                        opf,
                        re.IGNORECASE,
                    )
                    if mh:
                        href = mh.group(1)
            if not href:
                return None
            href = urllib.parse.unquote(href)
            full = f"{opf_dir}/{href}" if opf_dir else href
            # Normalize ../ etc.
            parts: list[str] = []
            for p in full.split("/"):
                if p == "..":
                    if parts:
                        parts.pop()
                elif p and p != ".":
                    parts.append(p)
            full = "/".join(parts)
            try:
                return z.read(full)
            except KeyError:
                # Some EPUBs encode filenames differently — fuzzy match
                for name in z.namelist():
                    if name.endswith(href.split("/")[-1]):
                        return z.read(name)
                return None
    except zipfile.BadZipFile:
        return None


def extract_fb2_cover(fb2_bytes: bytes) -> bytes | None:
    # FB2 can be raw XML or inside a ZIP (.fb2.zip). Try both.
    xml = fb2_bytes
    try:
        with zipfile.ZipFile(io.BytesIO(fb2_bytes)) as z:
            for name in z.namelist():
                if name.lower().endswith(".fb2"):
                    xml = z.read(name)
                    break
    except zipfile.BadZipFile:
        pass

    try:
        # FB2 is namespaced XML; use fromstring and strip namespaces for
        # robust XPath.
        text = xml.decode("utf-8", errors="replace")
        text = re.sub(r'\sxmlns(?::\w+)?="[^"]+"', "", text, count=20)
        root = ElementTree.fromstring(text)
    except ElementTree.ParseError:
        return None

    # Find <coverpage><image href="#id"/></coverpage>
    cover_id = None
    for img in root.iter("image"):
        parent_hint = img.get("href") or img.get("{http://www.w3.org/1999/xlink}href")
        if parent_hint and parent_hint.startswith("#"):
            cover_id = parent_hint[1:]
            break
    if not cover_id:
        # First <binary> with image content-type
        for b in root.iter("binary"):
            ct = (b.get("content-type") or "").lower()
            if "image" in ct and b.text:
                try:
                    return base64.b64decode(b.text)
                except Exception:
                    continue
        return None

    for b in root.iter("binary"):
        if b.get("id") == cover_id and b.text:
            try:
                return base64.b64decode(b.text)
            except Exception:
                return None
    return None


def try_file_extraction(files: list[dict]) -> bytes | None:
    """Try EPUB first, then FB2."""
    order = sorted(files, key=lambda f: 0 if f.get("format") == "epub" else 1)
    for f in order:
        fmt = f.get("format")
        if fmt not in ("epub", "fb2"):
            continue
        url = f"{R2_BASE}/{urllib.parse.quote(f['fileDir'])}/{urllib.parse.quote(f['filename'])}"
        status, body, _ = http_get(url, timeout=45)
        if status != 200 or len(body) < 1024:
            continue
        cover = extract_epub_cover(body) if fmt == "epub" else extract_fb2_cover(body)
        if cover and looks_like_image(cover):
            return cover
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="process only first N")
    ap.add_argument("--skip-internet", action="store_true", help="skip OL+GB, go straight to file extraction")
    ap.add_argument("--skip-files", action="store_true", help="skip file extraction step")
    args = ap.parse_args()

    with BOOKS_INDEX.open("r", encoding="utf-8") as fh:
        data = json.load(fh)

    books = data["books"] if isinstance(data, dict) and "books" in data else data
    missing = [b for b in books if b.get("coverImage") == PLACEHOLDER]
    if args.limit:
        missing = missing[: args.limit]

    print(f"Target: {len(missing)} books missing covers", flush=True)
    stats = {"openlibrary": 0, "googlebooks": 0, "file": 0, "failed": 0}
    updated = False

    for i, book in enumerate(missing, 1):
        slug = book["slug"]
        title = book.get("title", "")
        author = book.get("author", "")
        prefix = f"[{i:4d}/{len(missing)}] {slug[:40]:<40}"

        cover_bytes: bytes | None = None
        source = None

        if not args.skip_internet:
            cover_bytes = try_open_library(title, author)
            if cover_bytes:
                source = "openlibrary"
            else:
                time.sleep(OL_DELAY)
                cover_bytes = try_google_books(title, author)
                if cover_bytes:
                    source = "googlebooks"
                else:
                    time.sleep(GB_DELAY)

        if not cover_bytes and not args.skip_files:
            cover_bytes = try_file_extraction(book.get("files", []))
            if cover_bytes:
                source = "file"

        if cover_bytes:
            ext = looks_like_image(cover_bytes) or "jpg"
            web_path = save_cover(cover_bytes, slug, ext)
            book["coverImage"] = web_path
            stats[source] += 1
            updated = True
            print(f"{prefix} OK   {source:<12} -> {web_path}", flush=True)
        else:
            stats["failed"] += 1
            print(f"{prefix} MISS", flush=True)

        # Checkpoint every 25 books
        if updated and i % 25 == 0:
            with BOOKS_INDEX.open("w", encoding="utf-8") as fh:
                json.dump(data, fh, ensure_ascii=False, indent=2)

    if updated:
        with BOOKS_INDEX.open("w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)

    print(
        f"\nDone. OpenLibrary: {stats['openlibrary']}, "
        f"GoogleBooks: {stats['googlebooks']}, "
        f"File: {stats['file']}, "
        f"Failed: {stats['failed']}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
