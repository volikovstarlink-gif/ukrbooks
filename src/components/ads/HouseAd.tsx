'use client';
import { useEffect, useMemo } from 'react';
import { BookOpen, Heart, Send, Sparkles, Library, Users } from 'lucide-react';
import { trackHouseAdClick, trackHouseAdImpression } from '@/lib/ads-analytics';

interface HouseAdVariant {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  icon: React.ReactNode;
  accent: string;
}

const VARIANTS: HouseAdVariant[] = [
  {
    id: 'telegram',
    title: 'Підпишись на наш Telegram',
    subtitle: 'Нові книги щотижня, підбірки та анонси',
    cta: 'Відкрити Telegram',
    href: process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/ukrbooks',
    icon: <Send size={24} />,
    accent: '#229ED9',
  },
  {
    id: 'donate',
    title: 'Підтримати UkrBooks',
    subtitle: 'Бібліотека існує завдяки читачам. Спасибі ❤️',
    cta: 'Зробити внесок',
    href: process.env.NEXT_PUBLIC_DONATE_URL || 'https://send.monobank.ua/jar/ukrbooks',
    icon: <Heart size={24} />,
    accent: '#ef4444',
  },
  {
    id: 'catalog',
    title: 'Відкрий тисячі книг',
    subtitle: 'EPUB та FB2 українською і світовою літературою',
    cta: 'До каталогу',
    href: '/catalog',
    icon: <BookOpen size={24} />,
    accent: '#3b82f6',
  },
  {
    id: 'ukr-lit',
    title: 'Українська класика',
    subtitle: 'Шевченко, Франко, Леся Українка — у сучасних форматах',
    cta: 'До розділу',
    href: '/category/ukr-literature',
    icon: <Library size={24} />,
    accent: '#facc15',
  },
  {
    id: 'new-books',
    title: 'Що завантажують просто зараз',
    subtitle: 'Топ-запити цього тижня — від детективів до фентезі',
    cta: 'Подивитися',
    href: '/catalog?sort=popular',
    icon: <Sparkles size={24} />,
    accent: '#a855f7',
  },
  {
    id: 'authors',
    title: 'Обери улюбленого автора',
    subtitle: 'Тисяча письменників в одному каталозі',
    cta: 'До списку авторів',
    href: '/author',
    icon: <Users size={24} />,
    accent: '#14b8a6',
  },
];

interface HouseAdProps {
  cycleIndex: number;
}

export default function HouseAd({ cycleIndex }: HouseAdProps) {
  const variant = useMemo(() => VARIANTS[cycleIndex % VARIANTS.length], [cycleIndex]);

  useEffect(() => {
    trackHouseAdImpression(variant.id, cycleIndex);
  }, [variant.id, cycleIndex]);

  const isExternal = variant.href.startsWith('http');

  return (
    <a
      href={variant.href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      onClick={() => trackHouseAdClick(variant.id, variant.href)}
      data-house-ad={variant.id}
      className="block w-full rounded-xl overflow-hidden transition-transform hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: `1px solid ${variant.accent}40`,
        textDecoration: 'none',
      }}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${variant.accent}20`,
            color: variant.accent,
          }}
        >
          {variant.icon}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white font-semibold text-sm leading-tight mb-0.5">{variant.title}</p>
          <p className="text-slate-400 text-xs leading-snug">{variant.subtitle}</p>
        </div>
      </div>
      <div
        className="px-4 py-2.5 text-center text-xs font-semibold"
        style={{
          background: `${variant.accent}15`,
          color: variant.accent,
          borderTop: `1px solid ${variant.accent}30`,
        }}
      >
        {variant.cta} →
      </div>
    </a>
  );
}
