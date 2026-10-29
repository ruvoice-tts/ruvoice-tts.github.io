import { expect, test } from 'vitest';
import { formatDateRu, formatMB, pluralRu } from '../../src/lib/format';

test('размер в десятичных мегабайтах, как показывает Android', () => {
  expect(formatMB(243_169_000)).toBe('243 МБ');
  expect(formatMB(86_657_850)).toBe('87 МБ');
  expect(formatMB(109_065_865)).toBe('109 МБ');
});

test('дата по-русски, год только если не текущий', () => {
  expect(formatDateRu('2026-10-21T20:38:35Z', new Date('2026-10-29'))).toBe('21 октября');
  expect(formatDateRu('2026-10-21T20:38:35Z', new Date('2027-01-05'))).toBe('21 октября 2026');
});

test('множественное число', () => {
  expect([1, 3, 22, 29, 11, 21].map(n => pluralRu(n, 'голос', 'голоса', 'голосов')))
    .toEqual(['голос', 'голоса', 'голоса', 'голосов', 'голосов', 'голос']);
});
