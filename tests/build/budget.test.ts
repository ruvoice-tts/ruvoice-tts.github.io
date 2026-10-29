import { expect, test } from 'vitest';
import { gzipSync } from 'node:zlib';
import { page, rawFile } from './html';

test('JS главной не больше 50 КБ в gzip', () => {
  const srcs = page('/').querySelectorAll('script[src]').map(s => s.getAttribute('src')!).filter(s => s.startsWith('/_astro/'));
  const total = srcs.reduce((n, s) => n + gzipSync(rawFile(s.slice(1))).length, 0);
  expect(total).toBeLessThanOrEqual(51200);
});
