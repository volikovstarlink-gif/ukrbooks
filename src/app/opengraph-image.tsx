import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'UkrBooks — Українська електронна бібліотека';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#0F1923',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#F5F0E8',
          fontFamily: 'serif',
        }}
      >
        {/* Ukrainian color bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: 'linear-gradient(90deg, #1B3A6B 33%, #C9A84C 33% 66%, #1B3A6B 66%)',
          }}
        />

        <div style={{ fontSize: 72, marginBottom: 16 }}>📚</div>
        <div style={{ fontSize: 56, fontWeight: 'bold', marginBottom: 12 }}>UkrBooks</div>
        <div style={{ fontSize: 28, color: '#C9A84C' }}>
          Українська електронна бібліотека
        </div>
        <div style={{ fontSize: 20, color: '#6B7280', marginTop: 16 }}>
          FB2 · EPUB · Без реєстрації
        </div>
      </div>
    ),
    size
  );
}
