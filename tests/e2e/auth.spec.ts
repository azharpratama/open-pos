import { test, expect } from '@playwright/test';

test.describe('Authentication & Authorization', () => {
  // Clear any storage state for auth tests so we start fresh
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Login Flow - Kasir', async ({ page }) => {
    await page.goto('/login');
    
    // Select Kasir tab
    await page.getByRole('tab', { name: 'Kasir' }).click();
    
    // Fill credentials
    await page.getByLabel(/Email/i).fill(process.env.TEST_KASIR_EMAIL || 'kasir@openpos.dev');
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_KASIR_PASSWORD || 'password123');
    
    await page.getByRole('button', { name: /Masuk sebagai Kasir/i }).click();
    
    // Verify redirect
    await expect(page).toHaveURL(/\/kasir/);
  });

  test('Login Flow - Owner', async ({ page }) => {
    await page.goto('/login');
    
    // Select Owner tab
    await page.getByRole('tab', { name: 'Owner' }).click();
    
    // Fill credentials
    await page.getByLabel(/Email/i).fill(process.env.TEST_OWNER_EMAIL || 'owner@openpos.dev');
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_OWNER_PASSWORD || 'password123');
    
    await page.getByRole('button', { name: /Masuk sebagai Owner/i }).click();
    
    // Verify redirect
    await expect(page).toHaveURL(/\/owner/);
  });

  test('Login Flow - Invalid Credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByRole('tab', { name: 'Kasir' }).click();
    await page.getByLabel(/Email/i).fill('wrong@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrongpass');
    
    await page.getByRole('button', { name: /Masuk sebagai Kasir/i }).click();
    
    // Should show error toast
    await expect(page.getByText('Email atau password salah')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Role Protection - Unauthenticated', async ({ page }) => {
    await page.goto('/kasir/pesan');
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Role Protection - As Kasir', () => {
  // Use kasir state
  test.use({ storageState: 'tests/e2e/.auth/kasirState.json' });

  test('Cannot access owner routes', async ({ page }) => {
    await page.goto('/owner');
    // Should be redirected back to kasir or login, or show 403. Let's assume it redirects to kasir or login
    await expect(page).not.toHaveURL(/\/owner/);
  });

  test('Logout flow', async ({ page }) => {
    await page.goto('/kasir/pesan');
    
    // Click logout (assuming there's a logout button, maybe in sidebar or user menu)
    // We might need to adjust the selector based on actual UI
    const logoutBtn = page.locator('button').filter({ hasText: /Keluar|Logout/i }).first();
    if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
    } else {
        // Fallback: maybe it's in a dropdown
        await page.locator('button').filter({ hasText: /Kasir/i }).last().click();
        await page.getByText(/Keluar|Logout/i).click();
    }
    
    await expect(page).toHaveURL(/\/login/);
    
    // Verify session is cleared by trying to go back
    await page.goto('/kasir/pesan');
    await expect(page).toHaveURL(/\/login/);
  });
});
