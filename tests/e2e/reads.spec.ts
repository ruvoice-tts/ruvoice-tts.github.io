import { expect, test } from '@playwright/test';

test('пример «в 21:30» звучит, чтец слышит расшифровку', async ({ page }) => {
  await page.goto('/');
  const chip = page.locator('#reads button.chip-read', { hasText: 'в 21:30' });
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#reads-live')).toHaveText('Читается: в двадцать один час тридцать минут');
});

test('расшифровка для чтеца приходит после образца, а не поверх него', async ({ page }) => {
  await page.goto('/');
  const chip = page.locator('#reads button.chip-read', { hasText: 'в 21:30' });
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#reads-live')).toHaveText('');
  await expect(chip).toHaveAttribute('aria-pressed', 'false', { timeout: 8000 });
  await expect(page.locator('#reads-live')).toHaveText('Читается: в двадцать один час тридцать минут');
});

test('с JS вместо списка — кнопки примеров', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#reads button.chip-read').first()).toBeVisible();
  await expect(page.locator('#reads .reads-static')).toBeHidden();
});
