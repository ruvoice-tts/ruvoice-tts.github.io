import { expect, test } from 'vitest';
import fixture from '../fixtures/releases.json';
import meta from '../../src/data/packs.json';
import { mapReleases } from '../../src/lib/github';
import { downloadOptions, visiblePacks, type PackMeta } from '../../src/lib/site';

type Rel = { assets: { name: string }[] };
const d = mapReleases(structuredClone(fixture) as unknown[]);
const withoutLite = (f: Rel[]) => f.map(r => ({ ...r, assets: r.assets.filter(a => !a.name.endsWith('-lite.apk')) }));

test('невыложенные паки не видны, неописанный выложенный — простой карточкой', () => {
  const v = visiblePacks(meta as PackMeta[], { ...d.packs, xx: { id: 'xx', url: 'u', size: 1, updated: '2026-10-29' } });
  expect(v.map(p => p.id)).not.toContain('cis_uk');
  expect(v.map(p => p.id)).not.toContain('cis_uk_ext');
  expect(v.find(p => p.id === 'xx')).toMatchObject({ title: 'xx', order: 999 });
});

test('паки по порядку из описаний', () => {
  expect(visiblePacks(meta as PackMeta[], d.packs).map(p => p.id)).toEqual(['ru_voices', 'ru', 'cis_be', 'cis_ru']);
});

test('без lite в релизе скачать можно только полную', () => {
  const app = mapReleases(withoutLite(structuredClone(fixture) as unknown as Rel[])).app;
  expect(downloadOptions(app).map(o => o.id)).toEqual(['full']);
  expect(downloadOptions(d.app).map(o => o.id)).toEqual(['full', 'lite']);
});
