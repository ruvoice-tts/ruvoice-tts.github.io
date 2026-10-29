import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routes = ['/', '/packs/', '/changelog/', '/screen-reader/', '/404.html'];
const sizes = [{ width: 390, height: 844 }, { width: 1440, height: 900 }];

for (const route of routes) {
  for (const colorScheme of ['light', 'dark'] as const) {
    for (const size of sizes) {
      test(`axe ${route} ${colorScheme} ${size.width}`, async ({ page }) => {
        await page.setViewportSize(size);
        await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
        await page.goto(route);
        const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        expect(r.violations.map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
      });
    }
  }
}
