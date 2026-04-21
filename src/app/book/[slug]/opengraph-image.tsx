import { ImageResponse } from 'next/og';
import { getBookBySlug } from '@/lib/books';

// Runs in Node runtime (default) — avoids edge constraints with our
// cache()-wrapped data helpers. Vercel caches the output per-URL.
export const alt = 'UkrBooks book preview';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.ink';

// Manrope Cyrillic subset shipped from /public — same-origin fetch stays
// inside Vercel and never fails under serverless-egress timeouts (which
// broke the jsdelivr CDN fallback we used first).
const MANROPE_REG = `${BASE}/fonts/manrope-cyrillic-400.woff2`;
const MANROPE_BOLD = `${BASE}/fonts/manrope-cyrillic-700.woff2`;

async function fetchFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, { cache: 'force-cache', signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null; // Never let a font fetch crash the whole OG render.
  }
}

interface Props { params: Promise<{ slug: string }> }

export default async function OgImage({ params }: Props) {
  const { slug } = await params;
  const book = getBookBySlug(slug);

  const [regFont, boldFont] = await Promise.all([fetchFont(MANROPE_REG), fetchFont(MANROPE_BOLD)]);
  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' }> = [];
  if (regFont) fonts.push({ name: 'Manrope', data: regFont, weight: 400, style: 'normal' });
  if (boldFont) fonts.push({ name: 'Manrope', data: boldFont, weight: 700, style: 'normal' });

  if (!book) {
    // Book not found — render a branded fallback (never errors).
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #2a2a5e 100%)',
            color: '#f8f5f0',
            fontSize: 72,
            fontWeight: 700,
            fontFamily: 'Manrope, system-ui',
          }}
        >
          UkrBooks
        </div>
      ),
      { ...size, fonts },
    );
  }

  const title = book.title;
  const author = book.author;
  const category = book.category;
  const cover = book.coverImage.startsWith('http') ? book.coverImage : `${BASE}${book.coverImage}`;
  const formats = book.files.map((f) => f.format.toUpperCase()).join(' · ');

  // Long-title safety: clamp to 80 chars
  const cleanTitle = title.length > 80 ? title.slice(0, 77) + '…' : title;
  const cleanAuthor = author.length > 60 ? author.slice(0, 57) + '…' : author;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #2a2a5e 60%, #1a1a2e 100%)',
          color: '#f8f5f0',
          fontFamily: 'Manrope, system-ui',
          padding: 60,
          gap: 50,
        }}
      >
        {/* Cover */}
        <div
          style={{
            width: 360,
            height: 510,
            flexShrink: 0,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            background: '#2a2a5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={cover}
            alt=""
            width={360}
            height={510}
            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
          />
        </div>

        {/* Info */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#c9a84c',
              textTransform: 'uppercase',
              letterSpacing: 3,
              marginBottom: 20,
            }}
          >
            UkrBooks · Бібліотека
          </div>

          <div
            style={{
              fontSize: cleanTitle.length > 40 ? 58 : 76,
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: 20,
              display: 'flex',
            }}
          >
            {cleanTitle}
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: 'rgba(248, 245, 240, 0.75)',
              marginBottom: 30,
              display: 'flex',
            }}
          >
            {cleanAuthor}
          </div>

          <div
            style={{
              fontSize: 24,
              fontWeight: 400,
              color: 'rgba(248, 245, 240, 0.55)',
              display: 'flex',
              gap: 20,
              flexWrap: 'wrap',
            }}
          >
            <span>{formats}</span>
            {book.year ? <span>·</span> : null}
            {book.year ? <span>{book.year}</span> : null}
            {category ? <span>·</span> : null}
            {category ? <span style={{ textTransform: 'capitalize' }}>{category}</span> : null}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
