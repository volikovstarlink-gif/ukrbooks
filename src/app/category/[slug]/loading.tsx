import Skeleton from '@/components/ui/Skeleton';

export default function CategoryLoading() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <Skeleton className="h-4 w-20 mb-4 opacity-30" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full opacity-20" />
            <div>
              <Skeleton className="h-8 w-48 mb-2 opacity-30" />
              <Skeleton className="h-4 w-24 opacity-20" />
            </div>
          </div>
        </div>
      </div>
      <div className="container-site py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="w-full aspect-[2/3] rounded-xl mb-3" />
              <Skeleton className="h-4 w-4/5 mb-1" />
              <Skeleton className="h-3 w-3/5 mb-2" />
              <Skeleton className="h-5 w-2/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
