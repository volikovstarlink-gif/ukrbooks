'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import VideoAdGate from '@/components/ads/VideoAdGate';
import BookReader from './BookReader';

// PDF reader is client-only (pdf.js needs DOM) and we do not want to
// pay for its bundle on EPUB reads, so we lazy-load it.
const PdfReader = dynamic(() => import('./PdfReader'), { ssr: false });

type ReaderFormat = 'epub' | 'pdf';

interface ReaderFlowProps {
  title: string;
  author: string;
  slug: string;
  fileUrl: string;
  format: ReaderFormat;
}

export default function ReaderFlow({ title, author, slug, fileUrl, format }: ReaderFlowProps) {
  const router = useRouter();
  const [adsDone, setAdsDone] = useState(false);

  if (!adsDone) {
    return (
      <VideoAdGate
        isOpen
        onClose={() => router.push(`/book/${slug}`)}
        onComplete={() => setAdsDone(true)}
        downloadUrl=""
        fileName={title}
        format={format}
        bookSlug={slug}
      />
    );
  }

  if (format === 'pdf') {
    return <PdfReader title={title} author={author} slug={slug} pdfUrl={fileUrl} />;
  }
  return <BookReader title={title} author={author} slug={slug} epubUrl={fileUrl} />;
}
