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
  // тянется, а не появляется скачком: есть кадры посередине
  expect(drawn.some(v => v > drawn.at(-1)! * 0.15 && v < drawn.at(-1)! * 0.85)).toBe(true);
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

// Первый заход: словарь переносов и шрифты догружаются позже, абзац над плеером перестраивается и плеер
// сдвигается, а высота страницы та же (карточка скачивания выше колонки). Нить должна пересчитаться.
test('плеер сдвинулся после отрисовки нити — нить переезжает вместе с ним', async ({ page }) => {
  await page.setViewportSize({ width: 1424, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => document.querySelectorAll('#thread path.line').length > 1);
  const before = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.addStyleTag({ content: '.lede { margin-bottom: -30px !important; }' });
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(before);
  const off = await page.evaluate(() => {
    const pg = document.getElementById('page')!.getBoundingClientRect();
    const wave = document.querySelector('.wave')!.getBoundingClientRect();
    const cy = wave.top + wave.height / 2 - pg.top, x = document.getElementById('listen')!.getBoundingClientRect().left - pg.left;
    const a = document.querySelector<SVGPathElement>('#thread path.line')!;
    let best = { d: 1e9, y: 0 };
    for (let s = 0; s <= a.getTotalLength(); s += 1) {
      const p = a.getPointAtLength(s);
      if (Math.abs(p.y - cy) < 80 && Math.abs(p.x - x) < best.d) best = { d: Math.abs(p.x - x), y: p.y };
    }
    return best.y - cy;
  });
  expect(Math.abs(off)).toBeLessThanOrEqual(3);
});

// Первый заход: пока нить готовится, страница ещё раз перестраивается (догрузились переносы).
// Нить всё равно должна протянуться от значка, а не появиться целиком.
test('перестройка страницы в момент появления нити не срывает анимацию', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#thread path.line')?.getAttribute('d'));
  await page.addStyleTag({ content: '.lede { margin-bottom: -30px !important; }' });
  const drawn: number[] = [];
  for (let i = 0; i < 45; i++) {
    drawn.push(await page.evaluate(() => {
      const l = document.querySelector<SVGPathElement>('#thread-a')!;
      return l.getTotalLength() - (parseFloat(getComputedStyle(l).strokeDashoffset) || 0);
    }));
    await page.waitForTimeout(60);
  }
  const final = drawn.at(-1)!;
  expect(drawn.some(v => v > final * 0.15 && v < final * 0.85)).toBe(true);
});

test('перестройка страницы посреди рисования не показывает нить сразу целиком', async ({ page }) => {
  await page.goto('/');
  const part = () => page.evaluate(() => {
    const l = document.querySelector<SVGPathElement>('#thread-a');
    if (!l || !l.getAttribute('d')) return 0;
    return (l.getTotalLength() - (parseFloat(getComputedStyle(l).strokeDashoffset) || 0)) / l.getTotalLength();
  });
  await expect.poll(part, { timeout: 5000, intervals: [30] }).toBeGreaterThan(0.08);
  await page.addStyleTag({ content: '.lede { margin-bottom: -30px !important; }' });
  await page.waitForTimeout(150);
  const after: number[] = [];
  for (let i = 0; i < 40; i++) { after.push(+(await part()).toFixed(3)); await page.waitForTimeout(60); }
  // тянется дальше по кадрам, а не перескакивает к итогу: несколько разных промежуточных значений
  const final = after.at(-1)!;
  expect(new Set(after.filter(v => v < final)).size).toBeGreaterThanOrEqual(4);
});
