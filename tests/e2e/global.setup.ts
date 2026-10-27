import { chromium, type FullConfig } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

async function globalSetup(config: FullConfig) {
  // Ensure the database is in a clean state before running the suite
  console.log('Seeding the E2E database...');
  execSync('npm run seed:e2e', { stdio: 'inherit' });
  console.log('Seed complete.');

  const authDir = path.join(__dirname, '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  
  // Kasir Login
  const kasirContext = await browser.newContext();
  const kasirPage = await kasirContext.newPage();
  await kasirPage.goto(baseURL + '/login');
  // Assume default test credentials, or use env vars
  await kasirPage.fill('input[type="email"]', process.env.TEST_KASIR_EMAIL || 'kasir@openpos.dev');
  await kasirPage.fill('input[type="password"]', process.env.TEST_KASIR_PASSWORD || 'password123');
  await kasirPage.getByRole('tab', { name: 'Kasir' }).click(); 
  await kasirPage.getByRole('button', { name: /Masuk sebagai Kasir/i }).click();
  // Wait for redirect to /kasir/pesan or /kasir/shift
  await kasirPage.waitForURL(/\/kasir/);
  await kasirContext.storageState({ path: path.join(__dirname, '.auth/kasirState.json') });
  await kasirContext.close();

  // Owner Login
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(baseURL + '/login');
  // Switch to Owner tab
  await ownerPage.getByRole('tab', { name: 'Owner' }).click(); 
  await ownerPage.fill('input[type="email"]', process.env.TEST_OWNER_EMAIL || 'owner@openpos.dev');
  await ownerPage.fill('input[type="password"]', process.env.TEST_OWNER_PASSWORD || 'password123');
  await ownerPage.getByRole('button', { name: /Masuk sebagai Owner/i }).click();
  // Wait for redirect to /owner
  await ownerPage.waitForURL(/\/owner/);
  await ownerContext.storageState({ path: path.join(__dirname, '.auth/ownerState.json') });
  await ownerContext.close();

  await browser.close();
}

export default globalSetup;
