import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

const LIVE_URL = 'https://brandlens-zeta.vercel.app';
const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log(`Starting automated screenshots against ${LIVE_URL}`);
  const browser = await chromium.launch({
    headless: true,
  });

  // Helper for desktop context (1440x900)
  async function createDesktopContext() {
    return browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
  }

  // 1. screenshot-login.png: /login (desktop 1440x900)
  console.log('Capturing 1: screenshot-login.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('button:has-text("Creator")');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-login.png'),
    });
    console.log('  ✓ Captured screenshot-login.png');
    await context.close();
  }

  // 2. screenshot-dashboard.png: Creator dashboard (desktop 1440x900)
  console.log('Capturing 2: screenshot-dashboard.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Creator")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.waitForSelector('text=Showcase A: Miracle Serum Campaign (Draft)');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-dashboard.png'),
    });
    console.log('  ✓ Captured screenshot-dashboard.png');
    await context.close();
  }

  // 3. screenshot-findings.png: content item with findings visible (desktop 1440x900)
  console.log('Capturing 3: screenshot-findings.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Creator")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const href = await page.locator('a:has-text("Showcase A: Miracle Serum Campaign (Draft)")').first().getAttribute('href');
    if (href) {
      await page.goto(`${LIVE_URL}${href}`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('text=Margin notes');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-findings.png'),
    });
    console.log('  ✓ Captured screenshot-findings.png');
    await context.close();
  }

  // 4. screenshot-review-queue.png: Manager review queue / blocked approval (desktop 1440x900)
  console.log('Capturing 4: screenshot-review-queue.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Manager")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const href = await page.locator('section[aria-labelledby="review-queue-heading"] a').first().getAttribute('href');
    if (href) {
      await page.goto(`${LIVE_URL}${href}`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('text=Open high-severity findings require Reviewer role');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-review-queue.png'),
    });
    console.log('  ✓ Captured screenshot-review-queue.png');
    await context.close();
  }

  // 5. screenshot-ai-disclosure.png: AI disclosure tab of reviewed item (desktop 1440x900)
  console.log('Capturing 5: screenshot-ai-disclosure.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Creator")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const href = await page.locator('a:has-text("Showcase A: Miracle Serum Campaign (Draft)")').first().getAttribute('href');
    if (href) {
      await page.goto(`${LIVE_URL}${href}`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('button[role="tab"]:has-text("AI disclosure")');
    await page.click('button[role="tab"]:has-text("AI disclosure")');
    await page.waitForTimeout(500);
    // Scroll the AI disclosure section into clean focus
    await page.evaluate(() => {
      const section = document.querySelector('section[aria-label="Review details and audit tabs"]');
      if (section) {
        section.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-ai-disclosure.png'),
    });
    console.log('  ✓ Captured screenshot-ai-disclosure.png');
    await context.close();
  }

  // 6. screenshot-confidential.png: confidential showcase item (desktop 1440x900)
  console.log('Capturing 6: screenshot-confidential.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Creator")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const href = await page.locator('a:has-text("Showcase E: Project Aurora Formulation Brief (Confidential)")').first().getAttribute('href');
    if (href) {
      await page.goto(`${LIVE_URL}${href}`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('text=CONFIDENTIAL CONTENT');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-confidential.png'),
    });
    console.log('  ✓ Captured screenshot-confidential.png');
    await context.close();
  }

  // 7. screenshot-insights.png: /insights as Manager (desktop 1440x900)
  console.log('Capturing 7: screenshot-insights.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Manager")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.goto(`${LIVE_URL}/insights`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=Most frequent findings by rule category');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-insights.png'),
    });
    console.log('  ✓ Captured screenshot-insights.png');
    await context.close();
  }

  // 8. screenshot-library.png: /library approved facts tab (desktop 1440x900)
  console.log('Capturing 8: screenshot-library.png...');
  {
    const context = await createDesktopContext();
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Creator")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await page.goto(`${LIVE_URL}/library`, { waitUntil: 'networkidle' });
    await page.waitForSelector('button[role="tab"]:has-text("APPROVED FACTS")');
    await page.click('button[role="tab"]:has-text("APPROVED FACTS")');
    await page.waitForSelector('text=EXPIRED');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-library.png'),
    });
    console.log('  ✓ Captured screenshot-library.png');
    await context.close();
  }

  // 9. screenshot-mobile.png: findings page (mobile viewport 390x844)
  console.log('Capturing 9: screenshot-mobile.png...');
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${LIVE_URL}/login`, { waitUntil: 'networkidle' });
    await page.click('button:has-text("Creator")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    const href = await page.locator('a:has-text("Showcase A: Miracle Serum Campaign (Draft)")').first().getAttribute('href');
    if (href) {
      await page.goto(`${LIVE_URL}${href}`, { waitUntil: 'networkidle' });
    }
    await page.waitForSelector('text=Margin notes');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'screenshot-mobile.png'),
    });
    console.log('  ✓ Captured screenshot-mobile.png');
    await context.close();
  }

  await browser.close();
  console.log('All screenshots captured successfully.');
}

main().catch((err) => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
