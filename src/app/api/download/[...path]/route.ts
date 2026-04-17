import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { incrDaily, recordError } from '@/lib/redis';

const BOOKS_DIR = process.env.BOOKS_DIR || path.join(process.cwd(), '..', 'Books');

const MIME: Record<string, string> = {
  epub: 'application/epub+zip',
  fb2: 'application/x-fictionbook+xml',
  pdf: 'application/pdf',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  if (!segments || segments.length < 2) {
    return new NextResponse('Bad request', { status: 400 });
  }

  // segments = [dir, filename]
  const [dir, ...rest] = segments;
  const filename = rest.join('/');

  // Security: prevent path traversal
  if (dir.includes('..') || filename.includes('..')) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mime = MIME[ext] || 'application/octet-stream';
  const filePath = path.join(BOOKS_DIR, dir, filename);

  try {
    const data = await readFile(filePath);
    incrDaily('downloads').catch(() => {});
    return new NextResponse(data, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'unknown';
    recordError('downloads', { dir, filename, reason }).catch(() => {});
    return new NextResponse('File not found', { status: 404 });
  }
}
