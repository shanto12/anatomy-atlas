/**
 * Generates public/sitemap.xml from the authored anatomy data.
 * Runs before `vite build` so the sitemap is copied into dist/.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SITE = 'https://anatomy-atlas-b2m.pages.dev';
const SYSTEMS = [
  'skeletal', 'muscular', 'nervous', 'cardiovascular', 'respiratory', 'digestive',
  'endocrine', 'immune', 'urinary', 'reproductive', 'integumentary', 'sensory',
];

const urls = new Map();
function add(path, priority = '0.6', changefreq = 'monthly') {
  urls.set(path, { priority, changefreq });
}

add('/', '1.0', 'weekly');
add('/explore', '0.9', 'weekly');
add('/systems', '0.8', 'monthly');
add('/learn', '0.8', 'monthly');
add('/quiz', '0.7', 'monthly');
add('/glossary', '0.6', 'monthly');
add('/about', '0.4', 'yearly');

for (const id of SYSTEMS) {
  add(`/systems/${id}`, '0.8');
  add(`/quiz/${id}`, '0.5');
  add(`/learn/lesson-${id}`, '0.7');

  const file = `src/data/systems/${id}.json`;
  if (!existsSync(file)) continue;
  try {
    const system = JSON.parse(readFileSync(file, 'utf8'));
    for (const organ of system.organs ?? []) {
      add(`/organs/${organ.id}`, '0.6');
    }
  } catch (error) {
    console.warn(`sitemap: skipping ${file}: ${error.message}`);
  }
}

const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...urls.entries()]
  .map(
    ([path, meta]) => `  <url>
    <loc>${SITE}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${meta.changefreq}</changefreq>
    <priority>${meta.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;

writeFileSync('public/sitemap.xml', xml);
console.log(`sitemap: wrote ${urls.size} URLs to public/sitemap.xml`);
