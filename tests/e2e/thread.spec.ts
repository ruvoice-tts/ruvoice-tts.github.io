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

// Первый заход: шрифтов ещё нет в кэше, с font-display: optional страница на системных шрифтах и чуть ниже.
// Нить всё равно огибает карточку скачивания справа, а не срезает наискосок к следующему разделу.
for (const width of [1424, 1440, 1280, 1100]) {
  test(`без своих шрифтов нить после плеера огибает карточку скачивания, ${width} px`, async ({ page }) => {
    await page.route('**/fonts/**', r => r.abort());
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    // у человека страница бывает чуть компактнее (метрики шрифта, масштаб): обход не должен зависеть от порога
    await page.addStyleTag({ content: '.hero { padding-bottom: 12px !important; }' });
    await page.waitForTimeout(300);
    await page.waitForFunction(() => document.querySelectorAll('#thread path.line').length > 1);
    const { maxX, cardRight } = await page.evaluate(() => {
      const l = document.querySelectorAll<SVGPathElement>('#thread path.line')[1];
      let maxX = 0;
      for (let s = 0; s < Math.min(l.getTotalLength(), 900); s += 10) maxX = Math.max(maxX, l.getPointAtLength(s).x);
      const page = document.getElementById('page')!.getBoundingClientRect();
      return { maxX, cardRight: document.getElementById('download')!.getBoundingClientRect().right - page.left };
    });
    expect(maxX).toBeGreaterThan(cardRight);
  });
}

// Плеер — часть нити: она входит в левый край и выходит из правого горизонтально, на высоте его волны.
test('нить входит в плеер и выходит из него ровно, как продолжение его линии', async ({ page }) => {
  await page.setViewportSize({ width: 1424, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => document.querySelectorAll('#thread path.line').length > 1);
  const r = await page.evaluate(() => {
    const pg = document.getElementById('page')!.getBoundingClientRect();
    const bar = document.getElementById('listen')!.getBoundingClientRect();
    const wave = document.querySelector('.wave')!.getBoundingClientRect();
    const cy = wave.top + wave.height / 2 - pg.top, left = bar.left - pg.left, right = bar.right - pg.left;
    const [a, b] = document.querySelectorAll<SVGPathElement>('#thread path.line');
    const yAt = (l: SVGPathElement, x: number) => {
      let best = { d: 1e9, y: 0 };
      for (let s = 0; s <= l.getTotalLength(); s += 1) {
        const p = l.getPointAtLength(s);
        if (Math.abs(p.y - cy) < 80 && Math.abs(p.x - x) < best.d) best = { d: Math.abs(p.x - x), y: p.y };
      }
      return best.y - cy;
    };
    return { entry: yAt(a, left), exit: yAt(b, right + 24) };
  });
  expect(Math.abs(r.entry)).toBeLessThanOrEqual(3);
  expect(Math.abs(r.exit)).toBeLessThanOrEqual(2);
});
