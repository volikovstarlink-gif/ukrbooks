import sharp from 'sharp';

const width = 400;
const height = 600;

// Create a dark blue-gray SVG with "No Cover" text
const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#2D3748"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="28" fill="#718096"
    text-anchor="middle" dominant-baseline="middle">No Cover</text>
</svg>`;

await sharp(Buffer.from(svg))
  .webp({ quality: 80 })
  .toFile('public/covers/placeholder.webp');

console.log('Placeholder cover created: public/covers/placeholder.webp');
