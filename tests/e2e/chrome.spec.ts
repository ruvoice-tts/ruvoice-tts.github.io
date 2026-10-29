import { expect, test } from '@playwright/test';

test('кнопка темы переключает и запоминает тему', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const btn = page.locator('#theme-btn');
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await btn.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('#theme-btn')).toHaveAttribute('aria-pressed', 'true');
});

test('меню на телефоне открывается, Escape закрывает и возвращает фокус', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const btn = page.locator('#menu-btn');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#nav')).toBeHidden();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#nav a', { hasText: 'Голоса' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(btn).toBeFocused();
});
