import { expect, test } from '@playwright/test';

test('при «уменьшить движение» ничего не движется само', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(500);
  const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  expect(running).toBe(0);
});

// и без бесконечных фоновых анимаций: размытый слой, который двигается всё время, греет слабый телефон
test('без бесконечных анимаций: остановить их нечем ни пальцем, ни клавиатурой (WCAG 2.2.2)', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(500);
  const endless = await page.evaluate(() => document.getAnimations()
    .filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations === Infinity)
    .map(a => ((a.effect as KeyframeEffect).target as Element | null)?.className.toString() ?? '?'));
  expect(endless).toEqual([]);
});
