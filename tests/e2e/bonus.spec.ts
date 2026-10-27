import { test, expect } from '@playwright/test';

test.describe('Loyalty Bonus', () => {
  // Use kasir state
  test.use({ storageState: 'tests/e2e/.auth/kasirState.json' });

  test('Issue/Consume Bonus', async ({ page }) => {
    await page.goto('/kasir/bonus');

    // Wait for the bonus list to load (should see the employee name or product)
    // In our seed-e2e, Kasir E2E gets Kopi E2E bonus.
    await expect(page.getByText(/Kopi E2E/i).first()).toBeVisible({ timeout: 10000 });
    
    // Click Ambil 1
    const ambilBtn = page.getByRole('button', { name: /Ambil 1/i }).first();
    await ambilBtn.click();

    // Verify the UI confirms redemption
    await expect(page.locator('[data-sonner-toast]')).toContainText(/diambil/i);
  });
});
