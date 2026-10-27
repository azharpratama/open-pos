import { test, expect } from '@playwright/test';

test.describe('Karyawan & Payroll', () => {
  // Use owner state
  test.use({ storageState: 'tests/e2e/.auth/ownerState.json' });

  test('Add Employee & Shift Visibility', async ({ page }) => {
    await page.goto('/owner/karyawan');

    // Add new employee
    await page.getByRole('button', { name: /Tambah Karyawan|Add Employee/i }).click();
    
    await page.getByPlaceholder(/Mis. Tito/i).fill('Barista E2E');
    await page.getByPlaceholder('0812...').fill('0822222');
    await page.getByPlaceholder(/BCA/i).fill('BCA');
    await page.getByPlaceholder('1234567890').fill('999888');
    await page.getByPlaceholder('0').last().fill('80000');
    
    await page.getByRole('button', { name: /Simpan|Save/i }).click();

    // Verify appears in list
    await expect(page.getByText('Barista E2E').first()).toBeVisible();

    // Shift Assignment Visibility
    await page.goto('/owner/shift');
    
    // Click today's date on the calendar
    await page.locator('button.ring-primary').first().click();
    
    // Verify the new employee is in the checkbox list
    await expect(page.getByLabel(/Barista E2E/i).first()).toBeVisible();
  });

});
