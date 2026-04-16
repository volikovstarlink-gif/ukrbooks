'use client';

const SORT_OPTIONS = [
  { value: 'popular', label: 'За популярністю' },
  { value: 'newest', label: 'Нові першими' },
  { value: 'rating', label: 'За рейтингом' },
  { value: 'title', label: 'За назвою (А-Я)' },
  { value: 'author', label: 'За автором' },
];

interface SortSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <select
      className="sort-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {SORT_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
