import { expect, test } from 'vitest';
import { built, page } from './html';

const PAGES = ['/', '/packs/', '/changelog/', '/screen-reader/', '404.html'];

test('на каждой странице счётчик GoatCounter', () => {
  for (const p of PAGES) {
    const s = page(p).querySelector('script[data-goatcounter]');
    expect(s?.getAttribute('data-goatcounter'), p).toBe('https://kostthuman.goatcounter.com/count');
    expect(s?.getAttribute('src'), p).toBe('https://gc.zgo.at/count.js');
    expect(s?.hasAttribute('async'), p).toBe(true);
  }
});

test('каждая ссылка на APK, пак и RuStore считается событием с понятным именем', () => {
  const { app, packs } = built();
  const names = new Map<string, string>([
    [app.full.url, 'apk-full'],
    ['https://www.rustore.ru/catalog/app/ru.kost.ruvoice', 'rustore'],
    ...Object.entries(packs).map(([id, p]) => [p.url, `pack-${id}`] as [string, string]),
  ]);
  if (app.lite) names.set(app.lite.url, 'apk-lite');
  let seen = 0;
  for (const p of PAGES) {
    for (const a of page(p).querySelectorAll('a[href]')) {
      const name = names.get(a.getAttribute('href')!);
      if (!name) continue;
      seen++;
      expect(a.getAttribute('data-goatcounter-click'), `${p} ${a.id}`).toBe(name);
    }
  }
  expect(seen).toBeGreaterThan(10);
});
