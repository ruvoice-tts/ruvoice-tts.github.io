import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ruvoice-tts.github.io',
  // весь CSS прямо в странице: три отдельных файла стоили по запросу до первой отрисовки на мобильной сети
  build: { inlineStylesheets: 'always' },
});
