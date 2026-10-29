// Шрифты сайта из пакетов fontsource, урезанные до нужных символов, в public/fonts/.
// Кириллица (русские, белорусские, украинские буквы, знак ударения U+0301, №) и латиница без европейских
// диакритик плюс типографские знаки и ° («−5 °C»). Редкий символ вне набора браузер возьмёт из системного шрифта;
// ⋮ и → нет в самих шрифтах, они всегда из системного.
// Literata — только с осью веса: ось оптического размера (opsz) удваивает вес файлов, а на мобильной сети
// это лишние полсекунды до первой отрисовки (Lighthouse, 29.10.2026).
//   node tools/fonts.mjs
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import subsetFont from 'subset-font';

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)).join('');
export const CYR = range(0x0400, 0x045f) + range(0x0490, 0x0491) + '́№';
export const LAT = range(0x20, 0x7e) + ' «»·×©°' + range(0x2010, 0x2014) + range(0x2018, 0x201e) + '…→−';

const jobs = [
  ['literata', 'literata-cyrillic-wght-normal', CYR], ['literata', 'literata-latin-wght-normal', LAT],
  ['literata', 'literata-cyrillic-wght-italic', CYR], ['literata', 'literata-latin-wght-italic', LAT],
  ['golos-text', 'golos-text-cyrillic-wght-normal', CYR], ['golos-text', 'golos-text-latin-wght-normal', LAT],
];
mkdirSync('public/fonts', { recursive: true });
for (const [pkg, name, text] of jobs) {
  const src = `node_modules/@fontsource-variable/${pkg}/files/${name}.woff2`;
  const out = await subsetFont(readFileSync(src), text, { targetFormat: 'woff2' });
  writeFileSync(`public/fonts/${name}.woff2`, out);
  console.log(name, statSync(src).size, '→', out.length);
}
