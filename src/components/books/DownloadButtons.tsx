'use client';
import { Download } from 'lucide-react';
import { BookFile } from '@/types/book';
import { formatFileSize } from '@/lib/utils';
import { trackBookDownload } from '@/lib/analytics';

interface DownloadButtonsProps {
  files: BookFile[];
  bookTitle: string;
  bookAuthor: string;
  bookSlug: string;
}

export default function DownloadButtons({ files, bookTitle, bookAuthor, bookSlug }: DownloadButtonsProps) {
  const handleDownload = (file: BookFile) => {
    trackBookDownload(bookTitle, bookAuthor, file.format, bookSlug);
  };

  return (
    <div className="download-buttons">
      {files.map((file) => (
        <a
          key={file.format}
          href={`/api/download/${bookSlug}/${encodeURIComponent(file.filename)}`}
          download={file.filename}
          className={`btn-download-format btn-download-${file.format}`}
          onClick={() => handleDownload(file)}
        >
          <Download size={20} />
          <span>
            Завантажити {file.format.toUpperCase()}
            <small>{formatFileSize(file.sizeMb)}</small>
          </span>
        </a>
      ))}
    </div>
  );
}
