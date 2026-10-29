import { expect, test } from '@playwright/test';

// Липкая шапка не закрывает то, к чему перешли по ссылке или куда пришёл фокус (WCAG 2.4.11).
test.use({ viewport: { width: 390, height: 844 } });

const headerBottom = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.getElementById('site-header')!.getBoundingClientRect().bottom);

test('переход к карточке скачивания: заголовок не под шапкой', async ({ page }) => {
  await page.goto('/#download');
  await page.waitForTimeout(300);
  const top = await page.locator('#download-title').evaluate(el => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(await headerBottom(page));
});

test('фокус снизу вверх: ссылка не прячется под шапкой', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.locator('#packs-title ~ .grid a.pack-dl').first().focus();
  await page.waitForTimeout(200);
  const top = await page.locator('#packs-title ~ .grid a.pack-dl').first().evaluate(el => el.getBoundingClientRect().top);
  expect(top).toBeGreaterThanOrEqual(await headerBottom(page));
});
