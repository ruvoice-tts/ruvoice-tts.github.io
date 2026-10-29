// Один общий проигрыватель на страницу: новый звук останавливает прежний.

/** Слово, которое звучит в момент t: чуть раньше начала и чуть позже конца, чтобы подсветка не мигала. */
export function wordAt(t: number, words: [number, number][]): number {
  for (let i = 0; i < words.length; i++) {
    const [a, b] = words[i];
    if (t >= a - 0.04 && t < b + 0.06) return i;
  }
  return -1;
}

/** Громкость (0..1) из огибающей с шагом hop секунд. */
export function envAt(t: number, env: number[], hop: number): number {
  const i = Math.floor(t / hop);
  return i >= 0 && i < env.length ? env[i] : 0;
}

export interface Handlers { onTick?(t: number): void; onEnd?(): void; onError?(): void }

let audio: HTMLAudioElement | null = null;
let current: string | null = null;
let handlers: Handlers = {};
let raf = 0;

function finish(error = false): void {
  cancelAnimationFrame(raf);
  const h = handlers;
  handlers = {};
  current = null;
  if (error) h.onError?.(); else h.onEnd?.();
}

function el(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio();
    audio.preload = 'none';
    audio.addEventListener('ended', () => finish());
    audio.addEventListener('error', () => { if (current) finish(true); });
  }
  return audio;
}

export const player = {
  get current(): string | null { return current; },

  async play(src: string, h: Handlers): Promise<void> {
    const a = el();
    if (current) { a.pause(); finish(); }
    handlers = h;
    current = src;
    a.src = src;
    try {
      await a.play();
    } catch {
      if (current === src) finish(true);
      return;
    }
    const tick = () => {
      if (current !== src) return;
      h.onTick?.(a.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  },

  stop(): void {
    if (!current) return;
    el().pause();
    finish();
  },
};
