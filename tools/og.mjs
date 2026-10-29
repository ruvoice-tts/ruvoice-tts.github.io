// Снимок /og/ собранного сайта в public/img/og.png (1200×630) — картинка превью ссылки, например в Telegram.
//   npm run build && node tools/og.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const server = spawn('npx', ['astro', 'preview', '--port', '4398'], { stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch('http://localhost:4398/og/')).ok) break; } catch { /* ещё не поднялся */ }
    await new Promise(r => setTimeout(r, 500));
  }
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('http://localhost:4398/og/');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'public/img/og.png' });
  await browser.close();
  console.log('public/img/og.png');
} finally {
  server.kill();
}
