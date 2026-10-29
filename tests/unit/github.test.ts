import { expect, test } from 'vitest';
import fixture from '../fixtures/releases.json';
import { loadReleaseData, mapReleases } from '../../src/lib/github';

type Rel = { tag_name: string; prerelease: boolean; assets: { name: string }[] };
const copy = () => structuredClone(fixture) as unknown as Rel[];
const withoutLite = (f: Rel[]) => f.map(r => ({ ...r, assets: r.assets.filter(a => !a.name.endsWith('-lite.apk')) }));
const onlyPrereleases = (f: Rel[]) => f.map(r => (r.tag_name === 'packs' ? r : { ...r, prerelease: true }));

test('последний релиз приложения: версия и обе сборки', () => {
  const d = mapReleases(copy());
  expect(d.app.version).toBe('1.1.1');
  expect(d.app.full.url).toBe('https://github.com/kost-t-human/ruvoice-tts/releases/download/v1.1.1/ruvoice-tts-1.1.1.apk');
  expect(d.app.lite!.url).toMatch(/\/v1\.1\.1\/ruvoice-tts-1\.1\.1-lite\.apk$/);
});

test('паки из релиза packs', () => {
  const d = mapReleases(copy());
  expect(Object.keys(d.packs).sort()).toEqual(['cis_be', 'cis_ru', 'ru', 'ru_voices']);
  expect(d.packs.cis_be.size).toBe(109065865);
});

test('список изменений: свежий первым, без релиза паков', () => {
  const d = mapReleases(copy());
  expect(d.changelog[0].version).toBe('1.1.1');
  expect(d.changelog.some(e => e.version === 'packs')).toBe(false);
});

test('нет lite-файла — вариант просто не показан', () => {
  expect(mapReleases(withoutLite(copy())).app.lite).toBeUndefined();
});

test('нет нормального релиза приложения — ошибка', () => {
  expect(() => mapReleases(onlyPrereleases(copy()))).toThrow('нет релиза приложения');
});

test('сеть упала — берём снимок', async () => {
  expect((await loadReleaseData({ fetch: () => Promise.reject(new Error('offline')) })).source).toBe('snapshot');
});

test('API ответил 403 — берём снимок', async () => {
  expect((await loadReleaseData({ fetch: async () => new Response('', { status: 403 }) })).source).toBe('snapshot');
});
