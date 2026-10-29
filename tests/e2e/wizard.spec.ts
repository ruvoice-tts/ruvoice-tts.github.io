import { expect, test } from '@playwright/test';

test('подбор: файлом, русские, обновления полегче → лёгкая сборка, фокус на результате', async ({ page }) => {
  await page.goto('/');
  const w = page.locator('#wizard');
  await w.getByLabel('Файлом с этого сайта').check();
  await w.getByRole('button', { name: 'Дальше' }).click();
  await w.getByLabel('Русские', { exact: true }).check();
  await w.getByRole('button', { name: 'Дальше' }).click();
  await w.getByLabel('Да, хочу обновления полегче').check();
  await w.getByRole('button', { name: 'Подобрать' }).click();
  const heading = w.locator('#wizard-result-title');
  const release = await (await page.request.get('/release.json')).json();
  const lite = Boolean(release.app.lite && release.packs.ru_voices);
  await expect(heading).toHaveText(lite ? 'Вам подойдёт: Лёгкая сборка' : 'Вам подойдёт: Полная сборка');
  await expect(heading).toBeFocused();
  if (lite) await expect(w.locator(`#wizard-result a[href="${release.packs.ru_voices.url}"]`)).toHaveCount(1);
});
