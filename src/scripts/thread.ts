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

/** Кривая Катмулла — Рома через точки, как гладкие кубические Безье. */
function spline(pts: P[]): string {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
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
    for (const el of document.querySelectorAll<HTMLElement>('[data-thread]')) {
      if (!el.getClientRects().length) continue;
      const b = box(el), side = el.dataset.threadSide;
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
          go([cx, b.y - 24], side);
          segs[segs.length - 1].push([cx, b.y + b.h + 24]);
          break;
        }
      }
    }
    return segs.filter(s => s.length > 1);
  }

  function layout(): void {
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
      const l = lines[i], d = spline(pts);
      l.glow.setAttribute('d', d); l.line.setAttribute('d', d);
      l.len = l.line.getTotalLength();
      l.ys = [];
      for (let s = 0; s <= l.len; s += 24) l.ys.push([s, l.line.getPointAtLength(s).y]);
      for (const p of [l.glow, l.line]) p.style.strokeDasharray = reduce.matches ? 'none' : String(l.len);
    });
    reveal();
  }

  /** Видимая часть нити — до 85 % высоты окна; при уменьшении движения — вся. */
  function reveal(): void {
    const limit = scrollY + innerHeight * 0.85 - (page.getBoundingClientRect().top + scrollY);
    for (const l of lines) {
      let vis = 0;
      if (reduce.matches) vis = l.len;
      else if (ready) { vis = l.len; for (const [s, y] of l.ys) if (y > limit) { vis = s; break; } }
      const off = String(Math.max(0, l.len - vis));
      l.glow.style.strokeDashoffset = off;
      l.line.style.strokeDashoffset = off;
    }
  }

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; reveal(); });
  }, { passive: true });
  new ResizeObserver(() => layout()).observe(page);
  reduce.addEventListener('change', layout);
  layout();
  (document.fonts?.ready ?? Promise.resolve()).then(() => {
    layout();
    if (reduce.matches) return;
    svg.classList.add('is-drawing');
    requestAnimationFrame(() => { ready = true; reveal(); });
    setTimeout(() => svg.classList.remove('is-drawing'), 1400);
  });
}
