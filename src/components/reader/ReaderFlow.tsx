'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VideoAdGate from '@/components/ads/VideoAdGate';
import BookReader from './BookReader';

interface ReaderFlowProps {
  title: string;
  author: string;
  slug: string;
  epubUrl: string;
}

/**
 * Shell for the /read/[slug] route. First shows VideoAdGate (2 video
 * ads, same pod as the download flow) and only mounts the heavy
 * epubjs-powered BookReader after the ads are satisfied. Keeps the
 * reader monetized on par with downloads while reusing all existing
 * VAST infrastructure — no duplicate ad code.
 */
export default function ReaderFlow({ title, author, slug, epubUrl }: ReaderFlowProps) {
  const router = useRouter();
  const [adsDone, setAdsDone] = useState(false);

  if (!adsDone) {
    return (
      <VideoAdGate
        isOpen
        onClose={() => router.push(`/book/${slug}`)}
        onComplete={() => setAdsDone(true)}
        // downloadUrl/fileName are unused in reader-mode (onComplete
        // short-circuits the download path) — pass empty strings so
        // the type still matches without leaking download intent.
        downloadUrl=""
        fileName={title}
        format="epub"
        bookSlug={slug}
      />
    );
  }

  return (
    <BookReader
      title={title}
      author={author}
      slug={slug}
      epubUrl={epubUrl}
    />
  );
}
