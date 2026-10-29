import { expect, test } from 'vitest';
import { recommend, type Lang } from '../../src/lib/wizard';

const packs: { id: string; lang: Lang; size: number }[] = [
  { id: 'ru_voices', lang: 'ru', size: 86_657_850 }, { id: 'cis_be', lang: 'be', size: 109_065_865 },
];
const sizes = { full: 243_169_000, lite: 156_000_000 };

test('файлом, русские, вес обновлений не важен — полная', () => {
  expect(recommend({ source: 'file', langs: ['ru'], smallUpdates: false }, packs, sizes)).toMatchObject({ build: 'full', packs: [] });
});

test('файлом, русские, обновления полегче — лёгкая и пак, с честной припиской', () => {
  const lite = recommend({ source: 'file', langs: ['ru'], smallUpdates: true }, packs, sizes);
  expect(lite).toMatchObject({ build: 'lite', packs: ['ru_voices'] });
  expect(lite.note).toContain('весят как полная');
  expect(lite.note).toContain('87 МБ');
});

test('только белорусские — лёгкая и пак языка', () => {
  expect(recommend({ source: 'file', langs: ['be'], smallUpdates: false }, packs, sizes)).toMatchObject({ build: 'lite', packs: ['cis_be'] });
});

test('русские и белорусские — полная и пак языка', () => {
  expect(recommend({ source: 'file', langs: ['ru', 'be'], smallUpdates: false }, packs, sizes)).toMatchObject({ build: 'full', packs: ['cis_be'] });
});

test('RuStore — с пометкой, что обновления позже', () => {
  const rs = recommend({ source: 'rustore', langs: ['ru'], smallUpdates: true }, packs, sizes);
  expect(rs).toMatchObject({ build: 'rustore', packs: [] });
  expect(rs.note).toContain('на неделю позже');
});

test('лёгкой нет в релизе — полная', () => {
  expect(recommend({ source: 'file', langs: ['ru'], smallUpdates: true }, packs, { full: 243_169_000 }).build).toBe('full');
});

test('ничего не выбрано — полная', () => {
  expect(recommend({ source: 'file', langs: [], smallUpdates: false }, packs, sizes).build).toBe('full');
});

test('язык, пака которого нет, не ломает подбор', () => {
  expect(recommend({ source: 'file', langs: ['uk'], smallUpdates: false }, packs, sizes)).toMatchObject({ build: 'full', packs: [] });
});

test('у языка два пака — советуется один, первый по порядку', () => {
  const two = [...packs, { id: 'cis_uk', lang: 'uk' as Lang, size: 1 }, { id: 'cis_uk_ext', lang: 'uk' as Lang, size: 2 }];
  expect(recommend({ source: 'file', langs: ['uk'], smallUpdates: false }, two, sizes)).toMatchObject({ build: 'lite', packs: ['cis_uk'] });
});
