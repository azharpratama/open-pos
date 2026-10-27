import { test, expect } from '@playwright/test';

test.describe('Offline Capabilities', () => {
  // Use kasir state
  test.use({ storageState: 'tests/e2e/.auth/kasirState.json' });

  test('Offline Order Queue & Sync', async ({ page, context }) => {
    await page.goto('/kasir/pesan');
    
    // Clean up any stale offline queues from previous tests
    await page.evaluate(() => {
      const req = indexedDB.deleteDatabase('keyval-store');
      return new Promise((resolve) => {
        req.onsuccess = resolve;
        req.onerror = resolve;
      });
    });
    
    // Make sure a shift is open, otherwise ordering is disabled.
    const bukaBtn = page.getByRole('button', { name: /Buka Shift/i }).first();
    if (await bukaBtn.isVisible()) {
      await bukaBtn.click();
    }
    
    // 1. Offline Order Queue
    // Mock network offline by aborting the orders API
    await page.route('/api/orders', route => route.abort('failed'));

    // Cashier adds item to cart
    await page.getByText(/Kopi E2E/i).first().click();
    
    // Checkout -> Submit order
    await page.getByRole('button', { name: /Lanjut ke Pembayaran/i }).click();
    await page.getByLabel(/Nama Pemesan/i).fill('Test E2E');
    await page.getByRole('tab', { name: /Tunai/i }).click();
    await page.getByLabel(/Nama Kasir/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /Uang Pas/i }).click();
    await page.getByRole('button', { name: /Konfirmasi Pembayaran/i }).click();

    // Verify warning toast
    await expect(page.getByText(/Koneksi terputus/i)).toBeVisible();

    // The router should navigate to /kasir/struk because only /api/orders was aborted
    await expect(page).toHaveURL(/\/kasir\/struk/);

    // Go back to new transaction
    await page.getByRole('link', { name: /Transaksi Baru/i }).click();
    await expect(page).toHaveURL(/\/kasir\/pesan/);

    // 2. Online Sync
    // Restore network and manually trigger online event
    await page.unroute('/api/orders');
    
    // Wait for the page to be fully mounted by checking for the Online indicator
    await expect(page.getByText('Online', { exact: true }).first()).toBeVisible();
    
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // Wait for the sync to complete and show success toast
    await expect(page.getByText(/pesanan offline berhasil disinkronkan/i)).toBeVisible({ timeout: 15000 });

    // Wait a bit for sync to trigger
    await page.waitForTimeout(1000);

    // Navigate to /kasir/antrian to verify order
    await page.goto('/kasir/antrian');
    
    // Verify the offline order reached the server
    await expect(page.getByText(/Kopi E2E/i).first()).toBeVisible();
  });
});
