'use client';
import { useEffect } from 'react';
import { loadAdsterraPopunder } from '@/lib/adsterra';

export default function AdsterraPopunder() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      loadAdsterraPopunder();
    }, 2000);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
