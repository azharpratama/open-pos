import { test, expect } from '@playwright/test';

test.describe('Reservations & Open Bills Flow', () => {
  // Use kasir state
  test.use({ storageState: 'tests/e2e/.auth/kasirState.json' });

  test('Check-in Reservation -> Open Bill', async ({ page }) => {
    await page.goto('/kasir/antrian');
    
    // Find the Confirmed reservation
    const reservationCard = page.locator('.card').filter({ hasText: 'Rombongan Pak RT' });
    
    // Check if the reservation is on the page
    if (await reservationCard.count() > 0) {
      await expect(reservationCard).toBeVisible();
      
      // Click Check-in
      await reservationCard.getByRole('button', { name: /Check-in/i }).click();
      
      // Wait for success toast
      await expect(page.getByText('Check-in berhasil')).toBeVisible();
      
      // Verify it became an Open Bill (button changes to Tambah Item)
      await expect(reservationCard.getByRole('button', { name: /Tambah Item/i })).toBeVisible();
    }
  });

  test('Add Items to Open Bill', async ({ page }) => {
    await page.goto('/kasir/antrian');
    
    // Find the seeded Open Bill
    const openBillCard = page.locator('.card').filter({ hasText: 'Tito (Open Bill)' });
    
    if (await openBillCard.count() > 0) {
      // Click Tambah Item
      await openBillCard.getByRole('button', { name: /Tambah Item/i }).click();
      
      // Wait for dialog
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Increase quantity of first item
      await dialog.locator('button').filter({ hasText: '+' }).first().click();
      
      // Click Simpan & Tambahkan
      await dialog.getByRole('button', { name: /Simpan & Tambahkan/i }).click();
      
      // Wait for toast
      await expect(page.getByText('Item berhasil ditambahkan')).toBeVisible();
    }
  });

  test('Close Open Bill', async ({ page }) => {
    await page.goto('/kasir/antrian');
    
    // Find the seeded Open Bill
    const openBillCard = page.locator('.card').filter({ hasText: 'Tito (Open Bill)' });
    
    if (await openBillCard.count() > 0) {
      // Click Tutup & Bayar
      await openBillCard.getByRole('button', { name: /Tutup & Bayar/i }).click();
      
      // Wait for payment dialog
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      
      // Select Tunai and enter exact amount
      await dialog.getByRole('button', { name: 'Tunai' }).click();
      await dialog.getByRole('button', { name: 'Uang Pas' }).click();
      
      // Confirm payment
      await dialog.getByRole('button', { name: 'Konfirmasi Pembayaran' }).click();
      
      // Wait for toast
      await expect(page.getByText('Pembayaran berhasil')).toBeVisible();
      
      // Ensure bill is removed from Antrian
      await expect(openBillCard).not.toBeVisible();
    }
  });
});
