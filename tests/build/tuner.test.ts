import { expect, test } from 'vitest';
import { built, page } from './html';
import voices from '../../src/data/voices.json';

const visible = () => {
  const packs = built().packs;
  return voices.filter(v => v.inTuner && (v.builtIn || v.pack in packs));
};

test('в ленте голоса видимых паков и встроенные', () => {
  const cards = page('/').querySelectorAll('#voices li.voice');
  expect(cards.length).toBe(visible().length);
  for (const c of cards) expect(c.querySelector('button')!.getAttribute('aria-pressed')).toBe('false');
});

test('украинских нет, пока их пак не выложен', () => {
  const html = page('/').querySelector('#voices')!.toString();
  if (!('cis_uk_ext' in built().packs)) expect(html).not.toContain('ukr_');
});
