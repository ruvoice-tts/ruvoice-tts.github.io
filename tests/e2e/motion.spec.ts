import { expect, test } from '@playwright/test';

test('при «уменьшить движение» ничего не движется само', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(500);
  const running = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  expect(running).toBe(0);
});
