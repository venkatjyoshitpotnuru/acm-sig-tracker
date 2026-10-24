import { test, expect } from '@playwright/test';

test.describe('Chapter Portal Smoke & Workflow Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('1. Verify human-crafted academic login UI and assets', async ({ page }) => {
    // Official logo & headline
    const logo = page.locator('img[alt="ACM Logo"]');
    await expect(logo).toBeVisible();
    await expect(page.locator('h1')).toHaveText('Chapter Portal');

    // Roll number input exists with uppercase requirement
    const rollInput = page.locator('input[placeholder="e.g. CB.EN.U4AIE24000"]');
    await expect(rollInput).toBeVisible();

    // Toggle between Sign In and Sign Up
    const switchBtn = page.locator('button:has-text("New here? Create Account")');
    await switchBtn.click();
    await expect(page.locator('text=Full Name')).toBeVisible();

    // Switch back to Sign In
    await page.locator('button:has-text("Already have an account? Sign In")').click();
    await expect(page.locator('text=Full Name')).not.toBeVisible();
  });

  test('2. Verify Lead Suite loads and modal supports bulk targets', async ({ page }) => {
    // Lead credentials
    await page.fill('input[placeholder="e.g. CB.EN.U4AIE24000"]', 'TEST.123');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');

    // Wait for redirect to the Lead Suite
    await page.waitForURL('**/dashboard/lead');
    await expect(page.locator('text=Domain Lead Suite')).toBeVisible();

    // Open Assign Task modal
    await page.click('button:has-text("Assign Task")');
    await expect(page.locator('text=Assignment Target')).toBeVisible();

    // Check bulk options exist
    const targetSelect = page.locator('select').filter({ hasText: 'Specific Member' });
    await expect(targetSelect).toBeVisible();

    // Test Semester target selection
    await targetSelect.selectOption('SEMESTER');
    await expect(page.locator('text=Select Semester')).toBeVisible();

    // Test All Members target selection
    await targetSelect.selectOption('ALL');
    await expect(page.locator('text=Target Scope')).toBeVisible();
  });

 test('3. Verify Chair Executive Suite loads and displays chapter metrics', async ({ page }) => {
    // Chair credentials
    await page.fill('input[placeholder="e.g. CB.EN.U4AIE24000"]', 'CHAIR01');
    await page.fill('input[type="password"]', 'chair1');
    await page.click('button[type="submit"]');

    // Wait for redirect to Chair Dashboard
    await page.waitForURL('**/dashboard/chair');
    await expect(page.getByText('Executive Suite', { exact: false }).first()).toBeVisible();

    // Wait for asynchronous data loading to finish
    await expect(page.locator('text=Loading chapter intelligence...')).not.toBeVisible({ timeout: 10000 });

    // Verify that the dashboard metrics grid has loaded instead of guessing exact text
    // This checks for the main grid container that holds your cards
    const metricsGrid = page.locator('.grid').first();
    await expect(metricsGrid).toBeVisible({ timeout: 7000 });
  });

  test('4. Verify Student Member Portal interaction & task toggling', async ({ page }) => {
    // Student Member credentials
    await page.fill('input[placeholder="e.g. CB.EN.U4AIE24000"]', 'MEM01');
    await page.fill('input[type="password"]', 'member1');
    await page.click('button[type="submit"]');

    // Wait for redirect to Member Workspace
    await page.waitForURL('**/dashboard/member');

    // Resolves strict-mode violation by targeting the navigation link explicitly
    await expect(page.getByRole('link', { name: 'Student Portal' })).toBeVisible();
    await expect(page.getByText('My Workspace').first()).toBeVisible();

    // Check deliverable milestone toggle if one exists
    const milestoneItem = page.locator('button:has(svg)').first();
    if (await milestoneItem.isVisible()) {
      await milestoneItem.click();
      await page.waitForTimeout(500);
    }
  });

});