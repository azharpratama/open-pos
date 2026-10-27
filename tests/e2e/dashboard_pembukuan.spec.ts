import { test, expect } from '@playwright/test';

test.describe('Dashboard & Pembukuan', () => {
  // Use owner state
  test.use({ storageState: 'tests/e2e/.auth/ownerState.json' });

  test('Dashboard Metrics', async ({ page }) => {
    await page.goto('/owner');

    // Verify key metrics exist
    // Text might vary (e.g. Pendapatan, Transaksi, Omset)
    await expect(page.getByText(/Pendapatan/i).first()).toBeVisible();
    await expect(page.getByText(/Transaksi/i).first()).toBeVisible();

    // Verify chart renders (Recharts uses recharts-wrapper)
    const charts = page.locator('.recharts-wrapper').first();
    if (await charts.count() > 0) {
        await expect(charts).toBeVisible();
    }
  });

  test('Pembukuan (Ledger)', async ({ page }) => {
    await page.goto('/owner/pembukuan');

    // Filter by "Hari Ini" if there's a filter, or just verify the data
    // Assuming there's a tabs for Laba Rugi and Buku Kas
    
    // 1. Laba Rugi
    const labaRugiTab = page.getByRole('tab', { name: /Laba Rugi/i });
    if (await labaRugiTab.isVisible()) {
      await labaRugiTab.click();
    }
    
    // Verify Gross Profit and Net Profit labels exist
    await expect(page.getByText(/Laba Kotor/i).first()).toBeVisible();
    await expect(page.getByText(/Laba Bersih/i).first()).toBeVisible();

    // 2. Buku Kas
    const bukuKasTab = page.getByRole('tab', { name: /Buku Kas/i });
    if (await bukuKasTab.isVisible()) {
      await bukuKasTab.click();
      
      // Verify entries for Sales (Kas Masuk) and Purchases (Kas Keluar) exist
      // We might not have data if tests run in random order, but headers should exist
      await expect(page.getByText(/Kas Masuk|Pemasukan/i).first()).toBeVisible();
      await expect(page.getByText(/Kas Keluar|Pengeluaran/i).first()).toBeVisible();
    }
  });
});
