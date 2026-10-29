import { expect, test } from '@playwright/test';

test('фильтр «Белорусские» оставляет только белорусские голоса', async ({ page }) => {
  await page.goto('/');
  await page.locator('#voices label', { hasText: 'Белорусские' }).click();
  const shown = page.locator('#voices li.voice:visible');
  await expect(shown).toHaveCount(1);
  await expect(shown.first()).toContainText('bel_larisa');
});

test('одновременно играет один голос', async ({ page }) => {
  await page.goto('/');
  const a = page.locator('#voices li.voice').nth(0).locator('button');
  const b = page.locator('#voices li.voice').nth(1).locator('button');
  await a.click();
  await expect(a).toHaveAttribute('aria-pressed', 'true');
  await b.click();
  await expect(b).toHaveAttribute('aria-pressed', 'true');
  await expect(a).toHaveAttribute('aria-pressed', 'false');
});

test('с клавиатуры от фильтров доходим до кнопки первого голоса', async ({ page }) => {
  await page.goto('/');
  await page.locator('#voices input[name="vphrase"]').last().focus();
  const first = page.locator('#voices li.voice').first().locator('button');
  for (let i = 0; i < 6; i++) {
    if (await first.evaluate(el => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(first).toBeFocused();
});
