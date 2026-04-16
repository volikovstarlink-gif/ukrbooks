#!/usr/bin/env python3
"""
Generate book catalog JSON files from the D:\\Cursor\\Books folder.

Scans the Books folder, extracts metadata from EPUB/FB2 files,
and generates JSON data files for the UkrBooks Next.js website.

Usage:
  python scripts/generate_catalog.py
  python scripts/generate_catalog.py --books-dir "D:\\Cursor\\Books" --clean
  python scripts/generate_catalog.py --dry-run
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import os
import re
import shutil
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
DEFAULT_BOOKS_DIR = Path(r"D:\Cursor\Books")
DEFAULT_OUTPUT_DIR = Path(r"D:\Cursor\Books_Website\ukrbooks\src\data\books")
DEFAULT_COVERS_DIR = Path(r"D:\Cursor\Books_Website\ukrbooks\public\covers")
DEFAULT_CATEGORIES_PATH = Path(r"D:\Cursor\Books_Website\ukrbooks\src\data\categories.json")
DEFAULT_FEATURED_PATH = Path(r"D:\Cursor\Books_Website\ukrbooks\src\data\featured.json")

BOOK_EXTS = {".epub", ".fb2", ".pdf", ".txt"}
COVER_EXTS = {".jpg", ".jpeg", ".png"}

STRIP_HTML_RE = re.compile(r"<[^>]+>")
MULTI_SPACE_RE = re.compile(r"\s+")

# Ukrainian → Latin transliteration table (matches download_collection.py)
_UK_TR = str.maketrans(
    {
        "А": "A", "а": "a", "Б": "B", "б": "b", "В": "V", "в": "v",
        "Г": "H", "г": "h", "Ґ": "G", "ґ": "g", "Д": "D", "д": "d",
        "Е": "E", "е": "e", "Є": "Ye", "є": "ie", "Ж": "Zh", "ж": "zh",
        "З": "Z", "з": "z", "И": "Y", "и": "y", "І": "I", "і": "i",
        "Ї": "Yi", "ї": "i", "Й": "Y", "й": "i", "К": "K", "к": "k",
        "Л": "L", "л": "l", "М": "M", "м": "m", "Н": "N", "н": "n",
        "О": "O", "о": "o", "П": "P", "п": "p", "Р": "R", "р": "r",
        "С": "S", "с": "s", "Т": "T", "т": "t", "У": "U", "у": "u",
        "Ф": "F", "ф": "f", "Х": "Kh", "х": "kh", "Ц": "Ts", "ц": "ts",
        "Ч": "Ch", "ч": "ch", "Ш": "Sh", "ш": "sh", "Щ": "Shch", "щ": "shch",
        "Ь": "", "ь": "", "Ю": "Yu", "ю": "iu", "Я": "Ya", "я": "ia",
        "ʼ": "", "'": "", "'": "", "«": "", "»": "", "—": "-", "–": "-",
    }
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def strip_html(text: str) -> str:
    t = STRIP_HTML_RE.sub(" ", text)
    t = html_mod.unescape(t)
    return MULTI_SPACE_RE.sub(" ", t).strip()


def make_author_slug(author: str) -> str:
    s = author.translate(_UK_TR)
    s = re.sub(r"[^\w\s\-]", "", s, flags=re.UNICODE)
    s = re.sub(r"\s+", "-", s.strip()).lower()
    s = re.sub(r"-+", "-", s)
    return s[:80] or "unknown"


def extract_slug(filename: str) -> str:
    """Extract the book slug (grouping key) from a filename."""
    base = os.path.splitext(filename)[0]
    # Remove __cover suffix
    if base.endswith("__cover"):
        base = base[: -len("__cover")]
    # knigogo pattern: "slug - Title"
    if " - " in base:
        return base.split(" - ")[0].strip()
    # uabooks pattern: "slug-id__TranslitTitle" or "slug-id__TranslitTitle__slug"
    if "__" in base:
        return base.split("__")[0].strip()
    return base.strip()


def file_size_mb(filepath: str) -> float:
    size = os.path.getsize(filepath)
    return round(size / 1048576, 1)


# ---------------------------------------------------------------------------
# Metadata extraction
# ---------------------------------------------------------------------------

def extract_epub_metadata(epub_path: str) -> dict | None:
    """Extract title, author, language, description from EPUB OPF metadata."""
    try:
        with zipfile.ZipFile(epub_path, "r") as zf:
            # Find OPF via container.xml
            opf_path = None
            try:
                container_xml = zf.read("META-INF/container.xml").decode("utf-8", "replace")
                container = ElementTree.fromstring(container_xml)
                ns = {"c": "urn:oasis:names:tc:opendocument:xmlns:container"}
                rootfile = container.find(".//c:rootfile", ns)
                if rootfile is not None:
                    opf_path = rootfile.get("full-path")
            except (KeyError, ElementTree.ParseError):
                pass

            # Fallback: search for .opf file
            if not opf_path:
                for name in zf.namelist():
                    if name.endswith(".opf"):
                        opf_path = name
                        break

            if not opf_path:
                return None

            opf_content = zf.read(opf_path).decode("utf-8", "replace")
            root = ElementTree.fromstring(opf_content)
            dc = "http://purl.org/dc/elements/1.1/"

            title = root.findtext(f".//{{{dc}}}title", "").strip()
            creator = root.findtext(f".//{{{dc}}}creator", "").strip()
            language = root.findtext(f".//{{{dc}}}language", "").strip()
            description = root.findtext(f".//{{{dc}}}description", "").strip()

            if not title:
                return None

            return {
                "title": title,
                "author": creator or "",
                "language": language,
                "description": description,
            }
    except (zipfile.BadZipFile, OSError, ElementTree.ParseError):
        return None


def extract_fb2_metadata(fb2_path: str) -> dict | None:
    """Extract title, author from FB2 XML."""
    try:
        with open(fb2_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read(50000)  # Read first 50KB for metadata

        # FB2 namespace
        ns_match = re.search(r'xmlns="([^"]+)"', content)
        ns = ns_match.group(1) if ns_match else "http://www.gribuser.ru/xml/fictionbook/2.0"

        # Parse just the description section
        desc_match = re.search(r"(<description>.*?</description>)", content, re.DOTALL)
        if not desc_match:
            return None

        desc_xml = desc_match.group(1)
        # Wrap in a root with namespace for parsing
        wrapped = f'<root xmlns="{ns}">{desc_xml}</root>'

        try:
            root = ElementTree.fromstring(wrapped)
        except ElementTree.ParseError:
            # Try without namespace
            try:
                root = ElementTree.fromstring(f"<root>{desc_xml}</root>")
                ns = ""
            except ElementTree.ParseError:
                return None

        prefix = f"{{{ns}}}" if ns else ""

        title_info = root.find(f".//{prefix}title-info")
        if title_info is None:
            return None

        book_title = title_info.findtext(f"{prefix}book-title", "").strip()

        # Author: first-name + last-name
        author_el = title_info.find(f"{prefix}author")
        author_parts = []
        if author_el is not None:
            fn = author_el.findtext(f"{prefix}first-name", "").strip()
            ln = author_el.findtext(f"{prefix}last-name", "").strip()
            if fn:
                author_parts.append(fn)
            if ln:
                author_parts.append(ln)

        lang = title_info.findtext(f"{prefix}lang", "").strip()

        annotation = title_info.find(f"{prefix}annotation")
        description = ""
        if annotation is not None:
            description = strip_html(ElementTree.tostring(annotation, encoding="unicode", method="text") or "")

        if not book_title:
            return None

        return {
            "title": book_title,
            "author": " ".join(author_parts),
            "language": lang,
            "description": description,
        }
    except (OSError, UnicodeDecodeError):
        return None


def title_from_filename(filename: str) -> str:
    """Guess a readable title from a filename."""
    base = os.path.splitext(filename)[0]
    # knigogo: "slug - Ukrainian Title" or "slug - Title__Author"
    if " - " in base:
        title_part = base.split(" - ", 1)[1]
        if "__" in title_part:
            title_part = title_part.split("__")[0]
        return title_part.strip()
    # uabooks: "slug-id__TranslitTitle" or "slug-id__TranslitTitle__slug"
    if "__" in base:
        parts = base.split("__")
        title_part = parts[1] if len(parts) > 1 else parts[0]
        # Convert underscores to spaces
        return title_part.replace("_", " ").strip()
    return base.replace("-", " ").replace("_", " ").strip()


# ---------------------------------------------------------------------------
# Scanning and grouping
# ---------------------------------------------------------------------------

def scan_books_dir(books_dir: Path) -> dict[str, dict]:
    """
    Scan the books directory and group files by book slug.
    Returns: {slug: {"dir": str, "files": {ext: filepath}, "cover": filepath|None}}
    """
    books: dict[str, dict] = {}

    for letter_dir in sorted(books_dir.iterdir()):
        if not letter_dir.is_dir():
            continue
        dirname = letter_dir.name
        # Skip hidden/special files
        if dirname.startswith("."):
            continue

        for filepath in letter_dir.iterdir():
            if not filepath.is_file():
                continue

            filename = filepath.name
            ext = filepath.suffix.lower()

            # Determine if this is a cover image
            is_cover = False
            if ext in COVER_EXTS:
                name_lower = filename.lower()
                if "__cover." in name_lower or name_lower.endswith(f"__cover{ext}"):
                    is_cover = True
                else:
                    continue  # Skip non-cover images

            # Skip files that aren't books or covers
            if not is_cover and ext not in BOOK_EXTS:
                continue

            slug = extract_slug(filename)
            if not slug:
                continue

            if slug not in books:
                books[slug] = {
                    "dir": str(letter_dir),
                    "files": {},
                    "cover": None,
                    "all_filenames": {},
                }

            if is_cover:
                books[slug]["cover"] = str(filepath)
            elif ext in BOOK_EXTS:
                fmt = ext.lstrip(".")
                # Prefer the first file found for each format
                if fmt not in books[slug]["files"]:
                    books[slug]["files"][fmt] = str(filepath)
                    books[slug]["all_filenames"][fmt] = filename

    return books


# ---------------------------------------------------------------------------
# JSON generation
# ---------------------------------------------------------------------------

def generate_book_json(
    slug: str,
    book_data: dict,
    today: str,
) -> dict | None:
    """Generate a single book JSON dict matching the Book interface."""
    files_map = book_data["files"]
    cover_path = book_data["cover"]

    if not files_map:
        return None

    # Extract metadata - priority: epub > fb2 > filename
    metadata = None
    if "epub" in files_map:
        metadata = extract_epub_metadata(files_map["epub"])
    if metadata is None and "fb2" in files_map:
        metadata = extract_fb2_metadata(files_map["fb2"])

    # Fallback to filename
    if metadata is None:
        # Use any available file for title extraction
        any_file = next(iter(book_data["all_filenames"].values()))
        metadata = {
            "title": title_from_filename(any_file),
            "author": "",
            "language": "uk",
            "description": "",
        }

    title = metadata["title"]
    author = metadata["author"] or "Невідомий автор"

    # Clean description
    raw_desc = metadata.get("description", "")
    clean_desc = strip_html(raw_desc) if raw_desc else ""

    if clean_desc:
        description = f"<p>{clean_desc[:1000]}</p>"
        # Short description: first ~150 chars at sentence boundary
        short = clean_desc[:200]
        dot_pos = short.rfind(".")
        if dot_pos > 80:
            short = short[: dot_pos + 1]
        elif len(clean_desc) > 200:
            short = short.rstrip() + "..."
        short_description = short
    else:
        description = f"<p>«{title}» — книга автора {author}.</p>"
        short_description = f"«{title}» — книга автора {author}."

    # Build files array
    book_files = []
    for fmt in ["epub", "fb2", "pdf", "txt"]:
        if fmt in files_map:
            book_files.append({
                "format": fmt,
                "filename": book_data["all_filenames"][fmt],
                "sizeMb": file_size_mb(files_map[fmt]),
            })

    # Cover image
    if cover_path:
        cover_ext = os.path.splitext(cover_path)[1].lower()
        if cover_ext == ".png":
            cover_image = f"/covers/{slug}.png"
        else:
            cover_image = f"/covers/{slug}.jpg"
    else:
        cover_image = "placeholder"

    author_slug = make_author_slug(author)

    # Formats string for meta
    formats_str = ", ".join(f.upper() for f in ["epub", "fb2", "pdf", "txt"] if f in files_map)

    return {
        "id": slug,
        "slug": slug,
        "title": title,
        "author": author,
        "authorSlug": author_slug,
        "description": description,
        "shortDescription": short_description,
        "category": "other",
        "tags": [],
        "language": "uk",
        "year": 0,
        "coverImage": cover_image,
        "files": book_files,
        "isFeatured": False,
        "isNewArrival": False,
        "downloadCount": 0,
        "rating": 0,
        "addedAt": today,
        "metaTitle": f"{title} — {author} | Завантажити {formats_str}",
        "metaDescription": f"Завантажте «{title}» автора {author} безкоштовно у форматах {formats_str}.",
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate UkrBooks catalog from Books folder")
    parser.add_argument("--books-dir", type=Path, default=DEFAULT_BOOKS_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--covers-dir", type=Path, default=DEFAULT_COVERS_DIR)
    parser.add_argument("--categories-path", type=Path, default=DEFAULT_CATEGORIES_PATH)
    parser.add_argument("--featured-path", type=Path, default=DEFAULT_FEATURED_PATH)
    parser.add_argument("--clean", action="store_true", help="Remove existing book JSONs first")
    parser.add_argument("--dry-run", action="store_true", help="Don't write files")
    parser.add_argument("--default-category", default="other")
    args = parser.parse_args()

    today = "2026-04-09"

    print(f"Scanning books in: {args.books_dir}")
    print(f"Output JSON dir:   {args.output_dir}")
    print(f"Covers dir:        {args.covers_dir}")
    print()

    # Step 1: Scan and group files
    print("Step 1: Scanning books directory...")
    book_groups = scan_books_dir(args.books_dir)
    print(f"  Found {len(book_groups)} book groups")

    # Step 2: Clean existing data if requested
    if args.clean and not args.dry_run:
        print("Step 2: Cleaning existing book JSONs...")
        existing = list(args.output_dir.glob("*.json"))
        for f in existing:
            f.unlink()
        print(f"  Removed {len(existing)} existing JSON files")
    else:
        print("Step 2: Skipping cleanup")

    # Step 3: Generate JSONs and copy covers
    print("Step 3: Generating catalog...")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    args.covers_dir.mkdir(parents=True, exist_ok=True)

    generated = 0
    covers_copied = 0
    errors = 0
    no_metadata = 0

    slugs_seen: set[str] = set()

    for i, (slug, book_data) in enumerate(sorted(book_groups.items())):
        if (i + 1) % 200 == 0:
            print(f"  Processing {i + 1}/{len(book_groups)}...")

        # Skip duplicate slugs
        if slug in slugs_seen:
            continue
        slugs_seen.add(slug)

        try:
            book_json = generate_book_json(slug, book_data, today)
            if book_json is None:
                no_metadata += 1
                continue

            # Write JSON
            if not args.dry_run:
                json_path = args.output_dir / f"{slug}.json"
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(book_json, f, ensure_ascii=False, indent=2)

            # Copy cover
            cover_src = book_data["cover"]
            if cover_src and not args.dry_run:
                src_ext = os.path.splitext(cover_src)[1].lower()
                if src_ext == ".png":
                    dst_name = f"{slug}.png"
                else:
                    dst_name = f"{slug}.jpg"
                dst_path = args.covers_dir / dst_name
                if not dst_path.exists():
                    shutil.copy2(cover_src, dst_path)
                    covers_copied += 1

            generated += 1

        except Exception as e:
            errors += 1
            if errors <= 10:
                print(f"  ERROR [{slug}]: {e}", file=sys.stderr)

    print(f"  Generated: {generated} books")
    print(f"  Covers copied: {covers_copied}")
    print(f"  No metadata: {no_metadata}")
    print(f"  Errors: {errors}")

    # Step 4: Update categories.json
    print("Step 4: Updating categories...")
    if not args.dry_run:
        try:
            with open(args.categories_path, "r", encoding="utf-8") as f:
                categories = json.load(f)

            # Check if "other" category exists
            other_exists = any(c["slug"] == "other" for c in categories)
            if not other_exists:
                categories.append({
                    "slug": "other",
                    "name": "Інше",
                    "nameEn": "Other",
                    "description": "Некатегоризовані книги",
                    "icon": "📚",
                    "bookCount": 0,
                    "order": 11,
                })

            # Count books per category
            cat_counts: dict[str, int] = defaultdict(int)
            for json_file in args.output_dir.glob("*.json"):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    cat_counts[data.get("category", "other")] += 1
                except Exception:
                    pass

            for cat in categories:
                cat["bookCount"] = cat_counts.get(cat["slug"], 0)

            with open(args.categories_path, "w", encoding="utf-8") as f:
                json.dump(categories, f, ensure_ascii=False, indent=2)

            print(f"  Updated categories: {dict(cat_counts)}")
        except Exception as e:
            print(f"  ERROR updating categories: {e}", file=sys.stderr)

    # Step 5: Reset featured.json
    if not args.dry_run:
        print("Step 5: Resetting featured.json...")
        try:
            with open(args.featured_path, "w", encoding="utf-8") as f:
                json.dump([], f)
            print("  Done")
        except Exception as e:
            print(f"  ERROR: {e}", file=sys.stderr)

    # Summary
    print()
    print("=" * 50)
    print(f"DONE: {generated} books generated, {covers_copied} covers copied, {errors} errors")
    print("=" * 50)


if __name__ == "__main__":
    main()
