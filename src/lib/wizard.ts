// Подбор сборки за три вопроса. Чистая функция: проверяется тестами и считается прямо в браузере.
import { formatMB } from './format';

export type Lang = 'ru' | 'be' | 'uk';
export interface Answers { source: 'rustore' | 'file'; langs: Lang[]; smallUpdates: boolean }
export interface Recommendation { build: 'full' | 'lite' | 'rustore'; packs: string[]; note: string }

export function recommend(a: Answers, packs: { id: string; lang: Lang; size: number }[],
  sizes: { full: number; lite?: number }): Recommendation {
  // паки языков, кроме русского, которые выложены; язык без пака просто не учитывается
  const other = a.langs.filter(l => l !== 'ru' && packs.some(p => p.lang === l));
  const extra = packs.filter(p => other.includes(p.lang)).map(p => p.id);
  if (a.source === 'rustore') {
    return { build: 'rustore', packs: extra, note: 'Обновления приходят сами, обычно на неделю позже, чем на GitHub. Паки голосов ставятся файлом.' };
  }
  const russian = a.langs.includes('ru') || !other.length;
  if (!russian && sizes.lite) {
    return { build: 'lite', packs: extra, note: 'Русские голоса не нужны: лёгкая сборка и пак нужного языка.' };
  }
  if (a.smallUpdates && sizes.lite && packs.some(p => p.id === 'ru_voices')) {
    return {
      build: 'lite', packs: ['ru_voices', ...extra],
      note: `Лёгкая сборка и пак вместе весят как полная, зато каждое обновление примерно на ${formatMB(sizes.full - sizes.lite)} меньше.`,
    };
  }
  return { build: 'full', packs: extra, note: 'Голоса уже внутри, работает сразу после установки.' };
}
