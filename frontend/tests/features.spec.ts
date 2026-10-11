import { test, expect } from '@playwright/test';

test.describe('AgentOS Comprehensive Feature Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });
  });

  test('1. Employee Calendar navigation, holiday detection, and date inspector', async ({ page }) => {
    // Navigate to Calendar
    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    // Default runtime month is October 2026
    await expect(page.locator('.calendar-heading')).toHaveText('October 2026', { timeout: 15000 });

    // Verify today's date (Oct 11) is highlighted with is-today and today-indicator
    const todayCell = page.locator('.calendar-day-cell.is-today');
    await expect(todayCell).toBeVisible();
    await expect(todayCell.locator('.today-indicator')).toHaveText('Today');
    await expect(todayCell.locator('.day-number')).toHaveText('11');

    // Default inspector shows today's date
    await expect(page.locator('.inspector-title')).toContainText('October 11, 2026');

    // Test Next Month navigation to November 2026
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('November 2026');
    await expect(page.locator('.badge-holiday').filter({ hasText: 'Meridian Foundation Day' })).toBeVisible();

    // Click on Nov 18 (Foundation Day)
    const nov18Cell = page.locator('.calendar-day-cell').filter({ hasText: '18' }).first();
    await nov18Cell.click();
    await expect(page.locator('.inspector-card')).toContainText('Meridian Foundation Day');
    await expect(page.locator('.inspector-card')).toContainText('Authorized corporate holiday');

    // Advance to December 2026
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('December 2026');
    await expect(page.locator('.badge-holiday').filter({ hasText: 'Winter Holiday' })).toBeVisible();

    // Click Today button to jump back to current month
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('October 2026');
    await expect(page.locator('.inspector-title')).toContainText('October 11, 2026');
  });

  test('2. Policy Explorer search, document reading, and grounded AI prompts', async ({ page }) => {
    // Navigate to Policy Explorer
    await page.getByRole('button', { name: 'Policy Explorer', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Meridian Policy Repository' })).toBeVisible({ timeout: 15000 });

    // Verify default policy LEAVE-2 is loaded with its sections
    await expect(page.locator('.document-main-title')).toContainText('Leave & time away', { timeout: 15000 });
    await expect(page.getByText('Annual leave entitlement')).toBeVisible();

    // Test search filter
    const searchInput = page.getByLabel('Search policies');
    await searchInput.fill('remote');
    await expect(page.locator('.policy-nav-item')).toHaveCount(1);
    await expect(page.locator('.policy-nav-item')).toContainText('REMOTE-1');

    // Click REMOTE-1 and read document
    await page.locator('.policy-nav-item').click();
    await expect(page.locator('.document-main-title')).toContainText('Remote work', { timeout: 15000 });
    await expect(page.getByText('Hybrid schedule')).toBeVisible();

    // Clear search
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.locator('.policy-nav-item')).toHaveCount(5);

    // Click suggestion chip to ask grounded question
    await page.getByRole('button', { name: 'Weekly remote limit' }).click();
    // Redirects to AI Assistant conversation
    await expect(page.getByRole('heading', { name: 'A little support. More momentum.' })).toBeVisible();
    await expect(page.locator('.conversation')).toBeVisible({ timeout: 60000 });
  });

  test('3. Manager Team Members Directory and Team Calendar', async ({ page }) => {
    // Switch to Manager
    await page.getByLabel('Demo identity').selectOption('manager');
    await expect(page.locator('.profile')).toContainText('Tara Sen');
    await expect(page.getByText('Manager workspace', { exact: true })).toBeVisible();

    // Navigate to Team Members
    await page.getByRole('button', { name: 'Team Members', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Direct Reports' })).toBeVisible({ timeout: 15000 });

    // Wait for direct reports table to load from backend
    await expect(page.locator('.team-directory-container .data-table')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.team-directory-container .data-table tbody tr')).toHaveCount(9);
    await expect(page.locator('.team-directory-container .data-table')).toContainText('Ari Sen');
    await expect(page.locator('.team-directory-container .data-table')).toContainText('employee');

    // Test search in team directory
    await page.getByLabel('Search direct reports').fill('Dev');
    await expect(page.locator('.team-directory-container .data-table tbody tr')).toHaveCount(1);
    await expect(page.locator('.team-directory-container .data-table')).toContainText('Dev Sen');
    await page.getByLabel('Search direct reports').fill('');

    // Navigate to Team Calendar
    await page.getByRole('button', { name: 'Team Calendar', exact: true }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('October 2026', { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Team Leaves' })).toBeVisible();
  });

  test('4. Security role restrictions and unauthorized access barriers', async ({ page }) => {
    // Current user is Employee
    await expect(page.locator('.profile')).toContainText('Ari Sen');

    // Attempt to access HR analytics directly via Dev test
    await page.getByRole('button', { name: 'HR analytics', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'HR analyst workspace' })).toBeVisible();
    await expect(page.getByText('This page is limited to a verified hr analyst identity.')).toBeVisible();

    // Attempt to access Manager approvals
    await page.getByRole('button', { name: 'Manager approvals', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Manager workspace' })).toBeVisible();
    await expect(page.getByText('This page is limited to a verified manager identity.')).toBeVisible();
  });

  test('5. Mobile responsive navigation drawer and interaction', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // Open mobile sidebar
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await expect(page.locator('aside.sidebar')).toHaveClass(/open/);

    // Click Calendar in mobile drawer
    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('October 2026', { timeout: 15000 });

    // Verify body does not horizontally overflow
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 390);
  });
});
