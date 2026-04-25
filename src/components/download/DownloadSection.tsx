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
  available?: boolean;
}

const FORMAT_LABEL: Record<string, string> = { epub: 'EPUB', fb2: 'FB2', pdf: 'PDF' };

interface DownloadSectionProps {
  items: DownloadItem[];
  bookTitle: string;
  bookAuthor: string;
  bookSlug: string;
}

function BookUnavailableNotice() {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg max-w-md"
      style={{
        background: 'rgba(220,38,38,0.10)',
        border: '1px solid rgba(220,38,38,0.25)',
      }}
    >
      <span className="text-xl leading-none">📕</span>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm" style={{ color: 'rgb(255,220,220)' }}>
          Файл тимчасово недоступний
        </div>
        <div className="text-xs mt-1" style={{ color: 'rgba(255,200,200,0.85)' }}>
          Ми працюємо над відновленням. Подивіться схожі книги нижче.
        </div>
      </div>
    </div>
  );
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
    // Pass bookSlug so sendBeacon('/api/track/download') fires — without it
    // the counter in Redis stays at 0 while VideoAdGate still triggers the
    // actual file download. Admin dashboard then shows 0 скачувань despite
    // hundreds of "Завершених завантажень" in the ads panel.
    trackBookDownload(bookTitle, bookAuthor, item.format, bookSlug);
    setSelectedItem(item);
    setGateOpen(true);
  };

  const availableItems = items.filter((i) => i.available !== false);
  const canReadOnline = availableItems.some((i) => i.format === 'epub' || i.format === 'pdf');

  if (availableItems.length === 0) {
    return <BookUnavailableNotice />;
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {canReadOnline && (
          <Link href={`/read/${bookSlug}`} className="btn btn-primary btn-lg">
            <BookOpen size={18} />
            Читати онлайн
          </Link>
        )}
        {availableItems.map((item) => (
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
