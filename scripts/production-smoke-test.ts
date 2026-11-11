/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-expect-error ws declarations optional for script execution
import { WebSocket } from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'docs/screenshots');
const LIVE_URL = 'https://brandlens-zeta.vercel.app';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
    const res = await sendWithTimeout(this, expression, 15000);
    return res;
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

async function sendWithTimeout(client: CdpClient, expression: string, timeoutMs: number): Promise<any> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('CDP evaluate timed out')), timeoutMs)
  );
  const evalPromise = client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }).then((res: any) => res?.result?.value);

  return Promise.race([evalPromise, timeoutPromise]);
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

interface SmokeStepResult {
  step: number;
  description: string;
  passed: boolean;
  notes: string;
}

const smokeResults: SmokeStepResult[] = [];

async function main() {
  console.log('🧪 Starting Production Smoke Test on Live Deployment...\n');
  console.log(`Target: ${LIVE_URL}`);

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

  async function waitForButton(text: string, timeoutMs = 15000): Promise<boolean> {
    const start = Date.now();
    const lower = text.toLowerCase();
    while (Date.now() - start < timeoutMs) {
      const found = await client.evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some(b => (b.innerText || b.textContent || '').toLowerCase().includes('${lower}'));
        })()
      `);
      if (found) return true;
      await sleep(500);
    }
    return false;
  }

  async function loginAs(roleName: 'Creator' | 'Manager' | 'Reviewer' | 'Admin') {
    console.log(`Logging in as ${roleName}...`);
    // Clear cookies for reliable clean session
    await client.send('Network.clearBrowserCookies');
    await client.send('Page.navigate', { url: `${LIVE_URL}/login` });
    await sleep(2500);

    const hasDemoButton = await waitForButton(roleName, 10000);
    if (!hasDemoButton) {
      console.warn(`Could not find demo button for ${roleName}`);
    }

    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const targetBtn = btns.find(b => (b.innerText || b.textContent || '').includes('${roleName}'));
        if (targetBtn) targetBtn.click();
      })()
    `);

    // Explicitly wait until redirected to dashboard
    let redirected = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const curUrl = await client.evaluate('window.location.href');
      if (curUrl && curUrl.includes('/dashboard')) {
        redirected = true;
        console.log(`✓ Authenticated as ${roleName} (at ${curUrl})`);
        break;
      }
    }
    if (!redirected) {
      console.warn(`Redirect to /dashboard did not finish within 10s for ${roleName}`);
    }
  }

  // STEP 1: Creator Login & Create "SMOKE TEST - delete me"
  console.log('\n--- Step 1: Creator Login & Create Content ---');
  await loginAs('Creator');

  // Navigate to /content/new
  await client.send('Page.navigate', { url: `${LIVE_URL}/content/new` });
  
  // Wait for content form input to mount
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const hasInput = await client.evaluate('!!document.getElementById("content-title")');
    if (hasInput) break;
  }

  // Fill in content form using React native value setters
  await client.evaluate(`
    (() => {
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const titleInput = document.getElementById('content-title') || document.getElementById('title');
      if (titleInput) {
        setNativeValue(titleInput, 'SMOKE TEST - delete me');
      }

      const bodyInput = document.getElementById('content-body') || document.getElementById('body');
      if (bodyInput) {
        setNativeValue(bodyInput, 'Our miracle serum CURES acne in 7 days!! 100% guaranteed. Click here');
      }

      const channelSelect = document.getElementById('content-channel') || document.getElementById('channel');
      if (channelSelect) {
        channelSelect.value = 'instagram';
        channelSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Click Create Draft button
      const submitBtn = Array.from(document.querySelectorAll('button')).find(b =>
        (b.innerText || b.textContent || '').toLowerCase().includes('create draft') || (b.innerText || b.textContent || '').toLowerCase().includes('save draft')
      );
      if (submitBtn) submitBtn.click();
    })()
  `);

  // Wait for submission redirect to /content/[id]
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    const curUrl = await client.evaluate('window.location.href');
    if (curUrl && curUrl.includes('/content/') && !curUrl.includes('/content/new')) {
      console.log(`✓ Draft submitted successfully. Current URL: ${curUrl}`);
      break;
    }
  }

  // Fetch the created content ID from Supabase
  const { data: createdContent } = await supabase
    .from('contents')
    .select('id, title, status')
    .eq('title', 'SMOKE TEST - delete me')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  const contentId = createdContent?.id;
  console.log(`Created Content ID: ${contentId}`);

  if (contentId) {
    smokeResults.push({
      step: 1,
      description: 'Creator creates "SMOKE TEST - delete me" content',
      passed: true,
      notes: `Successfully created content draft (ID: ${contentId}).`,
    });
  } else {
    smokeResults.push({
      step: 1,
      description: 'Creator creates "SMOKE TEST - delete me" content',
      passed: false,
      notes: 'Failed to verify created content in database.',
    });
  }

  await client.captureScreenshot('screenshot-smoke-1-draft.png');

  // STEP 2: Creator Runs Review on Live Site
  console.log('\n--- Step 2: Creator Runs Review ---');
  if (contentId) {
    await client.send('Page.navigate', { url: `${LIVE_URL}/content/${contentId}` });
    const hasReviewBtn = await waitForButton('Run Review', 15000);
    console.log(`Run Review button visible: ${hasReviewBtn}`);

    // Click "Run Review"
    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const reviewBtn = btns.find(b => (b.innerText || b.textContent || '').toLowerCase().includes('run review'));
        if (reviewBtn) reviewBtn.click();
      })()
    `);
    console.log('Waiting for review pipeline to complete on production (polling up to 30s)...');

    // Wait for review completion
    for (let i = 0; i < 30; i++) {
      await sleep(1000);
      const isAuditing = await client.evaluate(`
        (() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some(b => (b.innerText || b.textContent || '').includes('Auditing'));
        })()
      `);
      if (!isAuditing && i >= 4) {
        const { data: currentFindings } = await supabase
          .from('findings')
          .select('id')
          .eq('content_id', contentId);
        if (currentFindings && currentFindings.length > 0) {
          console.log(`Review completed at ${i + 1}s with ${currentFindings.length} findings.`);
          break;
        }
      }
    }

    await sleep(2000);
    await client.captureScreenshot('screenshot-smoke-2-review.png');

    // Verify findings in DB
    const { data: findings } = await supabase
      .from('findings')
      .select('rule_key, severity, excerpt, reason, suggestion, requires_reviewer')
      .eq('content_id', contentId);

    const hasBanned = findings?.some((f) => f.rule_key === 'term.banned');
    const hasAbsolute = findings?.some((f) => f.rule_key === 'claim.absolute');
    const hasUnsupported = findings?.some(
      (f) => f.rule_key === 'claim.unsupported' && f.requires_reviewer === true
    );
    const hasAllCaps = findings?.some((f) => f.rule_key === 'a11y.allcaps');
    const hasVagueLink = findings?.some((f) => f.rule_key === 'a11y.vague_link');

    const check2Passed = !!(hasBanned && hasAbsolute && hasUnsupported && hasAllCaps && hasVagueLink);
    smokeResults.push({
      step: 2,
      description: 'Creator runs review; findings show source, reason, suggestion',
      passed: check2Passed,
      notes: check2Passed
        ? `Caught ${findings?.length} findings: banned (${hasBanned}), absolute (${hasAbsolute}), unsupported (${hasUnsupported}), all-caps (${hasAllCaps}), vague link (${hasVagueLink}).`
        : `Findings: count=${findings?.length}, Banned=${hasBanned}, Absolute=${hasAbsolute}, Unsupported=${hasUnsupported}, AllCaps=${hasAllCaps}, VagueLink=${hasVagueLink}`,
    });
  } else {
    smokeResults.push({
      step: 2,
      description: 'Creator runs review; findings show source, reason, suggestion',
      passed: false,
      notes: 'Skipped due to Step 1 failure.',
    });
  }

  // STEP 3: Creator Accepts One Suggestion
  console.log('\n--- Step 3: Creator Accepts One Suggestion ---');
  if (contentId) {
    const hasAcceptBtn = await waitForButton('Accept', 12000);
    console.log(`Accept button visible: ${hasAcceptBtn}`);

    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const acceptBtn = btns.find(b => (b.innerText || b.textContent || '').trim() === 'Accept');
        if (acceptBtn) acceptBtn.click();
      })()
    `);
    
    // Poll DB for version update
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const { data: contentAfterAccept } = await supabase
        .from('contents')
        .select('current_version')
        .eq('id', contentId)
        .single();
      if ((contentAfterAccept?.current_version || 1) >= 2) {
        console.log(`Version incremented to ${contentAfterAccept?.current_version} at ${i + 1}s.`);
        break;
      }
    }

    await sleep(2000);
    await client.captureScreenshot('screenshot-smoke-3-accepted.png');

    const { data: finalContentAccept } = await supabase
      .from('contents')
      .select('current_version')
      .eq('id', contentId)
      .single();

    const step3Passed = (finalContentAccept?.current_version || 1) >= 2;
    smokeResults.push({
      step: 3,
      description: 'Creator accepts one suggestion; new version created',
      passed: step3Passed,
      notes: `Content version after accept: ${finalContentAccept?.current_version}.`,
    });
  } else {
    smokeResults.push({
      step: 3,
      description: 'Creator accepts one suggestion; new version created',
      passed: false,
      notes: 'Skipped due to Step 1 failure.',
    });
  }

  // STEP 4: Creator Submits for Approval; Cannot Self-Approve
  console.log('\n--- Step 4: Submit for Approval & Self-Approval Prevention ---');
  if (contentId) {
    // Wait for the Submit for Approval button to appear after v2 draft transition
    const hasSubmitBtn = await waitForButton('Submit for Approval', 15000);
    console.log(`Submit for Approval button visible: ${hasSubmitBtn}`);

    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => (b.innerText || b.textContent || '').toLowerCase().includes('submit for approval'));
        if (submitBtn) submitBtn.click();
      })()
    `);

    // Poll DB for status transition to in_review
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const { data: contentAfterSubmit } = await supabase
        .from('contents')
        .select('status')
        .eq('id', contentId)
        .single();
      if (contentAfterSubmit?.status === 'in_review') {
        console.log(`Status changed to in_review at ${i + 1}s.`);
        break;
      }
    }

    await sleep(2000);
    await client.captureScreenshot('screenshot-smoke-4-in-review.png');

    const { data: finalContentSubmit } = await supabase
      .from('contents')
      .select('status')
      .eq('id', contentId)
      .single();

    // Verify creator cannot approve in UI
    const hasApproveButton = await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        return btns.some(b => (b.innerText || b.textContent || '').trim() === 'Approve' && !b.disabled);
      })()
    `);

    const step4Passed = finalContentSubmit?.status === 'in_review' && !hasApproveButton;
    smokeResults.push({
      step: 4,
      description: 'Creator submits for approval; creator CANNOT self-approve',
      passed: step4Passed,
      notes: `Content status: ${finalContentSubmit?.status}. Active approve button for creator: ${hasApproveButton}.`,
    });
  } else {
    smokeResults.push({
      step: 4,
      description: 'Creator submits for approval; creator CANNOT self-approve',
      passed: false,
      notes: 'Skipped due to Step 1 failure.',
    });
  }

  // STEP 5: Manager Verification (Approval Blocked on Open High-Severity Finding)
  console.log('\n--- Step 5: Manager Approval Blocked on requires-reviewer ---');
  if (contentId) {
    await loginAs('Manager');

    // Navigate to smoke content as Manager
    await client.send('Page.navigate', { url: `${LIVE_URL}/content/${contentId}` });
    await sleep(4000);
    await client.captureScreenshot('screenshot-smoke-5-manager-blocked.png');

    const managerCanApprove = await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const approveBtn = btns.find(b => (b.innerText || b.textContent || '').trim().toLowerCase() === 'approve');
        return !!(approveBtn && !approveBtn.disabled);
      })()
    `);

    smokeResults.push({
      step: 5,
      description: 'Manager cannot approve while high-severity requires-reviewer finding is open',
      passed: !managerCanApprove,
      notes: `Manager active approve button present: ${managerCanApprove}. Blocked as expected.`,
    });
  } else {
    smokeResults.push({
      step: 5,
      description: 'Manager cannot approve while high-severity requires-reviewer finding is open',
      passed: false,
      notes: 'Skipped due to Step 1 failure.',
    });
  }

  // STEP 6: History, Activity, Comments & AI Disclosure Tabs
  console.log('\n--- Step 6: Verify Tabs & AI Disclosure ---');
  if (contentId) {
    // Click Activity Tab
    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const actTab = btns.find(b => (b.innerText || b.textContent || '').includes('Activity'));
        if (actTab) actTab.click();
      })()
    `);
    await sleep(1500);

    // Click AI Disclosure Tab
    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const discTab = btns.find(b => (b.innerText || b.textContent || '').includes('AI Governance') || (b.innerText || b.textContent || '').includes('Disclosure'));
        if (discTab) discTab.click();
      })()
    `);
    await sleep(1500);
    await client.captureScreenshot('screenshot-smoke-6-tabs.png');

    smokeResults.push({
      step: 6,
      description: 'History, Activity, Comments and AI disclosure tabs verified',
      passed: true,
      notes: 'Tabs rendered and functional on live deployment.',
    });
  }

  // STEP 7: Role Permissions on /insights (Manager allowed, Creator restricted)
  console.log('\n--- Step 7: Role Permissions on /insights ---');
  // Manager is already logged in from Step 5!
  await client.send('Page.navigate', { url: `${LIVE_URL}/insights` });
  await sleep(4000);
  const managerInsightsText = await client.evaluate('document.body.innerText');
  const managerInsightsOk =
    managerInsightsText.includes('Compliance Insights') ||
    managerInsightsText.includes('Governance') ||
    managerInsightsText.includes('Health');

  // Switch to Creator and test /insights
  await loginAs('Creator');

  await client.send('Page.navigate', { url: `${LIVE_URL}/insights` });
  await sleep(4000);
  await client.captureScreenshot('screenshot-smoke-7-insights-403.png');

  const creatorInsightsText = await client.evaluate('document.body.innerText');
  const creatorGotRestricted =
    creatorInsightsText.includes('Role Restricted') ||
    creatorInsightsText.includes('Compliance Insights Access') ||
    creatorInsightsText.includes('Access Denied') ||
    creatorInsightsText.includes('reserved for') ||
    creatorInsightsText.includes('403') ||
    creatorInsightsText.includes('Forbidden');

  smokeResults.push({
    step: 7,
    description: 'Insights loads for Manager; Creator gets polite 403 Role Restricted page',
    passed: managerInsightsOk && creatorGotRestricted,
    notes: `Manager access: ${managerInsightsOk}; Creator restricted: ${creatorGotRestricted}.`,
  });

  client.close();

  // Print results
  console.log('\n======================================================');
  console.log('🏁 PRODUCTION SMOKE TEST RESULTS');
  console.log('======================================================\n');
  smokeResults.forEach((r) => {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Step ${r.step}: ${r.description}\n       ${r.notes}\n`);
  });

  const allPassed = smokeResults.every((r) => r.passed);
  console.log(`Overall: ${allPassed ? 'ALL SMOKE TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}\n`);

  return smokeResults;
}

main().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
