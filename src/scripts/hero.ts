// Первый экран: «Послушать» читает заголовок и абзац голосом Айдара, слова подсвечиваются,
// линия в плеере качается по огибающей громкости.
import { envAt, player, wordAt } from './player';

interface HeroData { src: string; duration: number; hop: number; env: number[]; words: [number, number][] }

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function initHero(): void {
  const dataEl = document.getElementById('hero-data');
  if (!dataEl) return;
  const data: HeroData = JSON.parse(dataEl.textContent!);
  const bar = document.getElementById('listen')!;
  const btn = document.getElementById('play-btn')!;
  const label = document.getElementById('listen-label')!;
  const timeEl = document.getElementById('listen-time')!;
  const words = [...document.querySelectorAll<HTMLElement>('h1 .w, .lede .w')];
  const wave = document.getElementById('wave')!;
  const path = wave.querySelector('path')!;
  const dot = wave.querySelector('circle')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let ww = 0, wh = 48, cur = -1, amp = 0, phase = 0;

  /** В покое — прямая; во время чтения — волна, сходящая на нет к краям. */
  const draw = (a: number, prog: number) => {
    const n = Math.max(24, Math.round(ww / 6)), mid = wh / 2;
    let d = '';
    for (let i = 0; i <= n; i++) {
      const x = ww * i / n, env = Math.sin(Math.PI * i / n);
      const y = mid + a * (wh * .42) * env * Math.sin(i / n * Math.PI * 7 + phase) * (.75 + .25 * Math.sin(i * 1.7 + phase * .6));
      d += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    path.setAttribute('d', d);
    dot.setAttribute('cx', (ww * prog).toFixed(1));
    dot.setAttribute('cy', (mid + a * (wh * .42) * Math.sin(Math.PI * prog) * Math.sin(prog * Math.PI * 7 + phase)).toFixed(1));
  };
  const layoutWave = () => {
    const r = wave.getBoundingClientRect();
    ww = r.width; wh = r.height || 48;
    wave.setAttribute('viewBox', `0 0 ${ww} ${wh}`);
    draw(0, 0);
  };
  const setWord = (i: number) => {
    if (i === cur) return;
    words[cur]?.classList.remove('is-on');
    words[i]?.classList.add('is-on');
    cur = i;
  };
  const reset = (msg = 'Послушать, как звучит') => {
    setWord(-1);
    amp = 0;
    bar.classList.remove('is-playing');
    label.textContent = msg;
    timeEl.textContent = `0:00 / ${fmt(Math.round(data.duration))}`;
    draw(0, 0);
  };

  btn.addEventListener('click', () => {
    if (player.current === data.src) { player.stop(); return; }
    bar.classList.add('is-playing');
    label.textContent = 'Остановить';
    void player.play(data.src, {
      onTick: t => {
        setWord(wordAt(t, data.words));
        amp += (envAt(t, data.env, data.hop) - amp) * .35;
        if (!reduce.matches) phase += .22;
        draw(reduce.matches ? 0 : amp, Math.min(1, t / data.duration));
        timeEl.textContent = `${fmt(t)} / ${fmt(Math.round(data.duration))}`;
      },
      onEnd: () => reset(),
      onError: () => reset('Звук не включился, нажмите ещё раз'),
    });
  });
  new ResizeObserver(layoutWave).observe(wave);
  layoutWave();

  // переход к карточке скачивания переводит туда и фокус: чтец сразу слышит варианты
  const card = document.getElementById('download');
  const focusCard = () => card?.focus({ preventScroll: true });
  document.querySelectorAll('a[href="#download"]').forEach(a => a.addEventListener('click', () => setTimeout(focusCard, 0)));
  if (location.hash === '#download') setTimeout(focusCard, 0);
}
