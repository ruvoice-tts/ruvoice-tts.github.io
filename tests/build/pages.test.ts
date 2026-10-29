import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { built, distFiles, page, rawFile } from './html';
import { parse } from 'node-html-parser';

test('«Что нового»: запись на каждый релиз, свежий первым', () => {
  const h2 = page('/changelog/').querySelectorAll('article h2');
  expect(h2.length).toBe(built().changelog.length);
  expect(h2[0].text).toContain(built().changelog[0].version);
});

test('404 со ссылками на главную и на полную сборку', () => {
  expect(existsSync(new URL('../../dist/404.html', import.meta.url))).toBe(true);
  const p = page('/404.html');
  expect(p.querySelector('main a[href="/"]')).not.toBeNull();
  expect(p.querySelector(`main a[href="${built().app.full.url}"]`)).not.toBeNull();
});

test('превью ссылки на всех страницах', () => {
  const pages = distFiles('').filter(f => f.endsWith('.html') && !f.startsWith('og/'));
  expect(pages.length).toBeGreaterThanOrEqual(5);
  for (const f of pages) {
    const p = parse(rawFile(f));
    expect(p.querySelector('meta[property="og:image"]')!.getAttribute('content'), f).toBe('https://ruvoice-tts.github.io/img/og.png');
    expect(p.querySelector('meta[property="og:title"]'), f).not.toBeNull();
  }
});

test('страница для чтеца: один h1 и не меньше пяти разделов', () => {
  const p = page('/screen-reader/');
  expect(p.querySelectorAll('h1').length).toBe(1);
  expect(p.querySelectorAll('main h2').length).toBeGreaterThanOrEqual(5);
});

test('страница для чтеца не обещает больше, чем проверено: список — чтецы, которых узнаёт движок', () => {
  const p = page('/screen-reader/');
  expect(p.querySelectorAll('main h2').map(h => h.text.trim())).toContain('Какие чтецы узнаёт движок');
  expect(p.querySelector('main')!.text).not.toMatch(/проверен/i);
});
