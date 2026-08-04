import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'landing');
const BASE_URL = process.env.LANDING_CAPTURE_URL ?? 'http://localhost:5173';

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/landing-demo/home`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.goto(`${BASE_URL}/landing-demo/editor/demo-planner`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.goto(`${BASE_URL}/landing-demo/editor/demo-planner?generator=open`, {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(2500);

  await page.goto(`${BASE_URL}/landing-demo/editor/demo-planner`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const video = page.video();
  await page.close();
  await context.close();

  if (video) {
    await video.saveAs(path.join(OUT_DIR, 'demo.webm'));
    console.log('Saved demo.webm');
  }

  await browser.close();
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
