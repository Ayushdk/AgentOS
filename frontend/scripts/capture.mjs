import { chromium } from '@playwright/test';
import path from 'node:path';

const outDir = 'C:\\Users\\ayuu2\\.gemini\\antigravity-ide\\brain\\0226bee6-7972-4f84-bdd8-b9e1725708c4';

async function capture() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // 1. Employee Dashboard
  console.log('Capturing Employee Dashboard...');
  await page.screenshot({ path: path.join(outDir, 'employee_dashboard.png'), fullPage: true });

  // 2. Employee Calendar View
  console.log('Navigating to Calendar...');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('Capturing Calendar View...');
  await page.screenshot({ path: path.join(outDir, 'calendar_view.png'), fullPage: true });

  // 3. Policy Explorer View
  console.log('Navigating to Policy Explorer...');
  await page.getByRole('button', { name: 'Policy Explorer', exact: true }).click();
  await page.waitForTimeout(1500);
  console.log('Capturing Policy Explorer...');
  await page.screenshot({ path: path.join(outDir, 'policy_explorer.png'), fullPage: true });

  // 4. Manager Dashboard
  console.log('Switching to Manager...');
  await page.getByLabel('Demo identity').selectOption('manager');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Overview' }).click();
  await page.waitForTimeout(1500);
  console.log('Capturing Manager Dashboard...');
  await page.screenshot({ path: path.join(outDir, 'manager_dashboard.png'), fullPage: true });

  // 5. HR Dashboard
  console.log('Switching to HR...');
  await page.getByLabel('Demo identity').selectOption('hr');
  await page.waitForTimeout(2000);
  await page.getByRole('button', { name: 'Overview' }).click();
  await page.waitForTimeout(1500);
  console.log('Capturing HR Dashboard...');
  await page.screenshot({ path: path.join(outDir, 'hr_dashboard.png'), fullPage: true });

  await browser.close();
  console.log('All screenshots captured successfully.');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
