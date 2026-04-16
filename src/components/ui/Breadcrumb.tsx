import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href: string | null;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Навігаційні крихти">
      <ol className="breadcrumb">
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span>{item.label}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">›</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
