import { expect, test } from 'vitest';
import { built, page } from './html';
import meta from '../../src/data/packs.json';
import { formatMB } from '../../src/lib/format';

// Ожидания строятся из данных, по которым собран сайт (dist/release.json): новый пак в релизе — не повод
// ронять сборку в CI. Что невыложенные паки не видны, проверяет tests/unit/site.test.ts на фикстуре.
const order = (id: string) => meta.find(m => m.id === id)?.order ?? 999;
const title = (id: string) => meta.find(m => m.id === id)?.title ?? id;

test('на странице паков — все выложенные паки, по порядку описаний', () => {
  const ids = page('/packs/').querySelectorAll('section.pack').map(s => s.id.replace('pack-', ''));
  expect(ids).toEqual(Object.keys(built().packs).sort((a, b) => order(a) - order(b)));
});

test('у каждого пака заголовок и ссылка скачивания с понятным именем', () => {
  const packs = built().packs;
  for (const s of page('/packs/').querySelectorAll('section.pack')) {
    const id = s.id.replace('pack-', '');
    expect(s.querySelector('h2')!.text.trim()).toBe(title(id));
    const a = s.querySelector('a.pack-dl')!;
    expect(a.getAttribute('href')).toBe(packs[id].url);
    // имя ссылки для чтеца — её текст целиком (видимая подпись + скрытые для глаз части), без aria-label
    expect(a.hasAttribute('aria-label')).toBe(false);
    expect(a.text.replace(/\s+/g, ' ').trim()).toBe(`Скачать пак «${title(id)}», ZIP, ${formatMB(packs[id].size)}`.replace(/\s+/g, ' '));
  }
});

test('девять вопросов, в ответе про ошибку — группа в Telegram', () => {
  const faq = page('/').querySelector('#faq')!;
  expect(faq.querySelectorAll('h3').length).toBe(9);
  expect(faq.querySelector('a[href="https://t.me/ruVoiceTTS"]')).not.toBeNull();
});

test('в строке фактов число отделено от слова «голоса»', () => {
  for (const f of page('/').querySelectorAll('#packs-title ~ .grid .facts')) {
    if (/^\d/.test(f.text)) expect(f.text).toMatch(/^\d+\s(голос|голоса|голосов) · /);
  }
});

test('в карточке пака чтецу сначала «Скачать»: ссылка сразу после названия', () => {
  for (const path of ['/', '/packs/'])
    for (const card of page(path).querySelectorAll('.pack')) {
      const next = card.querySelector('h2, h3')!.nextElementSibling!;
      expect(next.classList.contains('actions'), path).toBe(true);
      expect(next.querySelector('a')!.classList.contains('pack-dl'), path).toBe(true);
    }
});

test('в карточках паков на главной есть нужная версия приложения', () => {
  for (const card of page('/').querySelectorAll('#packs .pack')) {
    const id = card.querySelector('a.pack-dl')!.getAttribute('id')!.replace(/^tease-|-dl$/g, '');
    const m = meta.find(p => p.id === id);
    if (m?.minVersion) expect(card.text.replace(/\s+/g, ' '), id).toContain(`Нужна версия ${m.minVersion} или новее`);
  }
});
