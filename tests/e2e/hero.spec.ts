import { expect, test } from '@playwright/test';

test('«Послушать» читает экран с подсветкой слов и останавливается', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('#play-btn');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#listen-label')).toHaveText('Остановить');
  await expect(page.locator('.w.is-on')).toHaveCount(1, { timeout: 1500 });
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.w.is-on')).toHaveCount(0);
});

test('звук не загрузился — кнопка в покое с понятной подписью', async ({ page }) => {
  await page.route('**/audio/hero.mp3', r => r.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await page.locator('#play-btn').click();
  await expect(page.locator('#listen-label')).toHaveText('Звук не включился, нажмите ещё раз');
  await expect(page.locator('#play-btn')).toHaveAttribute('aria-pressed', 'false');
});
