import { expect, test } from '@playwright/test';

// Звук не загрузился: каждая кнопка прослушивания возвращается в покой и говорит, что случилось.
test.beforeEach(async ({ page }) => {
  await page.route('**/audio/**', r => r.fulfill({ status: 404, body: '' }));
});

for (const [route, selector] of [['/', '#homo-play'], ['/', '#sr-play'], ['/packs/', 'section.pack .play-pill'], ['/packs/', 'section.pack .mini']] as const) {
  test(`ошибка звука видна и слышна: ${route} ${selector}`, async ({ page }) => {
    await page.goto(route);
    const btn = page.locator(selector).first();
    if (selector === 'section.pack .mini') await page.locator('section.pack details summary').first().click();
    await btn.click();
    await expect(btn).toHaveAttribute('aria-pressed', 'false');
    await expect(btn).toContainText('Звук не включился');
  });
}

test('ошибка звука в «Как читается» приходит чтецу', async ({ page }) => {
  await page.goto('/');
  await page.locator('#reads button.chip-read').first().click();
  await expect(page.locator('#reads-live')).toHaveText('Звук не включился, нажмите ещё раз');
});
