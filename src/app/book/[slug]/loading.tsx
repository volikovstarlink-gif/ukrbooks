import Skeleton from '@/components/ui/Skeleton';

export default function BookLoading() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      {/* Hero skeleton */}
      <div style={{ background: 'linear-gradient(135deg, var(--color-ink) 0%, var(--color-sapphire) 100%)' }}>
        <div className="container-site py-8">
          <Skeleton className="h-4 w-32 mb-6 opacity-30" />
          <div className="flex flex-col sm:flex-row gap-8">
            <Skeleton className="w-36 sm:w-44 aspect-[2/3] rounded-xl flex-shrink-0 opacity-20" />
            <div className="flex-1 space-y-4">
              <Skeleton className="h-5 w-24 rounded-full opacity-30" />
              <Skeleton className="h-9 w-3/4 opacity-30" />
              <Skeleton className="h-6 w-1/3 opacity-20" />
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-4 w-16 opacity-20" />
                <Skeleton className="h-4 w-20 opacity-20" />
              </div>
              <div className="flex gap-3 pt-4">
                <Skeleton className="h-12 w-44 rounded-lg opacity-30" />
                <Skeleton className="h-12 w-44 rounded-lg opacity-30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container-site py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="rounded-xl p-6 bg-white border border-gray-100">
              <Skeleton className="h-6 w-32 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-4/5 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
          <div>
            <div className="rounded-xl p-5 bg-white border border-gray-100 space-y-3">
              <Skeleton className="h-4 w-20 mb-3" />
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
