import { cn } from '@/lib/utils';

type BadgeVariant = 'category' | 'format' | 'new' | 'featured' | 'language';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const STYLES: Record<BadgeVariant, string> = {
  category: 'bg-sapphire/10 text-sapphire border border-sapphire/20',
  format: 'bg-gold/10 text-amber-800 border border-gold/30',
  new: 'bg-green-100 text-green-800 border border-green-200',
  featured: 'bg-gold text-ink border border-gold',
  language: 'bg-gray-100 text-gray-700 border border-gray-200',
};

export default function Badge({ variant = 'category', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
        STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
