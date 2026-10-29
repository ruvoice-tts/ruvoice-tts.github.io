import { expect, test } from 'vitest';
import { gzipSync } from 'node:zlib';
import { page, rawFile } from './html';

// Считаются и файлы /_astro/, и скрипты, встроенные в страницу; JSON с данными (плеер, лента) — не код.
test('JS главной не больше 50 КБ в gzip', () => {
  const parts = page('/').querySelectorAll('script').map(s => {
    const src = s.getAttribute('src');
    if (src) return src.startsWith('/_astro/') ? gzipSync(rawFile(src.slice(1))).length : 0;
    return /json/.test(s.getAttribute('type') ?? '') ? 0 : gzipSync(s.innerHTML).length;
  });
  const total = parts.reduce((a, b) => a + b, 0);
  expect(parts.filter(Boolean).length).toBeGreaterThan(1);
  expect(total).toBeLessThanOrEqual(51200);
});
