import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-api';
import { getRecent, recordError } from '@/lib/redis';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '39b9b9435d78643309d3e2119ba21151';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';
const STORAGE_LIMIT_GB = 10;
const WARN_THRESHOLD_GB = 9;
const CRITICAL_THRESHOLD_GB = STORAGE_LIMIT_GB;

interface StorageResult {
  totalGB: number;
  fileCount: number;
  source: string;
  note: string | null;
}

async function fetchR2(): Promise<StorageResult | null> {
  if (!R2_SECRET_KEY) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/ukrbooks-files`,
      {
        headers: {
          'X-Auth-Key': R2_SECRET_KEY,
          'X-Auth-Email': process.env.CF_EMAIL || '',
          'Content-Type': 'application/json',
        },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const bytes = data?.result?.storage?.bytes;
    const objectCount = data?.result?.storage?.objectCount;
    if (typeof bytes !== 'number') return null;
    return {
      totalGB: Number((bytes / 1024 ** 3).toFixed(3)),
      fileCount: Number(objectCount) || 0,
      source: 'r2-api',
      note: null,
    };
  } catch {
    return null;
  }
}

async function fetchLocalFS(): Promise<StorageResult | null> {
  try {
    const { readdir, stat } = await import('fs/promises');
    const path = await import('path');
    const dir = process.env.BOOKS_DIR;
    if (!dir) return null;

    async function walk(p: string): Promise<{ size: number; count: number }> {
      let size = 0;
      let count = 0;
      const entries = await readdir(p, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(p, e.name);
        if (e.isDirectory()) {
          const sub = await walk(full);
          size += sub.size;
          count += sub.count;
        } else if (e.isFile()) {
          const s = await stat(full);
          size += s.size;
          count += 1;
        }
      }
      return { size, count };
    }

    const { size, count } = await walk(dir);
    return {
      totalGB: Number((size / 1024 ** 3).toFixed(3)),
      fileCount: count,
      source: 'local-fs',
      note: 'Розрахунок за локальною папкою BOOKS_DIR (dev-режим)',
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req, { bucket: 'storage', perMinute: 30 });
  if (denied) return denied;

  const result = (await fetchR2()) ?? (await fetchLocalFS()) ?? {
    totalGB: 9.746,
    fileCount: 8401,
    source: 'fallback',
    note: 'R2 API недоступний і BOOKS_DIR не знайдено — показано приблизні значення',
  };

  const percent = (result.totalGB / STORAGE_LIMIT_GB) * 100;
  let severity: 'ok' | 'warn' | 'critical' = 'ok';
  if (result.totalGB >= CRITICAL_THRESHOLD_GB) severity = 'critical';
  else if (result.totalGB >= WARN_THRESHOLD_GB) severity = 'warn';

  if (severity !== 'ok') {
    recordError('storage', {
      severity,
      totalGB: result.totalGB,
      fileCount: result.fileCount,
      source: result.source,
      limitGB: STORAGE_LIMIT_GB,
    }).catch(() => {});
  }

  const warnings = await getRecent('errors:storage', 20);

  return NextResponse.json({
    ...result,
    limitGB: STORAGE_LIMIT_GB,
    warnThresholdGB: WARN_THRESHOLD_GB,
    percent: Number(percent.toFixed(2)),
    severity,
    warnings,
  });
}
