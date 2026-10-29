import { expect, test } from 'vitest';
import { built } from './html';

test('сборка отдаёт данные релиза, по которым собрана', () => {
  const r = built();
  expect(['api', 'snapshot']).toContain(r.source);
  expect(r.app.full.url).toMatch(/\/releases\/download\/v\d+\.\d+\.\d+\/ruvoice-tts-\d+\.\d+\.\d+\.apk$/);
  expect(Object.keys(r.packs)).toContain('ru_voices');
});
