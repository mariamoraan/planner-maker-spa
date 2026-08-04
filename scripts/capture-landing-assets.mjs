import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'landing');
const BASE_URL = process.env.LANDING_CAPTURE_URL ?? 'http://localhost:5173';

async function waitForApp(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
}

async function getEditorSelector(page) {
  return (await page.locator('.editor-board').count()) > 0 ? '.editor-board' : '.template-editor';
}

async function captureScreenshot(page, fileName, selector) {
  const target = selector ? page.locator(selector).first() : page;
  await target.screenshot({
    path: path.join(OUT_DIR, fileName),
    type: 'webp',
    quality: 82,
  });
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  page.on('pageerror', error => console.error('Page error:', error.message));

  console.log('Capturing dashboard…');
  await page.goto(`${BASE_URL}/landing-demo/home`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.waitForSelector('.home-page__workspace', { timeout: 60000 });
  await captureScreenshot(page, 'step-upload.webp', '.home-page__workspace');

  console.log('Capturing editor with zones…');
  await page.goto(`${BASE_URL}/landing-demo/editor/demo-planner`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.waitForSelector('.editor-board, .template-editor', { timeout: 60000 });
  await page.waitForTimeout(2500);
  let editorSelector = await getEditorSelector(page);
  await captureScreenshot(page, 'step-zones.webp', editorSelector);
  await captureScreenshot(page, 'hero-editor.webp', editorSelector);

  console.log('Capturing generator dialog…');
  await page.goto(`${BASE_URL}/landing-demo/editor/demo-planner?generator=open`, {
    waitUntil: 'networkidle',
  });
  await waitForApp(page);
  await page.waitForSelector('.editor-board, .template-editor', { timeout: 60000 });
  await page.waitForTimeout(1500);
  editorSelector = await getEditorSelector(page);
  await captureScreenshot(page, 'step-range.webp', editorSelector);

  console.log('Capturing pages map…');
  await page.goto(`${BASE_URL}/landing-demo/editor/demo-planner`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.waitForSelector('.editor-board, .template-editor', { timeout: 60000 });
  await page.waitForTimeout(1500);
  editorSelector = await getEditorSelector(page);
  await captureScreenshot(page, 'step-generate.webp', editorSelector);

  console.log('Capturing OG image from landing hero…');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await waitForApp(page);
  await page.waitForSelector('.landing-page__hero', { timeout: 60000 });
  await page.locator('.landing-page__hero').screenshot({
    path: path.join(OUT_DIR, 'og-image.webp'),
    type: 'webp',
    quality: 82,
  });

  await browser.close();
  console.log('Screenshots saved to public/landing/');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
