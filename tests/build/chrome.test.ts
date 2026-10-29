import { expect, test } from 'vitest';
import { built, distFiles, page, rawFile } from './html';
import { formatMB } from '../../src/lib/format';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

test('первая ссылка на странице сразу качает полную сборку, вторая ведёт к вариантам', () => {
  const { app } = built();
  const focusables = page('/').querySelectorAll('body a[href], body button');
  expect(focusables[0].id).toBe('skip-full');
  expect(focusables[0].getAttribute('href')).toBe(app.full.url);
  expect(norm(focusables[0].text)).toBe(norm(`Скачать полную сборку ${app.version}, APK, ${formatMB(app.full.size)}`));
  expect(focusables[1].getAttribute('href')).toBe('#download');
  expect(norm(focusables[1].text)).toBe('Другие варианты скачивания');
});

test('в подвале группа в Telegram', () => {
  expect(norm(page('/').querySelector('footer a[href="https://t.me/ruVoiceTTS"]')!.text)).toBe('Группа в Telegram');
});

test('нигде нет ссылок на Апптеку и 4pda и упоминаний Апптеки', () => {
  // «4PDA» как пример чтения в нотах релиза — содержимое нот, не ссылка на форум
  for (const f of distFiles('').filter(f => f.endsWith('.html'))) {
    expect(rawFile(f), f).not.toMatch(/href="[^"]*(appteka|4pda)/i);
    expect(rawFile(f), f).not.toMatch(/апптек|appteka/i);
  }
});

test('третья ссылка ведёт чтеца прямо к пакам: на главной к разделу, на странице паков к списку', () => {
  const skip = (path: string) => page(path).querySelectorAll('body a[href], body button')[2];
  expect(norm(skip('/').text)).toBe('Скачать паки голосов');
  expect(skip('/').getAttribute('href')).toBe('#packs');
  expect(page('/').querySelector('#packs a.pack-dl')).not.toBeNull();
  expect(skip('/packs/').getAttribute('href')).toBe('#pack-list');
  expect(page('/packs/').querySelector('#pack-list a.pack-dl')).not.toBeNull();
  expect(skip('/changelog/').getAttribute('href')).toBe('/packs/');
});
