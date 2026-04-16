'use client';

import { useEffect } from 'react';
import { trackCategoryView } from '@/lib/analytics';

export default function CategoryTracker({ name, slug }: { name: string; slug: string }) {
  useEffect(() => {
    trackCategoryView(name, slug);
  }, [name, slug]);

  return null;
}
