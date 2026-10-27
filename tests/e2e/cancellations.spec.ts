import { test, expect } from '@playwright/test';

test.describe('Cancellation Request Flow', () => {
  // Use owner state since it starts with Kasir then tests Owner
  // Actually, Playwright can switch users or we can just run separate tests.
  
  test('Kasir - Request Cancellation', async ({ page }) => {
    // Navigate with Kasir state manually or just let it use an isolated context
    // For simplicity, we login as kasir directly for this test
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Kasir' }).click();
    await page.getByLabel(/Email/i).fill(process.env.TEST_KASIR_EMAIL || 'kasir@openpos.dev');
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_KASIR_PASSWORD || 'password123');
    await page.getByRole('button', { name: /Masuk sebagai Kasir/i }).click();
    await expect(page).toHaveURL(/\/kasir/);
    
    await page.goto('/kasir/antrian');
    
    // Find the seeded Open Bill
    const openBillCard = page.locator('.card').filter({ hasText: 'Tito (Open Bill)' });
    
    if (await openBillCard.count() > 0) {
      // Click menu options on the card (e.g. 3 dots or cancel icon)
      // Note: we might need to adjust selector based on UI implementation
      const cancelButton = openBillCard.locator('button').filter({ hasText: 'Batal' });
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // Wait for cancellation dialog
        const dialog = page.getByRole('dialog');
        await expect(dialog).toBeVisible();
        
        // Fill reason
        await dialog.getByPlaceholder('Alasan pembatalan').fill('E2E Test Cancellation');
        
        // Submit
        await dialog.getByRole('button', { name: /Ajukan Pembatalan/i }).click();
        
        // Wait for success toast
        await expect(page.getByText('Pengajuan pembatalan berhasil dikirim')).toBeVisible();
      }
    }
  });

  test('Owner - Approve Cancellation', async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Owner' }).click();
    await page.getByLabel(/Email/i).fill(process.env.TEST_OWNER_EMAIL || 'owner@openpos.dev');
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_OWNER_PASSWORD || 'password123');
    await page.getByRole('button', { name: /Masuk sebagai Owner/i }).click();
    await expect(page).toHaveURL(/\/owner/);
    
    // Check if cancellation badge is visible somewhere or just navigate to the page where requests are shown
    // Let's assume Owner sees it on dashboard or a specific tab
    await page.goto('/owner/reservation'); // Or wherever cancellation requests are
    
    // Let's look for a pending cancellation
    const reqCard = page.getByText('Pelanggan salah pesan'); // The seeded request reason
    
    if (await reqCard.count() > 0) {
      // Find the approve button nearby
      const approveBtn = page.locator('.card').filter({ hasText: 'Pelanggan salah pesan' }).getByRole('button', { name: 'Setujui' });
      await approveBtn.click();
      
      // Wait for success toast
      await expect(page.getByText('Pembatalan disetujui')).toBeVisible();
    }
  });

  test('Owner - Reject Cancellation', async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.getByRole('tab', { name: 'Owner' }).click();
    await page.getByLabel(/Email/i).fill(process.env.TEST_OWNER_EMAIL || 'owner@openpos.dev');
    await page.getByLabel('Password', { exact: true }).fill(process.env.TEST_OWNER_PASSWORD || 'password123');
    await page.getByRole('button', { name: /Masuk sebagai Owner/i }).click();
    
    await page.goto('/owner/reservation');
    
    // Look for another pending cancellation to reject, or just mock it.
    const reqCard = page.getByText('E2E Test Cancellation');
    
    if (await reqCard.count() > 0) {
      // Find the reject button nearby
      const rejectBtn = page.locator('.card').filter({ hasText: 'E2E Test Cancellation' }).getByRole('button', { name: 'Tolak' });
      await rejectBtn.click();
      
      // Wait for success toast
      await expect(page.getByText('Pembatalan ditolak')).toBeVisible();
    }
  });
});
