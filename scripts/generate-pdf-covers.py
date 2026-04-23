#!/usr/bin/env python3
"""
Extract first-page JPEG covers (800×1200) for PDF-only books that still
have placeholder.jpg as coverImage.

Updates:
  - public/covers/{slug}.jpg
  - src/data/books-index.json  (coverImage field)
  - src/data/books/{slug}.json (coverImage field)

Strategy for locating source PDF: try Books_part2 first (newer diaspora
batch), then Books. If the fileDir/filename combo is missing, skip.
"""
from __future__ import annotations

import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock

import pypdfium2
from PIL import Image

SITE_ROOT = Path(r"D:\Claude\UkrBooks\Books_Website\ukrbooks")
BOOKS_INDEX = SITE_ROOT / "src" / "data" / "books-index.json"
PER_BOOK_DIR = SITE_ROOT / "src" / "data" / "books"
COVERS_DIR = SITE_ROOT / "public" / "covers"
BOOK_ROOTS = [
    Path(r"D:\Claude\UkrBooks\Books_part2"),
    Path(r"D:\Claude\UkrBooks\Books"),
]

TARGET_W, TARGET_H = 800, 1200
JPEG_QUALITY = 82


def log(msg: str) -> None:
    sys.stdout.buffer.write((msg + "\n").encode("utf-8", "replace"))
    sys.stdout.flush()


def locate_pdf(file_dir: str, filename: str) -> Path | None:
    for root in BOOK_ROOTS:
        p = root / file_dir / filename
        if p.exists():
            return p
    return None


def render_cover(pdf_path: Path, out_path: Path) -> bool:
    try:
        pdf = pypdfium2.PdfDocument(str(pdf_path))
        if len(pdf) == 0:
            return False
        page = pdf[0]
        # render at scale that yields >= target height
        # pdf pages are ~612x792 pt at scale=1; scale=2.5 gives ~1530x1980
        img = page.render(scale=2.0).to_pil()
        pdf.close()
    except Exception as e:
        log(f"  ! render error {pdf_path.name}: {type(e).__name__}: {e}")
        return False

    # fit to 800x1200 preserving aspect ratio, then pad or crop
    img_ratio = img.width / img.height
    target_ratio = TARGET_W / TARGET_H
    if abs(img_ratio - target_ratio) < 0.02:
        img = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    elif img_ratio > target_ratio:
        # wider than target -> scale to match height, then center-crop
        new_w = int(TARGET_H * img_ratio)
        img = img.resize((new_w, TARGET_H), Image.LANCZOS)
        x = (new_w - TARGET_W) // 2
        img = img.crop((x, 0, x + TARGET_W, TARGET_H))
    else:
        # taller than target -> scale to match width, then top-crop
        new_h = int(TARGET_W / img_ratio)
        img = img.resize((TARGET_W, new_h), Image.LANCZOS)
        img = img.crop((0, 0, TARGET_W, TARGET_H))

    if img.mode != "RGB":
        img = img.convert("RGB")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    out_path.write_bytes(buf.getvalue())
    return True


def process(book: dict) -> tuple[str, str, str | None]:
    slug = book["slug"]
    files = book.get("files") or []
    if not files:
        return slug, "no-files", None
    f = files[0]
    file_dir = f.get("fileDir") or ""
    filename = f.get("filename") or ""
    if not filename:
        return slug, "no-filename", None

    pdf_path = locate_pdf(file_dir, filename)
    if not pdf_path:
        return slug, "not-found", f"{file_dir}/{filename}"

    out = COVERS_DIR / f"{slug}.jpg"
    if out.exists() and out.stat().st_size > 5000:
        return slug, "already-exists", None

    ok = render_cover(pdf_path, out)
    return slug, "ok" if ok else "render-failed", None


def main() -> None:
    idx = json.loads(BOOKS_INDEX.read_text(encoding="utf-8"))
    books = idx["books"]

    candidates = [
        b for b in books
        if b.get("coverImage") == "/covers/placeholder.jpg"
        and (b.get("files") or [])
        and all(f.get("format") == "pdf" for f in b["files"])
    ]
    log(f"PDF-only candidates needing covers: {len(candidates)}")

    by_slug = {b["slug"]: b for b in books}
    lock = Lock()
    counts = {"ok": 0, "already-exists": 0, "not-found": 0, "render-failed": 0,
              "no-files": 0, "no-filename": 0}
    updated = 0
    done = 0
    total = len(candidates)

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(process, b): b for b in candidates}
        for fut in as_completed(futures):
            try:
                slug, status, detail = fut.result()
            except Exception as e:
                log(f"  ! worker err: {type(e).__name__}: {e}")
                continue
            with lock:
                counts[status] = counts.get(status, 0) + 1
                done += 1
                if status in ("ok", "already-exists"):
                    book = by_slug.get(slug)
                    if book:
                        new_cover = f"/covers/{slug}.jpg"
                        if book.get("coverImage") != new_cover:
                            book["coverImage"] = new_cover
                            updated += 1
                            # also update per-book JSON
                            per = PER_BOOK_DIR / f"{slug}.json"
                            if per.exists():
                                try:
                                    pb = json.loads(per.read_text(encoding="utf-8"))
                                    pb["coverImage"] = new_cover
                                    per.write_text(
                                        json.dumps(pb, ensure_ascii=False, indent=2),
                                        encoding="utf-8",
                                    )
                                except Exception as e:
                                    log(f"  ! per-book save err {slug}: {e}")
                if done % 25 == 0 or done == total:
                    log(f"  [{done}/{total}] ok={counts['ok']} exists={counts['already-exists']} "
                        f"not_found={counts['not-found']} render_failed={counts['render-failed']}")

    log(f"\nUpdated coverImage in index for {updated} books. Saving...")
    BOOKS_INDEX.write_text(
        json.dumps(idx, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    log("=== SUMMARY ===")
    for k, v in counts.items():
        log(f"  {k}: {v}")


if __name__ == "__main__":
    main()
