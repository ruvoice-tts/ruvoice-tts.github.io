import { expect, test } from '@playwright/test';

const routes = ['/', '/packs/', '/changelog/', '/screen-reader/', '/404.html'];

for (const route of routes) {
  test(`320 px без прокрутки вбок: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });
}

// .page обрезает всё, что шире экрана (overflow-x: clip), поэтому scrollWidth переполнения не видит:
// ищем сами элементы, которые вылезли за край. Лента голосов прокручивается вбок намеренно, декор и скрытое не в счёт.
for (const width of [390, 360]) {
  for (const route of ['/', '/packs/', '/screen-reader/']) {
    test(`шрифт 200 %, ${width} px: ничего не обрезано по краю — ${route}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      const cut = await page.evaluate(() => {
        const W = document.documentElement.clientWidth, out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>('header *, main *, footer *')) {
          if (el.closest('.voice-list, .marquee, [aria-hidden="true"], .vh, svg')) continue;
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          if (r.right > W + 1 || r.left < -1) out.push(`${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]} «${(el.textContent ?? '').trim().slice(0, 24)}» ${Math.round(r.left)}..${Math.round(r.right)}`);
        }
        return out;
      });
      expect(cut).toEqual([]);
    });
  }
}

test('страница не ходит на чужие адреса', async ({ page }) => {
  const hosts = new Set<string>();
  page.on('request', r => hosts.add(new URL(r.url()).hostname));
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect([...hosts]).toEqual(['localhost']);
});
