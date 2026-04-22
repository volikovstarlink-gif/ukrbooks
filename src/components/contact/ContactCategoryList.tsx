'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import ContactDialog, { type ContactCategory } from './ContactDialog';

interface CategoryItem {
  key: ContactCategory;
  label: string;
  description: string;
}

const CATEGORIES: CategoryItem[] = [
  {
    key: 'general',
    label: 'Загальні питання',
    description: 'Пропозиції, співпраця, запити від авторів і видавництв, питання про проєкт',
  },
  {
    key: 'dmca',
    label: 'Авторські права (DMCA)',
    description: 'Скарги правовласників, видалення контенту, counter-notice',
  },
  {
    key: 'legal',
    label: 'Судові запити',
    description: 'Офіційні запити правоохоронних органів, адвокатські звернення',
  },
  {
    key: 'privacy',
    label: 'Конфіденційність',
    description: 'Реалізація прав суб\'єкта ПД: доступ, виправлення, видалення даних',
  },
  {
    key: 'ads',
    label: 'Реклама',
    description: 'Розміщення прямої реклами, партнерські пропозиції',
  },
];

export default function ContactCategoryList() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ContactCategory>('general');

  function handleOpen(c: ContactCategory) {
    setCategory(c);
    setOpen(true);
  }

  return (
    <>
      <div className="space-y-3">
        {CATEGORIES.map(({ key, label, description }) => (
          <div key={key} className="p-4 rounded-xl" style={{ background: 'var(--color-cream)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-semibold text-gray-800">{label}</div>
                <p className="text-xs text-gray-600 mt-0.5">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpen(key)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90"
                style={{ background: 'var(--color-sapphire)' }}
              >
                <Mail size={13} /> Форма контакту
              </button>
            </div>
          </div>
        ))}
      </div>
      <ContactDialog open={open} onClose={() => setOpen(false)} defaultCategory={category} />
    </>
  );
}
