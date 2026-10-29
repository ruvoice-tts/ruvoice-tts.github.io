// Простые кнопки прослушивания: button[data-play] с адресом образца. Нажатая кнопка — aria-pressed="true";
// другой звук или конец образца возвращает её в покой (общий player играет один звук за раз).
import { player } from './player';

export function initPlayButtons(root: ParentNode = document): void {
  for (const btn of root.querySelectorAll<HTMLButtonElement>('button[data-play]')) {
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') { player.stop(); return; }
      btn.setAttribute('aria-pressed', 'true');
      const done = () => btn.setAttribute('aria-pressed', 'false');
      void player.play(btn.dataset.play!, { onEnd: done, onError: done });
    });
  }
}
