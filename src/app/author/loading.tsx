export default function AuthorLoading() {
  return (
    <div style={{ background: 'var(--color-cream)', minHeight: '100vh' }}>
      <div style={{ background: 'var(--color-ink)' }}>
        <div className="container-site py-8">
          <div className="w-48 h-4 rounded bg-white/10 mb-3 animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
            <div>
              <div className="w-56 h-7 rounded bg-white/10 animate-pulse mb-2" />
              <div className="w-24 h-3 rounded bg-white/10 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      <div className="container-site py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
              <div className="aspect-[2/3] bg-gray-200" />
              <div className="p-2 space-y-1">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
