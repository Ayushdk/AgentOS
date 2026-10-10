import { test, expect } from '@playwright/test';

test.describe('Calendar Controlled Clock & Timezone Suite', () => {
  test('1. Controlled Clock: Defaults to current month & highlights today (Oct 11, 2026)', async ({ page }) => {
    // Fast forward or lock clock to Oct 11, 2026 IST
    await page.clock.setFixedTime(new Date('2026-10-11T10:30:00+05:30'));

    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });

    // Open Calendar
    await page.getByRole('button', { name: 'Calendar', exact: true }).click();

    // Verify header defaults to October 2026
    await expect(page.locator('.calendar-heading')).toHaveText('October 2026');

    // Verify cell 11 has is-today class and Today indicator badge
    const todayCell = page.locator('.calendar-day-cell.is-today');
    await expect(todayCell).toBeVisible();
    await expect(todayCell.locator('.day-number')).toHaveText('11');
    await expect(todayCell.locator('.today-indicator')).toHaveText('Today');

    // Verify Inspector title shows Sunday, October 11, 2026
    await expect(page.locator('.inspector-title')).toContainText('October 11, 2026');
    await expect(page.locator('.inspector-title')).toContainText('Sunday');

    // Verify October 2026 total days = 31 (cell 31 is in-month)
    const oct31 = page.locator('.calendar-day-cell.in-month').filter({ hasText: '31' });
    await expect(oct31).toBeVisible();
  });

  test('2. Controlled Clock: Leap year handling (Feb 2028 with 29 days) & Today button', async ({ page }) => {
    // Set clock to Leap Year: Feb 15, 2028
    await page.clock.setFixedTime(new Date('2028-02-15T12:00:00+05:30'));

    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });

    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('February 2028');

    // Feb 15 is today
    const todayCell = page.locator('.calendar-day-cell.is-today');
    await expect(todayCell.locator('.day-number')).toHaveText('15');

    // Check that Feb 29 exists as an in-month cell (leap year!)
    const feb29 = page.locator('.calendar-day-cell.in-month').filter({ hasText: '29' });
    await expect(feb29).toBeVisible();

    // Navigate to next month (March 2028)
    await page.getByRole('button', { name: 'Next month' }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('March 2028');

    // Click "Today" button -> jumps back to February 2028 and selects Feb 15
    await page.getByRole('button', { name: 'Today' }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('February 2028');
    await expect(page.locator('.inspector-title')).toContainText('February 15, 2028');
  });

  test('3. Timezone boundary & evening clock (no UTC drift to previous day)', async ({ page }) => {
    // Set clock to evening 23:45 IST on Oct 11, 2026
    await page.clock.setFixedTime(new Date('2026-10-11T23:45:00+05:30'));

    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });

    await page.getByRole('button', { name: 'Calendar', exact: true }).click();

    // Still October 2026
    await expect(page.locator('.calendar-heading')).toHaveText('October 2026');

    // Day 11 is today, not day 10 or day 12
    const todayCell = page.locator('.calendar-day-cell.is-today');
    await expect(todayCell.locator('.day-number')).toHaveText('11');
    await expect(page.locator('.inspector-title')).toContainText('October 11, 2026');
  });

  test('4. Event & Holiday placement: placed only on exact dates with simulation transparency', async ({ page }) => {
    // Set clock to November 1, 2026
    await page.clock.setFixedTime(new Date('2026-11-01T10:00:00+05:30'));

    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });

    await page.getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('.calendar-heading')).toHaveText('November 2026');

    // Meridian Foundation Day is ONLY on Nov 18
    const holidayBadges = page.locator('.badge-holiday');
    await expect(holidayBadges).toHaveCount(1);
    await expect(holidayBadges.first()).toContainText('Meridian Foundation Day');

    // Click on Nov 17 to check simulated event
    const nov17Cell = page.locator('.calendar-day-cell').filter({ hasText: '17' }).first();
    await nov17Cell.click();

    // Verify simulated event label
    await expect(page.locator('.inspector-card')).toContainText('Product planning · simulated');
    await expect(page.locator('.inspector-card')).toContainText('Simulated record');

    // Click on Nov 18 to inspect holiday
    const nov18Cell = page.locator('.calendar-day-cell').filter({ hasText: '18' }).first();
    await nov18Cell.click();
    await expect(page.locator('.inspector-card')).toContainText('Meridian Foundation Day');
    await expect(page.locator('.inspector-card')).toContainText('Authorized corporate holiday (Asia/Kolkata)');
  });

  test('5. Employee Dashboard: Dynamic next upcoming holiday from /calendar and empty state handling', async ({ page }) => {
    // 5a: With clock on Oct 11, 2026 -> next holiday is Meridian Foundation Day (Nov 18, 2026)
    await page.clock.setFixedTime(new Date('2026-10-11T10:00:00+05:30'));
    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });

    // Metric tile Card 2
    await expect(page.locator('.stat-label').filter({ hasText: 'Upcoming Holiday' })).toBeVisible();
    await expect(page.locator('.stat-text-title').filter({ hasText: 'Meridian Foundation Day' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.stat-subtext').filter({ hasText: '18 Nov 2026' })).toBeVisible();
    await expect(page.locator('.badge-amber-subtle').filter({ hasText: 'in 38 days' })).toBeVisible();

    // 5b: Advance clock to Nov 20, 2026 -> next holiday dynamically shifts to Winter Holiday (Dec 25, 2026)
    await page.clock.setFixedTime(new Date('2026-11-20T10:00:00+05:30'));
    await page.reload();
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.stat-text-title').filter({ hasText: 'Winter Holiday' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.stat-subtext').filter({ hasText: '25 Dec 2026' })).toBeVisible();

    // 5c: Advance clock to Jan 15, 2027 (past all seeded holidays) -> graceful empty state
    await page.clock.setFixedTime(new Date('2027-01-15T10:00:00+05:30'));
    await page.reload();
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('.stat-text-title').filter({ hasText: 'No Upcoming Holidays' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.stat-subtext').filter({ hasText: 'All holidays observed' })).toBeVisible();
    await expect(page.getByText('No upcoming corporate holidays scheduled.')).toBeVisible();
  });

  test('6. Manager Dashboard: Upcoming availability timeline uses runtime working dates and live holidays', async ({ page }) => {
    // Set clock to Friday Nov 13, 2026 -> next working days include Mon Nov 16, Tue Nov 17, Wed Nov 18 (Foundation Day)
    await page.clock.setFixedTime(new Date('2026-11-13T10:00:00+05:30'));
    await page.goto('/');
    await expect(page.getByText('Hello, Ari.')).toBeVisible({ timeout: 60000 });

    // Switch to Manager
    await page.getByLabel('Demo identity').selectOption('manager');
    await expect(page.locator('.profile')).toContainText('Tara Sen');

    // Verify upcoming availability card reflects working dates starting next Mon (Nov 16)
    await expect(page.getByRole('heading', { name: 'Team Availability (Upcoming)' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.timeline-day-row').filter({ hasText: 'Nov 16' })).toBeVisible({ timeout: 15000 });

    // Verify Nov 18 is recognized dynamically as corporate holiday
    const nov18Row = page.locator('.timeline-day-row').filter({ hasText: 'Nov 18' });
    await expect(nov18Row).toBeVisible();
    await expect(nov18Row).toContainText('Meridian Foundation Day');
  });
});
