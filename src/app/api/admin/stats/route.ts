import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/admin-auth';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '39b9b9435d78643309d3e2119ba21151';
const CF_ZONE_ID = process.env.CF_ZONE_ID || '8289b04da479ab6fd342cc678ba9eea7';
const CF_ANALYTICS_TOKEN = process.env.CF_ANALYTICS_TOKEN || '';
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY || '';
const R2_SECRET_KEY = process.env.R2_SECRET_KEY || '';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const session = req.cookies.get(SESSION_COOKIE)?.value;
  return !!(await verifySession(session));
}

// Cloudflare GraphQL Analytics API
async function fetchCFAnalytics(period: '1d' | '7d' | '30d') {
  if (!CF_ANALYTICS_TOKEN) return null;

  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - parseInt(period));

  const query = `{
    viewer {
      zones(filter: { zoneTag: "${CF_ZONE_ID}" }) {
        httpRequests1dGroups(
          limit: 31
          filter: { date_geq: "${since.toISOString().split('T')[0]}", date_leq: "${now.toISOString().split('T')[0]}" }
          orderBy: [date_ASC]
        ) {
          date: dimensions { date }
          sum { requests pageViews bytes }
          uniq { uniques }
        }
      }
    }
  }`;

  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CF_ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? null;
}

// R2 storage metrics via S3 API (list objects and sum sizes)
async function fetchR2Storage() {
  if (!R2_ACCESS_KEY || !R2_SECRET_KEY) {
    return { totalGB: 9.746, fileCount: 8401, note: 'Приблизний розмір (API ключі не налаштовані)' };
  }
  try {
    // Use Cloudflare API for R2 metrics
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/r2/buckets/ukrbooks-files`,
      {
        headers: {
          'X-Auth-Key': R2_SECRET_KEY,
          'X-Auth-Email': process.env.CF_EMAIL || '',
          'Content-Type': 'application/json',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        totalGB: data?.result?.storage?.bytes ? (data.result.storage.bytes / 1024 ** 3).toFixed(3) : '~9.746',
        fileCount: data?.result?.storage?.objectCount ?? '~8401',
        note: null,
      };
    }
  } catch {
    // fallback
  }
  return { totalGB: '~9.746', fileCount: '~8401', note: 'R2 API недоступний' };
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = (req.nextUrl.searchParams.get('period') || '7d') as '1d' | '7d' | '30d';

  const [analytics, storage] = await Promise.all([
    fetchCFAnalytics(period),
    fetchR2Storage(),
  ]);

  // Totals from analytics
  let totalRequests = 0, totalPageViews = 0, totalVisitors = 0, totalBytes = 0;
  if (analytics) {
    for (const day of analytics) {
      totalRequests += day.sum.requests;
      totalPageViews += day.sum.pageViews;
      totalVisitors += day.uniq.uniques;
      totalBytes += day.sum.bytes;
    }
  }

  return NextResponse.json({
    period,
    analytics: analytics ? {
      totalRequests,
      totalPageViews,
      totalVisitors,
      totalBandwidthGB: (totalBytes / 1024 ** 3).toFixed(3),
      byDay: analytics.map((d: { date: { date: string }; sum: { requests: number; pageViews: number; bytes: number }; uniq: { uniques: number } }) => ({
        date: d.date.date,
        requests: d.sum.requests,
        pageViews: d.sum.pageViews,
        visitors: d.uniq.uniques,
        bandwidthMB: (d.sum.bytes / 1024 ** 2).toFixed(1),
      })),
    } : null,
    storage,
    cfConfigured: !!CF_ANALYTICS_TOKEN,
    freeTierLimit: { storageGB: 10, readsPerMonth: 10_000_000, writesPerMonth: 1_000_000 },
  });
}
