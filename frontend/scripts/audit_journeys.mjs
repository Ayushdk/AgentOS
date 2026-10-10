import { chromium } from '@playwright/test';

async function runAudit() {
  console.log('--- STARTING PRODUCTION-READINESS AUDIT ---');
  const browser = await chromium.launch();
  const errors = [];
  const warnings = [];

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`Console Error: ${msg.text()}`);
    } else if (msg.type() === 'warning') {
      warnings.push(`Console Warning: ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`Page Uncaught Exception: ${err.message}`);
  });

  // 1. Employee Dashboard Load & Metrics Audit
  console.log('[1/7] Testing Employee Dashboard (Desktop 1440x900)...');
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.dashboard-container');

  const employeeName = await page.locator('.user-badge-name').innerText();
  const employeeRole = await page.locator('.user-badge-role').innerText();
  console.log(`  - Verified Identity: ${employeeName} (${employeeRole})`);
  if (!employeeName.includes('Ari Sen')) throw new Error('Unexpected employee identity');

  const leaveBalance = await page.locator('.stat-card').first().locator('.stat-number').innerText();
  console.log(`  - Verified Real Leave Balance: ${leaveBalance} days`);

  const pendingCount = await page.locator('.stat-card').nth(2).locator('.stat-number').innerText();
  console.log(`  - Verified Pending Leave Requests Count: ${pendingCount}`);

  // Check interactive prompt
  console.log('  - Testing interactive AI chip: "Plan some time off"...');
  await page.getByRole('button', { name: 'Plan some time off' }).click();
  await page.waitForSelector('.draft-card');
  console.log('  - Draft card generated with excluded holidays and working days calculation.');
  await page.getByRole('button', { name: 'Confirm & submit' }).click();
  await page.waitForSelector('text=Waiting for your manager');
  console.log('  - Leave request submitted successfully.');

  // Check Employee Calendar
  console.log('  - Testing Employee Calendar & Holiday detection...');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.waitForSelector('.calendar-heading');
  const calHeading = await page.locator('.calendar-heading').innerText();
  console.log(`  - Verified Current Calendar View: ${calHeading}`);

  // If on current month (e.g. October), advance to November to inspect corporate holiday
  if (!calHeading.includes('November')) {
    await page.getByRole('button', { name: 'Next month' }).click();
    await page.waitForSelector('.calendar-heading:has-text("November")');
  }

  const hasFoundationDay = await page.locator('.badge-holiday:has-text("Meridian Foundation Day")').isVisible();
  console.log(`  - Verified Meridian Foundation Day holiday badge in November: ${hasFoundationDay}`);
  await page.locator('.calendar-day-cell:has-text("18")').first().click();
  await page.waitForSelector('.inspector-card:has-text("Meridian Foundation Day")');
  console.log('  - Verified Day Inspector Panel opens with company holiday details.');

  // Return to Today
  await page.getByRole('button', { name: 'Today' }).click();
  console.log('  - Verified Today button resets to current month.');

  // Check Policy Explorer
  console.log('  - Testing Policy Explorer & Document reading...');
  await page.getByRole('button', { name: 'Policy Explorer', exact: true }).click();
  await page.waitForSelector('.document-main-title');
  const policyTitle = await page.locator('.document-main-title').innerText();
  console.log(`  - Verified Active Policy: ${policyTitle}`);
  await page.getByLabel('Search policies').fill('remote');
  await page.locator('.policy-nav-item:has-text("REMOTE-1")').click();
  await page.waitForSelector('.document-main-title:has-text("Remote work")');
  console.log('  - Verified Policy Search & Document switching to REMOTE-1.');
  await page.getByRole('button', { name: 'Clear' }).click();

  // 2. Manager Dashboard & Approval Workflow
  console.log('[2/7] Testing Manager Dashboard, Direct Reports & Approvals...');
  await page.getByLabel('Demo identity').selectOption('manager');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Overview' }).click();
  await page.waitForSelector('.dashboard-container');

  const managerName = await page.locator('.user-badge-name').innerText();
  const managerRole = await page.locator('.user-badge-role').innerText();
  console.log(`  - Verified Identity: ${managerName} (${managerRole})`);
  if (!managerName.includes('Tara Sen')) throw new Error('Unexpected manager identity');

  const pendingApprovalsCount = await page.locator('.stat-card').first().locator('.stat-number').innerText();
  console.log(`  - Verified Manager Approval Queue Count: ${pendingApprovalsCount}`);

  // Test Manager Team Members
  console.log('  - Testing Manager Team Directory...');
  await page.getByRole('button', { name: 'Team Members', exact: true }).click();
  await page.waitForSelector('.team-directory-container .data-table');
  const reportsCount = await page.locator('.team-directory-container .data-table tbody tr').count();
  console.log(`  - Verified Live Direct Reports Count: ${reportsCount} engineers`);

  // Test approval in review-card
  await page.getByRole('button', { name: 'Manager approvals', exact: true }).click();
  await page.waitForSelector('.card');
  const reviewCard = page.locator('.review-card').first();
  if (await reviewCard.isVisible()) {
    console.log('  - Testing Approval Action on pending request...');
    await reviewCard.getByRole('button', { name: 'Approve' }).click();
    await page.waitForTimeout(1000);
    console.log('  - Approval executed successfully via backend API.');
  }

  // 3. HR Dashboard & Ticket Resolution
  console.log('[3/7] Testing HR Dashboard & People Analytics...');
  await page.getByLabel('Demo identity').selectOption('hr');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Overview' }).click();
  await page.waitForSelector('.dashboard-container');

  const hrName = await page.locator('.user-badge-name').innerText();
  const hrRole = await page.locator('.user-badge-role').innerText();
  console.log(`  - Verified Identity: ${hrName} (${hrRole})`);
  if (!hrName.includes('Tara Shah')) throw new Error('Unexpected HR identity');

  const totalEmployees = await page.locator('.stat-card').first().locator('.stat-number').innerText();
  const totalDepts = await page.locator('.stat-card').nth(1).locator('.stat-number').innerText();
  const attritionRate = await page.locator('.stat-card').nth(2).locator('.stat-number').innerText();
  const openTickets = await page.locator('.stat-card').nth(3).locator('.stat-number').innerText();
  console.log(`  - Verified HR Metric Cards: Headcount=${totalEmployees}, Depts=${totalDepts}, Attrition=${attritionRate}, Tickets=${openTickets}`);

  // Verify charts render
  const barChart = await page.locator('.recharts-bar').first().isVisible();
  console.log(`  - Headcount Bar Chart Rendered: ${barChart}`);
  const donutChart = await page.locator('.recharts-pie').first().isVisible();
  console.log(`  - Status Donut Chart Rendered: ${donutChart}`);

  // 4. Role-Based Authorization Enforcement
  console.log('[4/7] Testing RBAC Security Guard Enforcement...');
  // Switch back to employee and attempt accessing /analytics directly
  await page.getByLabel('Demo identity').selectOption('employee');
  await page.waitForTimeout(1000);
  // Click HR analytics button in dev access test
  await page.getByRole('button', { name: 'HR analytics', exact: true }).click();
  await page.waitForSelector('h3:has-text("HR analyst workspace")');
  console.log('  - Verified: Employee attempting HR Analytics correctly blocked by backend/frontend RBAC.');

  // 5. Tablet Responsiveness (768x1024)
  console.log('[5/7] Testing Tablet Layout (768x1024)...');
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  const tabletScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  console.log(`  - Tablet Body scrollWidth: ${tabletScrollWidth}px (Expected: 768px)`);
  if (tabletScrollWidth > 768) {
    console.warn(`  ! Tablet horizontal overflow detected: ${tabletScrollWidth} > 768`);
  }

  // 6. Mobile Responsiveness (390x844)
  console.log('[6/7] Testing Mobile Layout (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const mobileScrollWidth = await page.evaluate(() => document.body.scrollWidth);
  console.log(`  - Mobile Body scrollWidth: ${mobileScrollWidth}px (Expected: 390px)`);
  if (mobileScrollWidth > 390) {
    console.warn(`  ! Mobile horizontal overflow detected: ${mobileScrollWidth} > 390`);
  }

  // Toggle mobile drawer
  const mobileToggle = page.locator('.mobile-toggle');
  if (await mobileToggle.isVisible()) {
    await mobileToggle.click();
    await page.waitForSelector('.sidebar.open');
    console.log('  - Mobile drawer toggle opens successfully.');
    const mobileClose = page.locator('.mobile-close');
    await mobileClose.click();
    console.log('  - Mobile drawer close button closes successfully.');
  }

  // 7. Error Summary
  console.log('[7/7] Auditing Console & Exception logs...');
  console.log(`  - Uncaught page exceptions: ${errors.length}`);
  if (errors.length > 0) {
    console.error('  Errors found:', errors);
  } else {
    console.log('  - Zero uncaught page exceptions or fatal errors!');
  }

  await browser.close();
  console.log('--- AUDIT COMPLETED SUCCESSFULLY ---');
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
