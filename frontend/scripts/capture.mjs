import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = 'C:\\Users\\ayuu2\\.gemini\\antigravity-ide\\brain\\0226bee6-7972-4f84-bdd8-b9e1725708c4';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // 1. Employee Dashboard (Default)
  console.log('Capturing Employee Dashboard...');
  await page.screenshot({ path: path.join(outDir, 'employee_dashboard.png'), fullPage: true });

  // 2. Manager Dashboard
  console.log('Switching to Manager...');
  await page.getByLabel('Demo identity').selectOption('manager');
  await page.waitForTimeout(3000);
  console.log('Capturing Manager Dashboard...');
  await page.screenshot({ path: path.join(outDir, 'manager_dashboard.png'), fullPage: true });

  // 3. HR Dashboard
  console.log('Switching to HR...');
  await page.getByLabel('Demo identity').selectOption('hr');
  await page.waitForTimeout(3000);
  console.log('Capturing HR Dashboard...');
  await page.screenshot({ path: path.join(outDir, 'hr_dashboard.png'), fullPage: true });

  await browser.close();
  console.log('All screenshots captured successfully.');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
