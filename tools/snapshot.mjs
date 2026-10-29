// Обновить снимок релизов (запас на случай, если API GitHub недоступен при сборке).
//   node tools/snapshot.mjs            → src/data/snapshot.json
//   node tools/snapshot.mjs --fixture  → tests/fixtures/releases.json (тот же формат, для тестов)
import { writeFileSync } from 'node:fs';

const REPO = 'kost-t-human/ruvoice-tts';
const headers = { Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const get = async path => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { headers });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
};
const trim = r => ({
  tag_name: r.tag_name, draft: r.draft, prerelease: r.prerelease, published_at: r.published_at,
  html_url: r.html_url, body: r.body,
  assets: r.assets.map(a => ({ name: a.name, size: a.size, browser_download_url: a.browser_download_url, updated_at: a.updated_at })),
});
const [list, packs] = await Promise.all([get('/releases?per_page=30'), get('/releases/tags/packs')]);
const out = process.argv.includes('--fixture') ? 'tests/fixtures/releases.json' : 'src/data/snapshot.json';
writeFileSync(out, JSON.stringify([...list, packs].map(trim)) + '\n');
console.log(`${out}: ${list.length + 1} релизов`);
