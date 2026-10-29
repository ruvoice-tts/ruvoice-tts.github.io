// Кнопки прослушивания: button[data-play] с адресом образца и подписью в .label.
// Нажата — aria-pressed="true" и «Остановить»; звук кончился или начался другой — снова как было;
// звук не загрузился — «Звук не включился». Общий player играет один звук за раз.
import { player } from './player';

export function initPlayButtons(root: ParentNode = document): void {
  for (const btn of root.querySelectorAll<HTMLButtonElement>('button[data-play]')) {
    if (btn.dataset.ready) continue;
    btn.dataset.ready = '1';
    const label = btn.querySelector<HTMLElement>('.label');
    const idle = label?.textContent ?? '';
    const set = (on: boolean, text = on ? 'Остановить' : idle) => {
      btn.setAttribute('aria-pressed', String(on));
      if (label) label.textContent = text;
    };
    btn.addEventListener('click', () => {
      if (btn.getAttribute('aria-pressed') === 'true') { player.stop(); return; }
      set(true);
      void player.play(btn.dataset.play!, { onEnd: () => set(false), onError: () => set(false, 'Звук не включился') });
    });
  }
}
