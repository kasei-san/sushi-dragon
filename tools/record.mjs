import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const W = 1280, H = 720, FPS = 24, SECONDS = 30, SPEED = 1.5, SUB = 3;
// 使い方: npm i puppeteer-core してから node tools/record.mjs <出力フレームdir> <URL>
const OUT = process.argv[2];
const url = process.argv[3];
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${W},${H}`],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.__advance === 'function', { timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const total = FPS * SECONDS;
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate((dt, sub) => window.__advance(dt, sub), (SPEED / FPS), SUB);
  await page.screenshot({ path: `${OUT}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
  if (i % 24 === 0) console.log(`frame ${i}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
await browser.close();
console.log('DONE');
