import { test, expect } from '@playwright/test';

test.describe('Shift Management - Owner', () => {
  test.use({ storageState: 'tests/e2e/.auth/ownerState.json' });

  test('Owner schedules a shift', async ({ page }) => {
    await page.goto('/owner/shift');

    // Click today's date on the calendar
    await page.locator('button.ring-primary').first().click();

    // Dialog opens. Select Kasir E2E (the employee we seeded)
    // There are two sections: Siang and Malam. We'll check the first Kasir E2E we see
    await page.getByLabel(/Kasir E2E/i).first().check();

    // Click Simpan & Rekap Gaji or just Simpan
    await page.getByRole('button', { name: /Simpan/i }).last().click();

    // Verify it appears in the list/calendar
    await expect(page.getByText(/Kasir E2E/i).first()).toBeVisible();
  });
});

test.describe('Shift Management - Kasir', () => {
  test.use({ storageState: 'tests/e2e/.auth/kasirState.json' });

  test('Kasir opens and closes shift', async ({ page }) => {
    // Go to kasir pesan page
    await page.goto('/kasir/pesan');

    // Buka Shift
    const bukaBtn = page.getByRole('button', { name: /Buka Shift/i }).first();
    // Assuming it's visible on /kasir/pesan if shift is closed
    if (await bukaBtn.isVisible()) {
      await bukaBtn.click();
    }

    // Verify shift is open (status changes, or Tutup Shift appears)
    const tutupBtn = page.getByRole('button', { name: /Tutup Shift/i });
    await expect(tutupBtn).toBeVisible();

    // Tutup Shift
    await tutupBtn.click();
    
    // Confirm dialog
    const confirmBtn = page.getByRole('button', { name: /Ya, Tutup|Konfirmasi|Tutup Shift/i });
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }

    // Verify shift is closed and ordering might be disabled, so Buka Shift should appear again
    await expect(page.getByRole('button', { name: /Buka Shift/i }).first()).toBeVisible();
  });
});
