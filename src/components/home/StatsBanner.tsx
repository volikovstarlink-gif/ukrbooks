interface Stat { value: string; label: string; }

export default function StatsBanner({ totalBooks, totalCategories = 9 }: { totalBooks: number; totalCategories?: number }) {
  const stats: Stat[] = [
    { value: totalBooks.toLocaleString('uk-UA'), label: 'Книг' },
    { value: String(totalCategories), label: 'Категорій' },
    { value: 'EPUB · FB2', label: 'Формати' },
    { value: '100%', label: 'Без реєстрації' },
  ];

  return (
    <section style={{ background: 'var(--color-parchment)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="container-site py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center py-2">
              <div
                className="font-display text-2xl md:text-3xl font-bold"
                style={{ color: 'var(--color-sapphire)' }}
              >
                {value}
              </div>
              <div className="text-sm" style={{ color: 'var(--color-muted)' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
