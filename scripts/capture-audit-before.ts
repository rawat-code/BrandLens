/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error ws declarations optional for script execution
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/design/before');
const LIVE_URL = 'https://brandlens-zeta.vercel.app';
const SHOWCASE_A_ID = '3dae8a07-ab4f-4364-ad44-d2e993ec7f89';

class CdpClient {
  private ws: WebSocket;
  private id = 0;
  private callbacks = new Map<number, (res: any) => void>();

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (data: string) => {
        const msg = JSON.parse(data.toString());
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id)!;
          this.callbacks.delete(msg.id);
          cb(msg.result);
        }
      });
    });
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = ++this.id;
    return new Promise((resolve) => {
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression: string): Promise<any> {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res?.result?.value;
  }

  async captureScreenshot(filename: string): Promise<void> {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const filePath = path.join(SCREENSHOT_DIR, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`✓ Saved before screenshot: ${filename} (${buffer.length} bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDebuggerUrl(): Promise<string> {
  const res = await fetch('http://localhost:9222/json');
  const tabs = await res.json();
  const pageTab = tabs.find((t: any) => t.type === 'page');
  if (pageTab) {
    return pageTab.webSocketDebuggerUrl;
  }
  const newTabRes = await fetch(`http://localhost:9222/json/new?${LIVE_URL}/login`, {
    method: 'PUT',
  });
  const newTab = await newTabRes.json();
  return newTab.webSocketDebuggerUrl;
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('📸 Capturing Stage A Before Screenshots across all routes...\n');
  const wsUrl = await getDebuggerUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  async function loginAs(roleName: 'Creator' | 'Manager' | 'Reviewer' | 'Admin') {
    await client.send('Network.clearBrowserCookies');
    await client.send('Page.navigate', { url: `${LIVE_URL}/login` });
    await sleep(2500);

    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const targetBtn = btns.find(b => (b.innerText || b.textContent || '').includes('${roleName}'));
        if (targetBtn) targetBtn.click();
      })()
    `);

    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const curUrl = await client.evaluate('window.location.href');
      if (curUrl && curUrl.includes('/dashboard')) break;
    }
    await sleep(2000);
  }

  // 1. Login Page
  console.log('1. Capturing login.png...');
  await client.send('Network.clearBrowserCookies');
  await client.send('Page.navigate', { url: `${LIVE_URL}/login` });
  await sleep(3000);
  await client.captureScreenshot('login.png');

  // 2. Dashboard Creator
  console.log('2. Capturing dashboard-creator.png...');
  await loginAs('Creator');
  await client.captureScreenshot('dashboard-creator.png');

  // 3. New Content Page
  console.log('3. Capturing content-new.png...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/content/new` });
  await sleep(3000);
  await client.captureScreenshot('content-new.png');

  // 4. Content Detail (Showcase A)
  console.log('4. Capturing content-detail.png...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/content/${SHOWCASE_A_ID}` });
  await sleep(4000);
  await client.captureScreenshot('content-detail.png');

  // 5. Content Detail Tabs (Comments, History, Activity, AI Disclosure)
  console.log('5. Capturing content detail tabs...');
  // Comments tab
  await client.evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const t = tabs.find(b => (b.innerText || '').includes('Comments'));
      if (t) (t as HTMLElement).click();
    })()
  `);
  await sleep(1500);
  await client.captureScreenshot('content-detail-comments.png');

  // History tab
  await client.evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const t = tabs.find(b => (b.innerText || '').includes('History'));
      if (t) (t as HTMLElement).click();
    })()
  `);
  await sleep(1500);
  await client.captureScreenshot('content-detail-history.png');

  // Activity tab
  await client.evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const t = tabs.find(b => (b.innerText || '').includes('Activity'));
      if (t) (t as HTMLElement).click();
    })()
  `);
  await sleep(1500);
  await client.captureScreenshot('content-detail-activity.png');

  // AI Disclosure tab
  await client.evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const t = tabs.find(b => (b.innerText || '').includes('AI') || (b.innerText || '').includes('Disclosure'));
      if (t) (t as HTMLElement).click();
    })()
  `);
  await sleep(1500);
  await client.captureScreenshot('content-detail-disclosure.png');

  // 6. Dashboard Manager
  console.log('6. Capturing dashboard-manager.png...');
  await loginAs('Manager');
  await client.captureScreenshot('dashboard-manager.png');

  // 7. Insights Page (Manager)
  console.log('7. Capturing insights.png...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/insights` });
  await sleep(3500);
  await client.captureScreenshot('insights.png');

  // 8. Dashboard Reviewer
  console.log('8. Capturing dashboard-reviewer.png...');
  await loginAs('Reviewer');
  await client.captureScreenshot('dashboard-reviewer.png');

  // 9. Dashboard Admin
  console.log('9. Capturing dashboard-admin.png...');
  await loginAs('Admin');
  await client.captureScreenshot('dashboard-admin.png');

  // 10. Library Tabs (Guidelines, Facts, Terms)
  console.log('10. Capturing library tabs...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/library` });
  await sleep(3000);
  await client.captureScreenshot('library-guidelines.png');

  // Facts Tab
  await client.evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const t = tabs.find(b => (b.innerText || '').includes('Facts'));
      if (t) (t as HTMLElement).click();
    })()
  `);
  await sleep(2000);
  await client.captureScreenshot('library-facts.png');

  // Terms Tab
  await client.evaluate(`
    (() => {
      const tabs = Array.from(document.querySelectorAll('button, [role="tab"]'));
      const t = tabs.find(b => (b.innerText || '').includes('Terms') || (b.innerText || '').includes('Terminology'));
      if (t) (t as HTMLElement).click();
    })()
  `);
  await sleep(2000);
  await client.captureScreenshot('library-terms.png');

  // 11. Settings Page (Admin)
  console.log('11. Capturing settings.png...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/settings` });
  await sleep(3000);
  await client.captureScreenshot('settings.png');

  // 12. About Page
  console.log('12. Capturing about.png...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/about` });
  await sleep(3000);
  await client.captureScreenshot('about.png');

  // 13. Forbidden 403 Page (Creator visits /insights)
  console.log('13. Capturing forbidden-403.png...');
  await loginAs('Creator');
  await client.send('Page.navigate', { url: `${LIVE_URL}/insights` });
  await sleep(3000);
  await client.captureScreenshot('forbidden-403.png');

  // 14. Not Found 404 Page
  console.log('14. Capturing not-found-404.png...');
  await client.send('Page.navigate', { url: `${LIVE_URL}/nonexistent-page-404` });
  await sleep(2500);
  await client.captureScreenshot('not-found-404.png');

  client.close();
  console.log('\n✅ All Stage A Before Screenshots captured successfully!');
}

main().catch((err) => {
  console.error('Audit capture error:', err);
  process.exit(1);
});

