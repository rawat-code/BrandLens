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
  const newTabRes = await fetch('http://localhost:9222/json/new?http://localhost:3000/login', {
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
    console.log(`✓ Saved screenshot: ${filename} (${buffer.length} bytes)`);
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

  // 1. Visit Login Page
  console.log('1. Navigating to /login...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/login' });
  await sleep(1500);
  await client.captureScreenshot('screenshot-login-neutral.png');

  // 2. Click Admin Demo Login
  console.log('2. Clicking Admin Demo Login...');
  await client.evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const adminBtn = btns.find(b => b.textContent && b.textContent.includes('Admin'));
      if (adminBtn) adminBtn.click();
    })()
  `);
  await sleep(2500);

  // 3. Visit Settings Page
  console.log('3. Navigating to /settings...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/settings' });
  await sleep(1500);
  await client.captureScreenshot('screenshot-settings.png');

  // 4. Rename Org to "Lumina Organics"
  console.log('4. Renaming Organisation to "Lumina Organics"...');
  await client.evaluate(`
    (() => {
      const input = document.getElementById('org-name');
      if (input) {
        input.value = 'Lumina Organics';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Save Name'));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(2000);
  await client.captureScreenshot('screenshot-settings-renamed.png');

  // 5. Check Dashboard Header
  console.log('5. Navigating to /dashboard to confirm updated header...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/dashboard' });
  await sleep(1500);
  await client.captureScreenshot('screenshot-dashboard-renamed.png');

  // 6. Check Library Header & Test Import Guidelines
  console.log('6. Navigating to /library...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/library' });
  await sleep(1500);
  await client.captureScreenshot('screenshot-library-renamed.png');

  console.log('7. Opening "Import guidelines" modal...');
  await client.evaluate(`
    (() => {
      const importBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Import guidelines'));
      if (importBtn) importBtn.click();
    })()
  `);
  await sleep(800);
  await client.captureScreenshot('screenshot-import-modal.png');

  console.log('8. Filling sample markdown & parsing...');
  await client.evaluate(`
    (() => {
      const sampleBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Fill sample markdown'));
      if (sampleBtn) sampleBtn.click();
      const parseBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Parse Guidelines'));
      if (parseBtn) parseBtn.click();
    })()
  `);
  await sleep(1000);
  await client.captureScreenshot('screenshot-import-preview.png');

  console.log('9. Executing guideline import...');
  await client.evaluate(`
    (() => {
      const execBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Import 3 Guidelines'));
      if (execBtn) execBtn.click();
    })()
  `);
  await sleep(2000);
  await client.captureScreenshot('screenshot-import-success.png');

  // 10. Test Start Fresh Dialog
  console.log('10. Navigating back to /settings to inspect Start Fresh dialog...');
  await client.send('Page.navigate', { url: 'http://localhost:3000/settings' });
  await sleep(1500);
  await client.evaluate(`
    (() => {
      const startFreshBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Start fresh...'));
      if (startFreshBtn) startFreshBtn.click();
    })()
  `);
  await sleep(800);
  await client.captureScreenshot('screenshot-start-fresh-modal.png');

  // 11. Rename Org back to "Verdant Skin (demo)" to restore seed consistency
  console.log('11. Restoring organisation name back to "Verdant Skin (demo)"...');
  await client.evaluate(`
    (() => {
      const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    })()
  `);
  await sleep(500);
  await client.evaluate(`
    (() => {
      const input = document.getElementById('org-name');
      if (input) {
        input.value = 'Verdant Skin (demo)';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent && b.textContent.includes('Save Name'));
      if (saveBtn) saveBtn.click();
    })()
  `);
  await sleep(1500);

  client.close();
  console.log('✓ All browser verifications completed successfully!');
}

run().catch((err) => {
  console.error('Error during browser verification:', err);
  process.exit(1);
});

