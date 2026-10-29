import { expect, test } from 'vitest';
import { page } from './html';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

test('заголовки разделов истории', () => {
  const h2 = page('/').querySelectorAll('h2').map(h => norm(h.text));
  for (const t of ['Работает там, где вы уже читаете', 'Ошибся в слове? Поправьте один раз', 'С TalkBack — как родной', 'Три шага до первой книги']) {
    expect(h2).toContain(t);
  }
});

test('установка — нумерованный список из трёх шагов', () => {
  expect(page('/').querySelectorAll('#install ol.steps > li').length).toBe(3);
});

test('ценности есть в самом HTML, не дорисовываются скриптом', () => {
  const html = page('/').querySelector('main')!.text;
  for (const t of ['Без интернета.', 'Без рекламы.', 'Без подписок.', 'Открытый код.']) expect(html).toContain(t);
});
