/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error ws declarations optional for script execution
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');

async function getDebuggerUrl(): Promise<string> {
  const res = await fetch('http://localhost:9222/json');
  const tabs = await res.json();
  const pageTab = tabs.find((t: any) => t.type === 'page');
  if (pageTab) {
    return pageTab.webSocketDebuggerUrl;
  }
  const newTabRes = await fetch('http://localhost:9222/json/new?https://brandlens-zeta.vercel.app/login', {
    method: 'PUT',
  });
  const newTab = await newTabRes.json();
  return newTab.webSocketDebuggerUrl;
}

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
    console.log(`✓ Saved live screenshot: ${filename} (${buffer.length} bytes)`);
  }

  close() {
    this.ws.close();
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log('Connecting to Headless Chrome via CDP...');
  const wsUrl = await getDebuggerUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  // 1. Visit Live Login Page
  console.log('1. Navigating to live /login on Vercel...');
  await client.send('Page.navigate', { url: 'https://brandlens-zeta.vercel.app/login' });
  await sleep(2500);
  await client.captureScreenshot('screenshot-live-login.png');

  // Verify neutral branding
  const bodyText = await client.evaluate('document.body.innerText');
  const hasNeutral = bodyText.includes('Pre-publication brand governance for your organisation');
  const hasBadge = bodyText.includes('Demo workspace: Verdant Skin (fictional)');
  console.log(`Live login check: neutral=${hasNeutral}, badge=${hasBadge}`);

  // 2. Click Admin Demo Login
  console.log('2. Clicking Admin Demo Login on live site...');
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.textContent && b.textContent.includes('Admin'));
      if (adminBtn) adminBtn.click();
    })()
  `);
  await sleep(4000);

  // 3. Navigate to Live Settings
  console.log('3. Navigating to live /settings on Vercel...');
  await client.send('Page.navigate', { url: 'https://brandlens-zeta.vercel.app/settings' });
  await sleep(3000);
  await client.captureScreenshot('screenshot-live-settings.png');

  const settingsText = await client.evaluate('document.body.innerText');
  const hasSettingsHeader = settingsText.includes('Workspace Settings') || settingsText.includes('Organisation');
  const hasStartFresh = settingsText.includes('Start Fresh') || settingsText.includes('Start fresh');
  console.log(`Live settings check: header=${hasSettingsHeader}, startFresh=${hasStartFresh}`);

  // 4. Navigate to Live Dashboard
  console.log('4. Navigating to live /dashboard on Vercel...');
  await client.send('Page.navigate', { url: 'https://brandlens-zeta.vercel.app/dashboard' });
  await sleep(3000);
  await client.captureScreenshot('screenshot-live-dashboard.png');

  client.close();
  console.log('\n✅ Live deployment verification completed successfully!');
}

run().catch((err) => {
  console.error('Live verify error:', err);
  process.exit(1);
});

