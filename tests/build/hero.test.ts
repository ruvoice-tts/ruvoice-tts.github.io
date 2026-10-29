import { expect, test } from 'vitest';
import { built, page } from './html';
import samples from '../../src/data/samples.json';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

test('заголовок и слова для подсветки совпадают с озвучкой', () => {
  const h = page('/');
  expect(norm(h.querySelector('h1')!.text)).toBe('Живой голос для любой читалки');
  expect(h.querySelectorAll('h1 .w, .lede .w').length).toBe(samples.hero.words.length);
});

test('ссылки скачивания из данных сборки', () => {
  const h = page('/'), r = built();
  expect(h.querySelector('#dl-full')!.getAttribute('href')).toBe(r.app.full.url);
  // лёгкой сборки или пака может не быть в релизе — тогда их нет и на странице
  if (r.app.lite) expect(h.querySelector('#dl-lite')!.getAttribute('href')).toBe(r.app.lite.url);
  else expect(h.querySelector('#dl-lite')).toBeNull();
  if (r.app.lite && r.packs.ru_voices) expect(h.querySelector('#dl-pack')!.getAttribute('href')).toBe(r.packs.ru_voices.url);
  else expect(h.querySelector('#dl-pack')).toBeNull();
  expect(h.querySelector('#dl-rustore')!.getAttribute('href')).toBe('https://www.rustore.ru/catalog/app/ru.kost.ruvoice');
});
