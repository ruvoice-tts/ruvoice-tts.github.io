// «Как читается»: нажатие на пример — звучит образец, а произнесённый текст проступает по ходу звука.
// Чтецу расшифровка приходит один раз целиком через живую область.
import { player } from './player';

interface Read { src: string; raw: string; display: string; duration: number }

export function initReads(): void {
  const root = document.getElementById('reads');
  const dataEl = document.getElementById('reads-data');
  if (!root || !dataEl) return;
  const data: Record<string, Read> = JSON.parse(dataEl.textContent!);
  const live = document.getElementById('reads-live')!;
  const outRaw = document.getElementById('reads-out-raw')!;
  const outSaid = document.getElementById('reads-out-said')!;
  const chips = [...root.querySelectorAll<HTMLButtonElement>('button.chip-read')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  const show = (r: Read, frac: number) => {
    outRaw.textContent = r.raw;
    const n = reduce.matches ? r.display.length : Math.round(r.display.length * frac);
    outSaid.innerHTML = '';
    const on = document.createElement('span'), off = document.createElement('span');
    on.textContent = r.display.slice(0, n);
    off.textContent = r.display.slice(n);
    off.className = 'rest';
    outSaid.append(on, off);
  };

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const r = data[chip.dataset.key!];
      if (chip.getAttribute('aria-pressed') === 'true') { player.stop(); return; }
      for (const c of chips) c.setAttribute('aria-pressed', String(c === chip));
      live.textContent = `Читается: ${r.display}`;
      show(r, 0);
      const done = () => { chip.setAttribute('aria-pressed', 'false'); show(r, 1); };
      void player.play(r.src, {
        // текст проступает чуть впереди звука: последние буквы появляются к концу фразы, а не после неё
        onTick: t => show(r, Math.min(1, (t - .25) / Math.max(.3, r.duration - .45))),
        onEnd: done,
        onError: done,
      });
    });
  }

}
