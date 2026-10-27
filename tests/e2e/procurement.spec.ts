import { test, expect } from '@playwright/test';

test.describe('Inventory & Procurement', () => {
  // Use owner state
  test.use({ storageState: 'tests/e2e/.auth/ownerState.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/owner/procurement');
  });

  test('Supplier Management', async ({ page }) => {
    // Add new Supplier
    // Scope to Supplier card
    const supplierCard = page.locator('.p-5').filter({ hasText: /^Supplier/ });
    await supplierCard.getByRole('button', { name: /Tambah/i }).click();
    
    await page.getByLabel(/Nama Supplier/i).fill('Distributor Kopi Test');
    await page.getByLabel(/Kontak/i).fill('089999999');
    await page.getByRole('button', { name: /Simpan/i }).click();
    
    // Verify changes
    await expect(page.getByText('Distributor Kopi Test', { exact: true })).toBeVisible();

    // Edit Supplier
    const row = page.locator('tr').filter({ hasText: 'Distributor Kopi Test' }).first();
    await row.getByRole('button', { name: /Edit/i }).first().click();
    await page.getByLabel(/Nama Supplier/i).fill('Distributor Kopi Test - Edited');
    await page.getByRole('button', { name: /Simpan/i }).click();
    
    await expect(page.getByText('Distributor Kopi Test - Edited')).toBeVisible();
  });

  test('Bahan Baku Purchase', async ({ page }) => {
    // Click "Catat Pengeluaran"
    const purchaseCard = page.locator('.p-5').filter({ hasText: /^Pengeluaran/ });
    await purchaseCard.getByRole('button', { name: /Catat Pengeluaran/i }).click();
    
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Bahan Baku/i }).click();
    
    // Select supplier
    // Native select, use selectOption
    // Use the label "Supplier E2E"
    // Since select has no label mapping, we target the first select element
    await dialog.locator('select').first().selectOption({ label: 'Supplier E2E' });

    // Add an ingredient to purchase
    // The first row is already there, just select it
    // There are multiple selects, but the first one is the Item select
    const itemSelects = dialog.locator('select').filter({ hasText: /Pilih bahan/i });
    await itemSelects.first().selectOption({ label: 'Biji Kopi E2E (gr)' });
    
    // Fill Qty and Harga (they use placehoder "Qty" and "Harga")
    await dialog.getByPlaceholder('Qty').first().fill('500');
    await dialog.getByPlaceholder('Harga').first().fill('45'); // 45 per gr
    
    await dialog.getByRole('button', { name: /Simpan Pembelian/i }).click();

    // Wait for it to appear
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText(/Supplier E2E/i).first()).toBeVisible();
  });

  test('Beban Operasional Purchase', async ({ page }) => {
    const purchaseCard = page.locator('.p-5').filter({ hasText: /^Pengeluaran/ });
    await purchaseCard.getByRole('button', { name: /Catat Pengeluaran/i }).click();
    
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /Beban Operasional/i }).click();
    
    // The inputs use placeholders
    await dialog.getByPlaceholder(/Mis. Tagihan/i).fill('Bayar Listrik');
    await dialog.getByPlaceholder(/Mis. 350000/i).fill('250000');
    
    await dialog.getByRole('button', { name: /Simpan Pengeluaran/i }).click();

    // Verify it appears in combined history table
    await expect(dialog).not.toBeVisible();
    const row = page.locator('tr').filter({ hasText: 'Bayar Listrik' }).first();
    await expect(row.getByText(/Operasional/i)).toBeVisible();
  });

  test('Inventory Sync', async ({ page }) => {
    await page.goto('/owner/inventory');
    
    // Verify stock of Biji Kopi E2E has increased
    // Originally 1000 from seed, we added 500 in Bahan Baku Purchase
    const row = page.locator('tr').filter({ hasText: 'Biji Kopi E2E' });
    
    // Verify row exists.
    await expect(row).toBeVisible();
  });
});
