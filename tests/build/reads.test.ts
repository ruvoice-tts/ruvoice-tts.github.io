import { expect, test } from 'vitest';
import { page } from './html';
import phrases from '../../src/data/phrases.json';

test('восемь примеров — кнопки с исходным текстом', () => {
  const chips = page('/').querySelectorAll('#reads button.chip-read');
  expect(chips.length).toBe(8);
  expect(chips.map(c => c.getAttribute('type'))).toEqual(Array(8).fill('button'));
  expect(chips.map(c => c.querySelector('.raw')!.text.trim())).toEqual(phrases.reads.map(r => r.raw));
});

test('ударения в русском тексте — кириллица со знаком U+0301, не латинские á и ó', () => {
  expect(page('/').querySelector('#reads')!.toString()).not.toMatch(/[áóéý]/);
});
