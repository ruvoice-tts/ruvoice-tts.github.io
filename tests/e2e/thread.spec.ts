import { expect, test } from '@playwright/test';

test('нить выходит из значка и тянется вниз, а не появляется готовой и не откатывается', async ({ page }) => {
  await page.goto('/');
  const drawn: number[] = [];
  for (let i = 0; i < 40; i++) {
    const v = await page.evaluate(() => {
      const l = document.querySelector<SVGPathElement>('#thread-a');
      if (!l || !l.getAttribute('d')) return null;
      return l.getTotalLength() - (parseFloat(getComputedStyle(l).strokeDashoffset) || 0);
    });
    if (v !== null) drawn.push(v);
    await page.waitForTimeout(60);
  }
  expect(drawn.length).toBeGreaterThan(5);
  expect(drawn[0]).toBeLessThan(drawn.at(-1)! * 0.3);
  for (let i = 1; i < drawn.length; i++) expect(drawn[i]).toBeGreaterThanOrEqual(drawn[i - 1] - 1);
});
