import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const short = readFileSync(new URL('../fixtures/short.mp3', import.meta.url));

test('«Слушать подряд» не тянет страницу обратно к ленте', async ({ page }) => {
  await page.route('**/audio/voice/**', r => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: short }));
  await page.goto('/');
  await page.locator('#tuner-all').click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(2500);
  const { y, max } = await page.evaluate(() => ({ y: scrollY, max: document.documentElement.scrollHeight - innerHeight }));
  expect(y).toBeGreaterThan(max - 100);
});
