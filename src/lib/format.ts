// Числа и даты так, как их увидит человек на телефоне.
const NBSP = ' ';
const TZ = 'Europe/Moscow';
const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: TZ });
const yearOf = (d: Date) => Number(new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: TZ }).format(d));

/** Десятичные мегабайты, как в загрузках Android: 243 623 400 байт → «244 МБ». */
export function formatMB(bytes: number): string {
  return `${Math.round(bytes / 1e6)}${NBSP}МБ`;
}

/** «21 октября», год — только если не текущий. */
export function formatDateRu(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const base = dayMonth.format(d);
  return yearOf(d) === yearOf(now) ? base : `${base} ${yearOf(d)}`;
}

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
