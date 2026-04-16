import Image from 'next/image';

interface BookCoverProps {
  src: string;
  alt: string;
  priority?: boolean;
  size?: 'card' | 'hero';
}

const sizes = {
  card: { width: 200, height: 300 },
  hero: { width: 300, height: 450 },
};

export default function BookCover({ src, alt, priority = false, size = 'card' }: BookCoverProps) {
  const { width, height } = sizes[size];

  return (
    <div className={`book-cover-container book-cover-${size}`}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        quality={85}
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}
