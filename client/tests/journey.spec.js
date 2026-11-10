import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const patient = { _id: '507f1f77bcf86cd799439011', name: 'Fictional Patient', email: 'patient@test.invalid', role: 'patient' };
const hospital = { _id: '507f1f77bcf86cd799439012', name: 'Fictional Clinic', type: 'Clinic', address: 'Test Street', departments: ['General'] };
const doctor = { _id: '507f1f77bcf86cd799439013', name: 'Fictional Doctor', department: 'General', hospitalId: hospital._id, availabilityStatus: 'available', qualifications: ['Test qualification'] };
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
const visit = { _id: '507f1f77bcf86cd799439014', patientId: patient._id, patientName: patient.name, doctorId: doctor._id, doctorName: doctor.name, hospitalId: hospital._id, hospitalName: hospital.name, departmentName: 'General', tokenNumber: 4, date: today, status: 'pending', isToday: true };
async function fixture(page, user = patient) {
  if (user) await page.addInitScript(user => { localStorage.setItem('token', 'fictional-browser-test-token'); localStorage.setItem('user', JSON.stringify(user)); }, user);
  await page.route('http://127.0.0.1:5000/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname.replace('/api', '');
    let data = [];
    if (pathname === '/profile/me/saved') return route.fulfill({ json: { doctors: [], hospitals: [] } });
    if (pathname === '/family') data = { profiles: [], granted: [] };
    else if (pathname === '/auth/me') data = user;
    else if (pathname === '/hospitals') data = [hospital];
    else if (pathname === `/hospitals/${hospital._id}`) data = hospital;
    else if (pathname.startsWith('/doctors/hospital/')) data = [doctor];
    else if (pathname.startsWith('/schedule/')) data = { weeklySchedule: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => ({ day, startTime: '09:00', endTime: '18:00', isAvailable: true })), closedDates: [] };
    else if (pathname === '/tokens/my') data = [{ ...visit, status: 'called', checkedInAt: new Date().toISOString() }];
    else if (pathname === '/operations/metrics') data = { waiting: { minutes: null, sample: 0 }, consultation: { minutes: null, sample: 0 }, pharmacy: { minutes: null, sample: 0 }, counts: {} };
    else if (pathname === '/doctors/me') data = doctor;
    else if (pathname === '/tokens/mine') data = [visit];
    else if (pathname === '/qr/me') data = { visits: [{ tokenId: visit._id, qrValue: 'fictional-visit-code' }] };
    else if (pathname === `/records/patient/${patient._id}/access`) data = { patient: { name: patient.name }, canRequest: true, fullAccess: false };
    else if (pathname === `/records/patient/${patient._id}`) data = { items: [], total: 0 };
    await route.fulfill({ json: data });
  });
}
test('public provider discovery preserves the doctor selection through sign-in', async ({ page }) => {
  await fixture(page, null);
  await page.goto('/find-care');
  await page.getByRole('link', { name: 'View doctors and availability' }).click();
  await page.getByRole('button', { name: 'Choose doctor' }).click();
  await expect(page.getByText('Consultation hours:', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in to book' }).click();
  await expect(page).toHaveURL(/login\?returnTo=/);
  await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible();
});
test('mobile patient can show a visit QR without leaving the appointment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await page.goto('/my-tokens');
  await page.getByRole('button', { name: 'Show visit QR' }).click();
  await expect(page.getByText('Show this code to your treating doctor.')).toBeVisible();
  await expect(page).toHaveURL(/my-tokens$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(result.violations.filter(v => ['critical', 'serious'].includes(v.impact))).toEqual([]);
  await expect(page.getByText('Myself — Fictional Patient', { exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/mobile-appointments.png', fullPage: true });
});
test('doctor saves a draft without finalizing the consultation', async ({ page }) => {
  await fixture(page, { ...patient, role: 'doctor', name: doctor.name, hospitalId: hospital._id });
  let submitted;
  await page.route('http://127.0.0.1:5000/api/records/add', async route => {
    const body = route.request().postData(); submitted = body;
    await route.fulfill({ status: 201, json: { visitCompleted: false, record: { _id: 'draft', status: 'draft', medications: [] } } });
  });
  await page.goto(`/patients/${patient._id}/records`);
  await page.getByRole('button', { name: '+ Record this visit' }).click();
  await page.getByLabel('Visit notes').fill('Fictional draft notes');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByText('Draft saved. Resume it from the record below.')).toBeVisible();
  expect(submitted).toContain('"status":"draft"');
});

test('Arabic switches layout direction without losing an unfinished form', async ({ page }) => {
  await fixture(page, null);
  await page.goto('/login');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('fictional@example.test');
  await page.getByRole('button', { name: 'Change language' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('textbox', { name: 'البريد الإلكتروني', exact: true })).toHaveValue('fictional@example.test');
  await expect(page.getByRole('button', { name: 'تسجيل الدخول', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/arabic-login.png', fullPage: true });
});

test('clinician opens patient history while keeping the queue visible', async ({ page }) => {
  await fixture(page, { ...patient, role: 'doctor', name: doctor.name, hospitalId: hospital._id });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Notes / history' }).click();
  await expect(page.getByRole('navigation', { name: 'Clinical queue' })).toBeVisible();
  await expect(page.getByRole('button', { name: '+ Record this visit' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to queue' }).click();
  await expect(page.getByRole('navigation', { name: 'Clinical queue' })).not.toBeVisible();
});

test('patient reviews a health export and saves the calculated BMI inputs', async ({ page }) => {
  await fixture(page);
  let measurements = null;
  await page.route('http://127.0.0.1:5000/api/profile/me', route => route.fulfill({
    json: { ...patient, publicId: 'HQ-PATIENT', phone: '', preferredName: '', measurements },
  }));
  await page.route('http://127.0.0.1:5000/api/profile/me/measurements', route => {
    measurements = route.request().postDataJSON();
    return route.fulfill({ status: 204 });
  });
  await page.goto('/profile?section=health');
  await page.locator('input[accept=".xml,.csv"]').setInputFiles({
    name: 'export.xml', mimeType: 'application/xml',
    buffer: Buffer.from('<HealthData><Record type="HKQuantityTypeIdentifierHeight" value="1.8" unit="m" endDate="2026-11-01 12:00:00 +0400"/><Record type="HKQuantityTypeIdentifierBodyMass" value="72" unit="kg" endDate="2026-11-01 12:00:00 +0400"/></HealthData>'),
  });
  await expect(page.getByText('BMI: 22.2 kg/m²')).toBeVisible();
  expect(measurements).toBeNull();
  await page.getByRole('button', { name: 'Save measurements' }).click();
  await expect(page.getByText('Measurements saved.')).toBeVisible();
  expect(measurements).toEqual({ heightCm: 180, weightKg: 72, source: 'apple-export' });
});
