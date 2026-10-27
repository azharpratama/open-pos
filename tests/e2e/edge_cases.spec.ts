import { test, expect } from '@playwright/test';

test.describe('Edge Cases & Validation', () => {
  // Use kasir state
  test.use({ storageState: 'tests/e2e/.auth/kasirState.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/kasir/pesan');
    // Ensure shift is open if needed
    const bukaBtn = page.getByRole('button', { name: /Buka Shift/i }).first();
    if (await bukaBtn.isVisible()) {
      await bukaBtn.click();
    }
    // Wait for the shift to actually be open before proceeding
    await expect(page.getByText(/Shift Berjalan|Tutup Shift/i).first()).toBeVisible();
  });

  test('Cart Interactions', async ({ page }) => {
    // Empty Cart
    const bayarBtn = page.getByRole('button', { name: /Lanjut ke Pembayaran/i });
    await expect(bayarBtn).toBeDisabled();

    // Zero Quantity
    await page.getByText(/Kopi E2E/i).first().click();
    const cartSidebar = page.locator('.w-\\[380px\\]').filter({ hasText: /Pesanan Saat Ini/i }).first();
    await expect(cartSidebar.getByText(/Kopi E2E/i)).toBeVisible();
    
    // Decrease quantity
    await cartSidebar.getByRole('button', { name: /-|Kurang/i }).first().click();
    // Verify item is removed
    await expect(cartSidebar.getByText(/Kopi E2E/i)).not.toBeVisible();

    // Clear Cart
    await page.getByText(/Kopi E2E/i).first().click();
    // Use locator to click product explicitly to avoid toast intercepting
    await page.locator('.p-4').filter({ hasText: 'Kopi E2E' }).first().click();
    await cartSidebar.getByRole('button', { name: /^Hapus$/i }).click();
    await expect(cartSidebar.getByText(/Kopi E2E/i)).not.toBeVisible();
  });

  test('Payment Edge Cases', async ({ page }) => {
    await page.getByText(/Kopi E2E/i).first().click();
    
    // Takeaway vs Dine-in
    await expect(page.getByText(/Lantai 1|Lantai 2/i).first()).toBeVisible();
    await page.getByText(/Takeaway|Bawa Pulang/i).click();
    await expect(page.getByText(/Lantai 1|Lantai 2/i).first()).not.toBeVisible();
    await page.getByText(/Dine-in|Makan di Tempat/i).click();
    await expect(page.getByText(/Lantai 1|Lantai 2/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Lanjut ke Pembayaran/i }).click();

    // Enter Nama Pemesan to enable submission
    await page.getByLabel(/Nama Pemesan/i).fill('Test Edge');

    // Insufficient Cash
    await page.getByRole('tab', { name: /Tunai/i }).click();
    await page.getByLabel(/Nama Kasir/i).selectOption({ index: 1 });
    // Fill an amount less than 15000 (price of Kopi E2E)
    // The amount input label is 'Uang diterima'
    await page.getByLabel(/Uang diterima/i).fill('5000');
    // The submit button should be disabled
    const submitBtn = page.getByRole('button', { name: /Konfirmasi Pembayaran/i });
    await expect(submitBtn).toBeDisabled();

    // Kembalian (Change)
    await page.getByLabel(/Uang diterima/i).fill('20000');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify receipt shows correct Kembalian (20000 - 15000 = 5000)
    await expect(page).toHaveURL(/\/kasir\/struk/);
    await expect(page.getByText(/Kembalian Rp\s*5\.000/i)).toBeVisible(); // Look for 5000 in the receipt
  });

  test('Shift Edge Cases - Refresh Recovery', async ({ page }) => {
    await page.goto('/kasir/pesan');
    
    // Check if shift is currently active
    const activeShiftText = page.getByText(/Shift Berjalan|Tutup Shift/i).first();
    await expect(activeShiftText).toBeVisible();

    // Refresh page
    await page.reload();

    // Verify still active
    await expect(activeShiftText).toBeVisible();
  });
});
