import Link from 'next/link';

export default function AboutSection() {
  return (
    <section className="bg-sapphire py-16 md:py-20 overflow-hidden">
      <div className="container-site">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6">
              UkrBooks — для тих, хто читає
            </h2>
            <p className="text-parchment/70 text-lg leading-relaxed mb-4">
              Ми створили цю бібліотеку, щоб кожен міг вільно читати українською.
              Тисячі книг у зручних форматах — від класики до сучасних бестселерів.
            </p>
            <p className="text-parchment/70 text-lg leading-relaxed mb-8">
              Завантажуйте безкоштовно, читайте на будь-якому пристрої,
              діліться з друзями. Разом ми робимо українську книгу доступною.
            </p>
            <Link href="/catalog" className="btn-primary">
              Почати читати
            </Link>
          </div>

          {/* Decorative — Ukrainian embroidery pattern */}
          <div className="hidden md:flex items-center justify-center" aria-hidden="true">
            <svg
              width="280"
              height="280"
              viewBox="0 0 280 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-20"
            >
              {/* Repeating diamond / rhombus pattern */}
              {[0, 1, 2, 3, 4].map((row) =>
                [0, 1, 2, 3, 4].map((col) => {
                  const cx = 28 + col * 56;
                  const cy = 28 + row * 56;
                  return (
                    <g key={`${row}-${col}`}>
                      <path
                        d={`M${cx} ${cy - 20} L${cx + 20} ${cy} L${cx} ${cy + 20} L${cx - 20} ${cy} Z`}
                        stroke="var(--color-gold)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <path
                        d={`M${cx} ${cy - 10} L${cx + 10} ${cy} L${cx} ${cy + 10} L${cx - 10} ${cy} Z`}
                        fill="var(--color-gold)"
                        opacity="0.4"
                      />
                    </g>
                  );
                })
              )}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
