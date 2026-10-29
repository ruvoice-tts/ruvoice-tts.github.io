// Нить голоса: одна янтарная линия через всю страницу. Точки задают элементы с data-thread, по порядку документа:
//   start  — нижний конец внешней дуги логотипа, отсюда нить выходит;
//   wave   — плеер: нить заходит слева, внутри волну рисует сам плеер, дальше нить продолжается от его правого края;
//   pin    — янтарная точка надзаголовка раздела;
//   needle — стрелка ленты голосов: нить проходит через неё вертикально.
// Между точками нить идёт по полю (data-thread-side="left", по умолчанию справа) и пересекает страницу только
// в отступе над точкой, поэтому текст не перечёркивает. Рисуется по мере прокрутки; при уменьшении движения — целиком.
type P = [number, number];

const NS = 'http://www.w3.org/2000/svg';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');

/** Центростремительная кривая Катмулла — Рома (alpha 0.5) через точки, как кубические Безье: на крутых поворотах
 * не выбрасывает петли за край страницы, как обычная. Точки и опоры не выходят за [3, W − 3] по горизонтали. */
function spline(pts: P[], W: number): string {
  const cx = (x: number) => Math.min(W - 3, Math.max(3, x));
  const f = (p: number[]) => `${cx(p[0]).toFixed(1)},${p[1].toFixed(1)}`;
  const l = (a: P, b: P) => Math.sqrt(Math.max(1e-3, Math.hypot(b[0] - a[0], b[1] - a[1])));
  let d = `M${f(pts[0])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const d1 = l(p0, p1), d2 = l(p1, p2), d3 = l(p2, p3);
    const b1 = [0, 1].map(k => (d1 * d1 * p2[k] - d2 * d2 * p0[k] + (2 * d1 * d1 + 3 * d1 * d2 + d2 * d2) * p1[k]) / (3 * d1 * (d1 + d2)));
    const b2 = [0, 1].map(k => (d3 * d3 * p1[k] - d2 * d2 * p3[k] + (2 * d3 * d3 + 3 * d3 * d2 + d2 * d2) * p2[k]) / (3 * d3 * (d3 + d2)));
    d += ` C${f(b1)} ${f(b2)} ${f(p2)}`;
  }
  return d;
}

export function initThread(): void {
  const page = document.getElementById('page');
  const svg = document.getElementById('thread');
  if (!page || !svg) return;
  let lines: Array<{ glow: SVGPathElement; line: SVGPathElement; len: number; ys: Array<[number, number]> }> = [];
  let ready = false;

  const box = (el: Element) => {
    const p = page.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height };
  };

  function points(W: number): P[][] {
    const gutter = Math.max(8, (W - 1280) / 2 + 22);
    const segs: P[][] = [[]];
    const last = () => segs[segs.length - 1].at(-1);
    const go = (to: P, side: string | undefined, approach = 80) => {
      const from = last();
      const x = side === 'left' ? gutter : W - gutter;
      if (from && to[1] - from[1] > approach + 140) segs[segs.length - 1].push([x, from[1] + 64], [x, to[1] - approach]);
      segs[segs.length - 1].push(to);
    };
    let prev = '';
    for (const el of document.querySelectorAll<HTMLElement>('[data-thread]')) {
      if (!el.getClientRects().length) continue;
      // после точки надзаголовка нить уходит влево, в поле: вправо она перечеркнула бы сам надзаголовок
      const b = box(el), side = el.dataset.threadSide ?? (prev === 'pin' ? 'left' : undefined);
      prev = el.dataset.thread ?? '';
      switch (el.dataset.thread) {
        case 'start': {
          const s: P = [b.x + (70.7 - 18) / 72 * b.w, b.y + (58.3 - 18) / 72 * b.h];
          segs[segs.length - 1].push(s, [s[0] + 2, s[1] + 26]);
          break;
        }
        case 'wave': {
          const cy = b.y + b.h / 2;
          go([b.x + 2, cy], side, 36);
          segs.push([[b.x + b.w - 2, cy]]);
          break;
        }
        case 'pin':
          go([b.x + 4, b.y + b.h / 2], side);
          break;
        case 'needle': {
          const cx = b.x + b.w / 2;
          go([cx, b.y + 8], side, 14); // к стрелке подходим в зазоре над карточками, не задевая кнопки фильтров
          segs[segs.length - 1].push([cx, b.y + b.h + 24]);
          break;
        }
      }
    }
    return segs.filter(s => s.length > 1);
  }

  function layout(): void {
    // Пересчёт без анимации: иначе браузер успевает запомнить нить целиком нарисованной (getTotalLength
    // пересчитывает стиль раньше, чем выставлен штрих) и потом «откатывает» её назад.
    svg.classList.add('is-static');
    const W = page.clientWidth, H = page.scrollHeight;
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const segs = points(W);
    while (lines.length > segs.length) { const l = lines.pop()!; l.glow.remove(); l.line.remove(); }
    while (lines.length < segs.length) {
      const glow = document.createElementNS(NS, 'path'), line = document.createElementNS(NS, 'path');
      glow.setAttribute('class', 'glow'); line.setAttribute('class', 'line');
      if (!lines.length) line.id = 'thread-a';
      svg.append(glow, line);
      lines.push({ glow, line, len: 0, ys: [] });
    }
    segs.forEach((pts, i) => {
      const l = lines[i], d = spline(pts, W);
      l.glow.setAttribute('d', d); l.line.setAttribute('d', d);
      l.len = l.line.getTotalLength();
      l.ys = [];
      for (let s = 0; s <= l.len; s += 48) l.ys.push([s, l.line.getPointAtLength(s).y]);
      for (const p of [l.glow, l.line]) p.style.strokeDasharray = reduce.matches ? 'none' : String(l.len);
    });
    reveal();
    for (const l of lines) void getComputedStyle(l.line).strokeDashoffset; // зафиксировать без анимации
    svg.classList.remove('is-static');
  }

  /** Сколько нити видно: до 85 % высоты окна; до первого показа — нисколько; при уменьшении движения — вся. */
  function visible(l: (typeof lines)[number]): number {
    if (reduce.matches) return l.len;
    if (!ready) return 0;
    const limit = scrollY + innerHeight * 0.85 - (page.getBoundingClientRect().top + scrollY);
    for (const [s, y] of l.ys) if (y > limit) return s;
    return l.len;
  }

  function reveal(): void {
    for (const l of lines) {
      const off = String(Math.max(0, l.len - visible(l)));
      l.glow.style.strokeDashoffset = off;
      l.line.style.strokeDashoffset = off;
    }
  }

  // Нить — украшение: считается после загрузки страницы, в свободное время, чтобы не задерживать первую отрисовку.
  const start = () => {
    layout();
    let size = `${page.clientWidth}x${page.scrollHeight}`;
    new ResizeObserver(() => {
      const now = `${page.clientWidth}x${page.scrollHeight}`;
      if (now !== size) { size = now; layout(); }
    }).observe(page);
    reduce.addEventListener('change', layout);
    let queued = false;
    addEventListener('scroll', () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; reveal(); });
    }, { passive: true });
    if (reduce.matches) return;
    // Первый показ: нить выходит из значка и тянется вниз — отрезки по очереди, с одной скоростью.
    requestAnimationFrame(() => {
      ready = true;
      const vis = lines.map(visible), total = vis.reduce((a, b) => a + b, 0) || 1, D = 1.8;
      let before = 0;
      lines.forEach((l, i) => {
        const t = `stroke-dashoffset ${(D * vis[i] / total).toFixed(2)}s cubic-bezier(.45, 0, .55, 1) ${(D * before / total).toFixed(2)}s`;
        before += vis[i];
        for (const p of [l.glow, l.line]) p.style.transition = t;
      });
      reveal();
      setTimeout(() => { for (const l of lines) for (const p of [l.glow, l.line]) p.style.transition = ''; }, D * 1000 + 100);
    });
  };
  const idle = (f: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(f, { timeout: 1200 }) : setTimeout(f, 200));
  if (document.readyState === 'complete') idle(start);
  else addEventListener('load', () => idle(start), { once: true });
}
