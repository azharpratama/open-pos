import { test, expect } from '@playwright/test';

test.describe('Menu & Recipe Management', () => {
  // Use owner state for the first part
  test.use({ storageState: 'tests/e2e/.auth/ownerState.json' });

  test('Create Product & Recipe Association', async ({ page, browser }) => {
    await page.goto('/owner/menu');

    // Add new Menu Item
    await page.getByRole('button', { name: /Tambah Menu|Add Menu/i }).click();
    
    // Fill details using placeholders since labels don't have htmlFor
    await page.getByPlaceholder(/Mis. Kopi/i).fill('Teh E2E');
    await page.getByPlaceholder('0').fill('10000');
    
    // Select Category
    await page.locator('select').first().selectOption({ label: 'Non-Kopi' });
    
    await page.getByRole('button', { name: /Simpan|Save/i }).click();

    // Verify it appears in the list
    await expect(page.getByText('Teh E2E').first()).toBeVisible();

    // Recipe Association
    const row = page.locator('tr').filter({ hasText: 'Teh E2E' });
    // Assuming there's a button for "Resep" or we Edit and there's a recipe section
    await row.getByRole('button', { name: /Edit|Resep/i }).first().click();
    
    // If it's a dialog with tabs
    const dialog = page.getByRole('dialog');
    if (await dialog.getByRole('tab', { name: /Resep/i }).isVisible()) {
      await dialog.getByRole('tab', { name: /Resep/i }).click();
    }

    await dialog.getByRole('button', { name: /Tambah Bahan/i }).click();
    
    // Pick an ingredient (Cup E2E)
    // The second select (or last select if multiple) is the ingredient picker
    await dialog.locator('select').last().selectOption({ index: 1 });
    
    // Set quantity
    await dialog.getByPlaceholder('Qty').last().fill('1');
    
    await dialog.getByRole('button', { name: /Simpan|Update/i }).click();

    // Wait for the success toast before verifying dialog closes
    await expect(page.getByText('Menu diperbarui').first()).toBeVisible({ timeout: 10000 });
    
    // Ensure dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    // Cashier Visibility
    // We need to switch to Cashier context to verify it's visible.
    // We can launch a new context within this test using the kasir state
    const kasirContext = await browser.newContext({ storageState: 'tests/e2e/.auth/kasirState.json' });
    const kasirPage = await kasirContext.newPage();
    
    await kasirPage.goto('/kasir/pesan');
    
    // Make sure a shift is open, otherwise ordering is disabled.
    const bukaBtn = kasirPage.getByRole('button', { name: /Buka Shift/i }).first();
    if (await bukaBtn.isVisible()) {
      await bukaBtn.click();
    }
    
    // It might be under 'Semua' or 'Non-Kopi'
    // Search for it or just look at the page
    await expect(kasirPage.getByText('Teh E2E').first()).toBeVisible();
    
    await kasirContext.close();
  });
});
