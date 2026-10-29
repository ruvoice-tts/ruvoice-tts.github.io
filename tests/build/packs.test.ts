import { expect, test } from 'vitest';
import { built, page } from './html';
import meta from '../../src/data/packs.json';
import { formatMB } from '../../src/lib/format';

test('на странице паков — выложенные паки по порядку, украинских нет', () => {
  const ids = page('/packs/').querySelectorAll('section.pack').map(s => s.id.replace('pack-', ''));
  expect(ids).toEqual(meta.filter(m => m.id in built().packs).sort((a, b) => a.order - b.order).map(m => m.id));
  expect(ids).not.toContain('cis_uk');
});

test('у каждого пака заголовок и ссылка скачивания с понятным именем', () => {
  const packs = built().packs;
  for (const s of page('/packs/').querySelectorAll('section.pack')) {
    const id = s.id.replace('pack-', ''), m = meta.find(x => x.id === id)!;
    expect(s.querySelector('h2')!.text.trim()).toBe(m.title);
    const a = s.querySelector('a.pack-dl')!;
    expect(a.getAttribute('href')).toBe(packs[id].url);
    // имя ссылки для чтеца — её текст целиком (видимая подпись + скрытые для глаз части), без aria-label
    expect(a.hasAttribute('aria-label')).toBe(false);
    expect(a.text.replace(/\s+/g, ' ').trim()).toBe(`Скачать пак «${m.title}», ZIP, ${formatMB(packs[id].size)}`.replace(/\s+/g, ' '));
  }
});

test('девять вопросов, в ответе про ошибку — группа в Telegram', () => {
  const faq = page('/').querySelector('#faq')!;
  expect(faq.querySelectorAll('h3').length).toBe(9);
  expect(faq.querySelector('a[href="https://t.me/ruVoiceTTS"]')).not.toBeNull();
});
