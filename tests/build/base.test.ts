import { expect, test } from 'vitest';
import { distFiles, page, raw } from './html';

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
  const f = distFiles('_astro');
  expect(f.some(n => /literata.*cyrillic.*\.woff2$/.test(n))).toBe(true);
  expect(f.some(n => /golos.*cyrillic.*\.woff2$/.test(n))).toBe(true);
});

test('тема ставится до отрисовки', () => {
  expect(page('/').querySelector('head script')!.text).toContain('rv-theme');
});
