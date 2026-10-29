import { expect, test } from '@playwright/test';

test('вопрос раскрывается и сворачивается', async ({ page }) => {
  await page.goto('/');
  const q = page.locator('#faq h3 button').nth(1);
  const answer = page.locator(`#${await q.getAttribute('aria-controls')}`);
  await expect(q).toHaveAttribute('aria-expanded', 'false');
  await expect(answer).toBeHidden();
  await q.click();
  await expect(q).toHaveAttribute('aria-expanded', 'true');
  await expect(answer).toBeVisible();
  await q.click();
  await expect(q).toHaveAttribute('aria-expanded', 'false');
  await expect(answer).toBeHidden();
});
