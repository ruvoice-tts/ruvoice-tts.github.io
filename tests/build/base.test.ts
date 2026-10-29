import { expect, test } from 'vitest';
import { distFiles, page, raw } from './html';
import { readFileSync } from 'node:fs';

test('страница на русском, с заголовком и описанием', () => {
  const p = page('/');
  expect(p.querySelector('html')!.getAttribute('lang')).toBe('ru');
  expect(p.querySelector('title')!.text.length).toBeGreaterThan(0);
  expect(p.querySelector('meta[name="description"]')).not.toBeNull();
});

test('никаких внешних шрифтов и скриптов', () => {
  expect(raw('/')).not.toMatch(/fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr/);
});

test('шрифты свои, woff2, есть кириллица', () => {
  const f = distFiles('');
  expect(f.some(n => /literata.*cyrillic.*\.woff2$/.test(n))).toBe(true);
  expect(f.some(n => /golos.*cyrillic.*\.woff2$/.test(n))).toBe(true);
});

test('тема ставится до отрисовки', () => {
  expect(page('/').querySelector('head script')!.text).toContain('rv-theme');
});

// «−5 °C»: знак градуса из шрифта сайта, а не из системного посреди строки; цифры и латиница
// в отдельном файле — его тоже предзагружаем, иначе на медленной сети цифры останутся системным шрифтом.
test('в латинице шрифтов есть знак градуса, латиница предзагружается', async () => {
  const subset = (await import('subset-font')).default;
  for (const f of ['literata-latin-wght-normal', 'golos-text-latin-wght-normal']) {
    const buf = readFileSync(`public/fonts/${f}.woff2`);
    const size = async (t: string) => (await subset(buf, t, { targetFormat: 'woff2' })).length;
    expect(await size('A°'), f).toBeGreaterThan(await size('A'));
    expect(page('/').querySelector(`link[rel="preload"][href="/fonts/${f}.woff2"]`), f).not.toBeNull();
  }
});
