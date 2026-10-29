import { expect, test } from '@playwright/test';

const routes = ['/', '/packs/', '/changelog/', '/screen-reader/', '/404.html'];

for (const route of routes) {
  test(`320 px без прокрутки вбок: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

test('шрифт 200 %: ничего не уезжает вбок, кнопки скачивания видны целиком', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const release = await (await page.request.get('/release.json')).json();
  for (const id of release.app.lite ? ['#dl-full', '#dl-lite'] : ['#dl-full']) {
    const b = (await page.locator(id).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
});

test('страница не ходит на чужие адреса', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', r => hosts.add(new URL(r.url()).hostname));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect([...hosts]).toEqual(['localhost']);
});
