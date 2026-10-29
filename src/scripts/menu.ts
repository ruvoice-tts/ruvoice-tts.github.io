// Шапка: меню на телефоне, кнопка темы, рамка снизу при прокрутке.
import { isDark, toggleTheme } from './theme';

export function initHeader(): void {
  const root = document.documentElement;
  const header = document.getElementById('site-header')!;
  const menuBtn = document.getElementById('menu-btn')!;
  const nav = document.getElementById('nav')!;
  const themeBtn = document.getElementById('theme-btn')!;

  const setMenu = (open: boolean) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', e => { if ((e.target as Element).closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
  });

  const syncTheme = () => {
    const d = isDark();
    root.classList.toggle('is-dark', d);
    themeBtn.setAttribute('aria-pressed', String(d));
  };
  themeBtn.addEventListener('click', () => { toggleTheme(); syncTheme(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
  syncTheme();

  const onScroll = () => header.classList.toggle('is-stuck', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
