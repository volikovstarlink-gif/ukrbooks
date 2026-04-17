import Link from 'next/link';

export default function MissionBand() {
  return (
    <section className="section" style={{ background: 'var(--color-parchment)' }}>
      <div className="container-site">
        <div className="mx-auto text-center" style={{ maxWidth: '60ch' }}>
          <div className="ornament-divider mb-6" aria-hidden="true">
            <span>❦</span>
          </div>
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-4" style={{ color: 'var(--color-ink)' }}>
            Книгарня, що не зачиняється.
          </h2>
          <p className="text-base md:text-lg leading-[1.7]" style={{ color: 'var(--color-ink)', opacity: 0.82 }}>
            UkrBooks — українська книгарня онлайн: тут немає каси, немає квитків і немає годин роботи.
            Лише полиця з українським словом — класика, перекладна література й сучасні автори у відкритих форматах.
            Знайшов книгу, яку любиш — передай її далі.
          </p>
          <div className="mt-7">
            <Link href="/about" className="btn btn-secondary btn-md">
              Про проєкт
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
