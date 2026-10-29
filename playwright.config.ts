import { defineConfig } from '@playwright/test';

// Установленный Chrome (локально и на раннерах GitHub он есть): браузер Playwright качать не нужно.
export default defineConfig({
  testDir: 'tests/e2e',
  // --mute-audio: тесты нажимают «Послушать», без него звук идёт в колонки компьютера
  use: { baseURL: 'http://localhost:4321', channel: 'chrome', launchOptions: { args: ['--mute-audio'] } },
  webServer: { command: 'npm run preview -- --port 4321', url: 'http://localhost:4321', reuseExistingServer: true },
});
