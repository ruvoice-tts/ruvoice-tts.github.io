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

// Без JS кнопки примеров ничего не делают: вместо них список «пример → как читается» целиком.
test('без JS «Как читается» показывает все примеры с расшифровкой', async ({ page }) => {
  await page.goto('/');
  const n = await page.locator('#reads button.chip-read').count();
  await expect(page.locator('#reads button.chip-read').first()).toBeHidden();
  await expect(page.locator('#reads .reads-static dt')).toHaveCount(n);
  await expect(page.locator('#reads .reads-static dd').first()).toHaveText('в двадцать один час тридцать минут');
  await expect(page.locator('#reads .reads-static')).toBeVisible();
});
