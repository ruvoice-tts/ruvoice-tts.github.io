import { expect, test } from 'vitest';
import { envAt, wordAt } from '../../src/scripts/player';

const words: [number, number][] = [[0.31, 0.74], [0.8, 1.19]];

test('слово под текущим временем', () => {
  expect(wordAt(0.5, words)).toBe(0);
  expect(wordAt(1.0, words)).toBe(1);
  expect(wordAt(2.0, words)).toBe(-1);
});

test('громкость по огибающей', () => {
  expect(envAt(0.03, [0.1, 0.9], 0.025)).toBe(0.9);
  expect(envAt(9, [0.1, 0.9], 0.025)).toBe(0);
});
