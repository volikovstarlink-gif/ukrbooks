'use client';
import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Download } from 'lucide-react';
import VideoAdGate from '@/components/ads/VideoAdGate';
import { formatFileSize } from '@/lib/utils';
import { trackBookDownload } from '@/lib/analytics';

export interface DownloadItem {
  format: string;
  filename: string;
  sizeMb: number;
  downloadUrl: string;
}

const FORMAT_LABEL: Record<string, string> = { epub: 'EPUB', fb2: 'FB2', pdf: 'PDF' };

interface DownloadSectionProps {
  items: DownloadItem[];
  bookTitle: string;
  bookAuthor: string;
  bookSlug: string;
}

export default function DownloadSection({
  items,
  bookTitle,
  bookAuthor,
  bookSlug,
}: DownloadSectionProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DownloadItem | null>(null);

  const handleDownloadClick = (item: DownloadItem) => {
    trackBookDownload(bookTitle, bookAuthor, item.format);
    setSelectedItem(item);
    setGateOpen(true);
  };

  const hasEpub = items.some((i) => i.format === 'epub');

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {hasEpub && (
          <Link href={`/read/${bookSlug}`} className="btn btn-primary btn-lg">
            <BookOpen size={18} />
            Читати онлайн
          </Link>
        )}
        {items.map((item) => (
          <button
            key={item.format}
            onClick={() => handleDownloadClick(item)}
            className="btn btn-download btn-lg"
          >
            <Download size={18} />
            {FORMAT_LABEL[item.format] || item.format}
            <span className="text-xs opacity-70 ml-1">{formatFileSize(item.sizeMb)}</span>
          </button>
        ))}
      </div>

      {selectedItem && (
        <VideoAdGate
          isOpen={gateOpen}
          onClose={() => setGateOpen(false)}
          downloadUrl={selectedItem.downloadUrl}
          fileName={selectedItem.filename}
          format={selectedItem.format}
          bookSlug={bookSlug}
        />
      )}
    </>
  );
}
