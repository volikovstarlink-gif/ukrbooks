/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://ukrbooks.com.ua',
  generateRobotsTxt: false, // handled by src/app/robots.ts
  outDir: './public',
};
