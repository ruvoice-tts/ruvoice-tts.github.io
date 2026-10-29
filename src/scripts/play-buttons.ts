// Кнопки прослушивания: button[data-play] с адресом образца и подписью в .label.
// Нажата — «Остановить» (и класс is-on для вида); звук кончился или начался другой — снова как было;
// aria-pressed не ставим: с меняющейся подписью чтец сказал бы «Остановить, включено».
// звук не загрузился — «Звук не включился». Общий player играет один звук за раз.
import { player } from './player';

export function initPlayButtons(root: ParentNode = document): void {
  for (const btn of root.querySelectorAll<HTMLButtonElement>('button[data-play]')) {
    if (btn.dataset.ready) continue;
    btn.dataset.ready = '1';
    const label = btn.querySelector<HTMLElement>('.label');
    const idle = label?.textContent ?? '';
    const set = (on: boolean, text = on ? 'Остановить' : idle) => {
      btn.classList.toggle('is-on', on);
      if (label) label.textContent = text;
    };
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-on')) { player.stop(); return; }
      set(true);
      void player.play(btn.dataset.play!, { onEnd: () => set(false), onError: () => set(false, 'Звук не включился') });
    });
  }
}
