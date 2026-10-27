import { test, expect } from '@playwright/test';

test.describe('Settings & Owner Utilities', () => {
  // Use owner state
  test.use({ storageState: 'tests/e2e/.auth/ownerState.json' });

  test('Change Password', async ({ page }) => {
    await page.goto('/owner/settings/password');

    // Use the actual labels from the source code
    await page.getByLabel(/Password Lama/i).fill(process.env.TEST_OWNER_PASSWORD || 'password123');
    await page.getByLabel('Password Baru', { exact: true }).first().fill('newpassword123');
    await page.getByLabel('Konfirmasi Password Baru', { exact: true }).first().fill('newpassword123');
    await page.getByRole('button', { name: /Simpan Password Owner/i }).click();

    // Verify redirect to login page (toast disappears too fast due to navigation)
    await expect(page).toHaveURL(/\/login/);
    await page.waitForLoadState('domcontentloaded');

    // First we have to login again with the new password
    await page.getByRole('tab', { name: 'Owner' }).click();
    await expect(page.getByRole('button', { name: /Masuk sebagai Owner/i })).toBeVisible();
    await page.getByLabel(/Email/i).fill(process.env.TEST_OWNER_EMAIL || 'owner@openpos.dev');
    await page.getByLabel('Password', { exact: true }).fill('newpassword123');
    await page.getByRole('button', { name: /Masuk sebagai Owner/i }).click();
    await expect(page).toHaveURL(/\/owner/);

    // Now go back to settings and revert
    await page.goto('/owner/settings/password');
    await page.getByLabel(/Password Lama/i).fill('newpassword123');
    await page.getByLabel('Password Baru', { exact: true }).first().fill(process.env.TEST_OWNER_PASSWORD || 'password123');
    await page.getByLabel('Konfirmasi Password Baru', { exact: true }).first().fill(process.env.TEST_OWNER_PASSWORD || 'password123');
    await page.getByRole('button', { name: /Simpan Password Owner/i }).click();

    // Wait for it to redirect to login again, confirming revert
    await expect(page).toHaveURL(/\/login/);
    await page.waitForLoadState('domcontentloaded');
  });

  test('Export Excel', async ({ page }) => {
    await page.goto('/owner/pembukuan');

    // Start waiting for download before clicking. Note no await.
    const downloadPromise = page.waitForEvent('download');
    
    // Click "Export to Excel"
    await page.getByRole('button', { name: /Export|Unduh Excel/i }).click();
    
    const download = await downloadPromise;
    
    // Verify the filename
    expect(download.suggestedFilename()).toMatch(/Pembukuan.*\.xlsx/);
  });

  test('Responsive Mobile Nav', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/owner');

    // Verify sidebar is hidden
    // The hamburger menu is present and visible
    const hamburgerBtn = page.getByRole('button', { name: /Buka menu/i });
    await expect(hamburgerBtn).toBeVisible();

    // Open drawer
    await hamburgerBtn.click();
    
    // Verify nav links are visible
    const menuLink = page.getByRole('link', { name: /Menu/i });
    await expect(menuLink).toBeVisible();

    // Navigate to another page
    await menuLink.click();

    // Verify drawer closes (menu link is no longer visible)
    await expect(menuLink).not.toBeVisible();
  });
});
