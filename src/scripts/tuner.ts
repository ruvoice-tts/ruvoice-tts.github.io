// Лента голосов: фильтры, выбор фразы, кнопка на каждой карточке, «Слушать подряд».
// Играет один голос за раз (общий player); волна карточки качается по огибающей громкости образца.
import { player } from './player';

/** env — громкость по 50 мс цифрами 0–9, чтобы данные ленты весили килобайты, а не десятки. */
interface Clip { src: string; env: string }
type TunerData = Record<string, Record<string, Clip>>;

export function initTuner(): void {
  const root = document.getElementById('voices');
  const dataEl = document.getElementById('tuner-data');
  if (!root || !dataEl) return;
  const data: TunerData = JSON.parse(dataEl.textContent!);
  const cards = [...root.querySelectorAll<HTMLElement>('li.voice')];
  const list = root.querySelector<HTMLElement>('.voice-list')!;
  const seqBtn = root.querySelector<HTMLButtonElement>('#tuner-all')!;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let seq = false;

  const phrase = () => root.querySelector<HTMLInputElement>('input[name="vphrase"]:checked')?.value ?? 'book';
  const clipOf = (card: HTMLElement) => { const d = data[card.dataset.key!]; return d[phrase()] ?? d.book; };

  const drawWave = (card: HTMLElement, amp: number, phase: number) => {
    const svg = card.querySelector('svg')!, path = svg.querySelector('path')!;
    const w = svg.clientWidth || 200, h = svg.clientHeight || 40, n = 40;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    let d = '';
    for (let i = 0; i <= n; i++) {
      const x = w * i / n, y = h / 2 + amp * h * .42 * Math.sin(Math.PI * i / n) * Math.sin(i / n * Math.PI * 6 + phase);
      d += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
    }
    path.setAttribute('d', d);
  };
  const setState = (card: HTMLElement, on: boolean, text = on ? 'Остановить' : 'Послушать') => {
    const btn = card.querySelector('button')!;
    btn.querySelector('.vlabel')!.textContent = text;
    card.classList.toggle('is-playing', on);
    if (!on) drawWave(card, 0, 0);
  };

  const play = (card: HTMLElement, then?: () => void) => {
    if (card.classList.contains('is-playing')) { player.stop(); return; }
    const clip = clipOf(card);
    let amp = 0, phase = 0;
    setState(card, true);
    void player.play(clip.src, {
      onTick: t => {
        const e = Number(clip.env[Math.floor(t / .05)] ?? 0) / 9;
        amp += (e - amp) * .35;
        if (!reduce.matches) phase += .22;
        drawWave(card, reduce.matches ? 0 : amp, phase);
      },
      onEnd: () => { setState(card, false); then?.(); },
      onError: () => { setState(card, false, 'Звук не включился'); stopSeq(); },
    });
  };

  function stopSeq(): void {
    if (!seq) return;
    seq = false;
    seqBtn.textContent = 'Слушать подряд';
  }

  for (const card of cards) {
    card.querySelector('button')!.addEventListener('click', () => { stopSeq(); play(card); });
    drawWave(card, 0, 0);
  }
  root.querySelectorAll<HTMLInputElement>('input[name="vfilter"]').forEach(r => r.addEventListener('change', () => {
    const f = r.value;
    stopSeq();
    player.stop();
    for (const c of cards) {
      c.hidden = !(f === 'all' || (f === 'builtin' ? c.dataset.builtin === 'true'
        : f === 'packs' ? c.dataset.builtin !== 'true' : c.dataset.lang === f));
    }
  }));
  root.querySelectorAll<HTMLInputElement>('input[name="vphrase"]').forEach(r => r.addEventListener('change', () => {
    stopSeq();
    player.stop();
  }));
  seqBtn.addEventListener('click', () => {
    if (seq) { stopSeq(); player.stop(); return; }
    const queue = cards.filter(c => !c.hidden);
    seq = true;
    seqBtn.textContent = 'Остановить подряд';
    let i = 0;
    const next = () => {
      if (!seq || i >= queue.length) { stopSeq(); return; }
      const c = queue[i++];
      // крутим только саму ленту: scrollIntoView тянул бы к ней всю страницу, даже если человек ушёл ниже
      list.scrollTo({ left: c.offsetLeft - (list.clientWidth - c.offsetWidth) / 2, behavior: reduce.matches ? 'auto' : 'smooth' });
      play(c, next);
    };
    next();
  });
}
