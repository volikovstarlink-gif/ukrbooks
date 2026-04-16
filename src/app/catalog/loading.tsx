import Skeleton from '@/components/ui/Skeleton';

export default function CatalogLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="catalog-hero">
        <div className="container-site">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container-site" style={{ padding: '2rem 1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookCardSkeleton() {
  return (
    <div>
      <Skeleton className="w-full aspect-[3/4] rounded mb-3" />
      <Skeleton className="h-3 w-3/5 mb-2" />
      <Skeleton className="h-4 w-4/5 mb-2" />
      <Skeleton className="h-3 w-2/5" />
    </div>
  );
}
