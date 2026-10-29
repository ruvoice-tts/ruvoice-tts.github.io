// Вопросы: без JS все ответы раскрыты; с JS раскрыт первый, остальные открываются кнопкой в заголовке.
export function initFaq(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('#faq h3 button')];
  buttons.forEach((btn, i) => {
    const answer = document.getElementById(btn.getAttribute('aria-controls')!)!;
    const set = (open: boolean) => { btn.setAttribute('aria-expanded', String(open)); answer.hidden = !open; };
    set(i === 0);
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  });
}
