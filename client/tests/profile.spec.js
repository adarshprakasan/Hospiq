import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('profile edits, BMI, imports, privacy and logout work on mobile', async ({ page }) => {
  const user = { id: '507f1f77bcf86cd799439011', name: 'Test Patient', role: 'patient', email: 'patient@example.test' };
  let profile = { ...user, preferredName: '', phone: '', publicId: 'PAT-test', measurements: null, photo: null, savedDoctorIds: [], savedHospitalIds: [] };
  let revoked = false;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(user => { localStorage.setItem('token', 'test'); localStorage.setItem('user', JSON.stringify(user)); }, user);
  await page.route('http://127.0.0.1:5000/api/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    const method = route.request().method();
    if (path === '/auth/me') return route.fulfill({ json: user });
    if (path === '/family') return route.fulfill({ json: { profiles: [], granted: [] } });
    if (path === '/profile/me/saved') return route.fulfill({ json: { doctors: [], hospitals: [] } });
    if (path === '/auth/sign-out') { revoked = true; return route.fulfill({ status: 204 }); }
    if (method === 'PUT') {
      const body = route.request().postDataJSON();
      profile = path.endsWith('/measurements') ? { ...profile, measurements: body } : { ...profile, ...body };
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: profile });
  });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
  await page.getByLabel('Full name', { exact: false }).fill('Updated Patient');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByText('Profile details saved.')).toBeVisible();
  await page.getByLabel('Date of birth').fill('1990-04-20');
  await page.getByLabel('Address', { exact: true }).fill('Test Address');
  await page.getByRole('button', { name: 'Save personal information' }).click();
  await expect(page.getByText('Personal information saved.')).toBeVisible();
  await page.getByRole('tab', { name: 'Health & measurements' }).click();
  await page.getByLabel('Height (cm)').fill('180');
  await page.getByLabel('Weight (kg)').fill('81');
  await expect(page.getByText('BMI: 25.0 kg/m²')).toBeVisible();
  await page.getByRole('button', { name: 'Save measurements' }).click();
  await expect(page.getByText('Measurements saved.')).toBeVisible();
  await page.locator('input[type=file]').setInputFiles({ name: 'measurements.csv', mimeType: 'text/csv', buffer: Buffer.from('height_cm,weight_kg\n,70\n') });
  await expect(page.getByLabel('Height (cm)')).toHaveValue('');
  await expect(page.getByLabel('Weight (kg)')).toHaveValue('70');
  await page.locator('input[type=file]').setInputFiles({ name: 'measurements.csv', mimeType: 'text/csv', buffer: Buffer.from('height_cm,weight_kg\n999,70\n') });
  await expect(page.getByText('Imported measurements must be', { exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'Saved care' }).click();
  await expect(page.getByRole('heading', { name: 'Saved doctors' })).toBeVisible();
  await page.getByRole('tab', { name: 'Privacy & security' }).click();
  await expect(page.getByRole('button', { name: 'Download profile data' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations.filter(v => ['critical', 'serious'].includes(v.impact))).toEqual([]);
  await page.getByRole('tab', { name: 'Account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(revoked).toBe(true);
});
