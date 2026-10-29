// Тема: по умолчанию системная; кнопка переключает и запоминает выбор.
const KEY = 'rv-theme';
const root = document.documentElement;
const dark = matchMedia('(prefers-color-scheme: dark)');

export function isDark(): boolean {
  return (root.dataset.theme ?? (dark.matches ? 'dark' : 'light')) === 'dark';
}

export function toggleTheme(): void {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem(KEY, root.dataset.theme); } catch { /* хранилище недоступно — тема до перезагрузки */ }
}
