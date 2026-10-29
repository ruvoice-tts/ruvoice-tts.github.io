import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('без JS: скачивание и ответы на месте', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#dl-full')).toBeVisible();
  const release = await (await page.request.get('/release.json')).json();
  if (release.app.lite) await expect(page.locator('#dl-lite')).toBeVisible();
  for (const a of await page.locator('#faq .answer').all()) await expect(a).toBeVisible();
  await page.goto('/packs/');
  await expect(page.locator('a.pack-dl').first()).toBeVisible();
});
