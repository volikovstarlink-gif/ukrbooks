type ClassValue = string | number | boolean | undefined | null | { [key: string]: unknown } | ClassValue[];

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flatMap((v) => {
      if (!v) return [];
      if (typeof v === 'string') return [v];
      if (typeof v === 'number') return [String(v)];
      if (Array.isArray(v)) return [cn(...v)];
      if (typeof v === 'object' && v !== null) {
        return Object.entries(v as Record<string, unknown>)
          .filter(([, ok]) => Boolean(ok))
          .map(([k]) => k);
      }
      return [];
    })
    .filter(Boolean)
    .join(' ');
}

export function formatFileSize(sizeMb: number): string {
  if (sizeMb < 1) return `${Math.round(sizeMb * 1024)} KB`;
  return `${sizeMb.toFixed(1)} MB`;
}

export function truncate(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text || '';
  return text.slice(0, maxLen).trimEnd() + '…';
}

/** Returns the display URL for a cover. We pre-generate a .webp version
 *  of every /covers/*.jpg at build-time (scripts/generate-webp-covers.mjs);
 *  this swaps the extension so browsers get the smaller WebP while OG/
 *  Schema.org meta (which set book.coverImage directly) keep the JPEG. */
export function getCoverUrl(coverImage: string): string {
  const src = coverImage || '/covers/placeholder.jpg';
  return src.replace(/\.jpe?g$/i, '.webp');
}

/** Ukrainian pluralization for book counts: 1 книга, 2 книги, 5 книг */
export function pluralizeBooks(count: number): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  let form: string;
  if (n > 10 && n < 20) {
    form = 'книг';
  } else if (n1 === 1) {
    form = 'книга';
  } else if (n1 >= 2 && n1 <= 4) {
    form = 'книги';
  } else {
    form = 'книг';
  }
  return `${count.toLocaleString('uk-UA')} ${form}`;
}
