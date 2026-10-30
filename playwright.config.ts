import { defineConfig } from '@playwright/test';

// Установленный Chrome (локально и на раннерах GitHub он есть): браузер Playwright качать не нужно.
export default defineConfig({
  testDir: 'tests/e2e',
  // --mute-audio: тесты нажимают «Послушать», без него звук идёт в колонки компьютера.
  // Счётчик GoatCounter в тестах не грузится: деплой не зависит от его CDN, а тест подбора подставляет свой.
  use: {
    baseURL: 'http://localhost:4321', channel: 'chrome',
    launchOptions: { args: ['--mute-audio', '--host-resolver-rules=MAP gc.zgo.at ~NOTFOUND'] },
  },
  webServer: { command: 'npm run preview -- --port 4321', url: 'http://localhost:4321', reuseExistingServer: true },
});
