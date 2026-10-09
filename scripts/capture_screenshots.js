const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function loginAndGetToken(email, password) {
  const res = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error(`Login failed for ${email}: ${data.message}`);
  }
  return data.data.token;
}

async function main() {
  console.log('Obtaining authenticated tokens for capture sessions...');
  const adminToken = await loginAndGetToken('admin@campussynq.com', 'AdminPassword2026!');
  const deanToken = await loginAndGetToken('dean@campussynq.com', 'Password123');
  const facultyToken = await loginAndGetToken('subu@campussynq.com', 'password@123');

  console.log('Launching Chrome browser...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });

  const page = await context.newPage();

  // 1. Standard Login Page
  console.log('Capturing: Standard Login Page...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'login-page.png') });

  // 2. Dean Login Page
  console.log('Capturing: Dean Login Page...');
  await page.goto('http://localhost:5173/dean/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'dean-login.png') });

  // Helper to set session and navigate
  async function captureWithToken(token, url, filename, waitSelector) {
    console.log(`Capturing: ${filename} (${url})...`);
    await page.goto('http://localhost:5173/login');
    await page.evaluate((t) => {
      localStorage.setItem('campus_synq_token', t);
    }, token);
    await page.goto(`http://localhost:5173${url}`, { waitUntil: 'networkidle' });
    if (waitSelector) {
      try {
        await page.waitForSelector(waitSelector, { timeout: 5000 });
      } catch (e) {
        console.warn(`Selector ${waitSelector} timed out, proceeding with timeout.`);
      }
    }
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
  }

  // 3. Admin Dashboard
  await captureWithToken(adminToken, '/admin/dashboard', 'admin-dashboard.png', '.dashboard-stats');

  // 4. Admin Faculty Management
  await captureWithToken(adminToken, '/admin/faculty', 'admin-faculty.png', '.faculty-table, .faculty-card, table');

  // 5. Admin Timetable Management
  await captureWithToken(adminToken, '/admin/timetable', 'admin-timetable.png', '.timetable-grid, table');

  // 6. Dean Dashboard
  await captureWithToken(deanToken, '/dean/dashboard', 'dean-dashboard.png', '.dp-summary-grid');

  // 7. Dean Class Search
  await captureWithToken(deanToken, '/dean/class-search', 'dean-class-search.png', '.dp-search-panel, .dp-card');

  // 8. Dean Room Search
  await captureWithToken(deanToken, '/dean/room-search', 'dean-room-search.png', '.dp-search-panel, .dp-card');

  // 9. Dean Faculty Search
  await captureWithToken(deanToken, '/dean/faculty-search', 'dean-faculty-search.png', '.dp-search-panel, .dp-card');

  // 10. Dean Free Rooms
  await captureWithToken(deanToken, '/dean/free-rooms', 'dean-free-rooms.png', '.dp-search-panel, .dp-card');

  // 11. Dean Current Status
  await captureWithToken(deanToken, '/dean/current-status', 'dean-current-status.png', '.dp-search-panel, .dp-card');

  // 12. Dean Substitutions
  await captureWithToken(deanToken, '/dean/substitutions', 'dean-substitutions.png', '.dp-card');

  // 13. Faculty Dashboard
  await captureWithToken(facultyToken, '/faculty/dashboard', 'faculty-dashboard.png', '.faculty-card, .dashboard-stats, .card');

  // 14. Faculty Weekly Schedule
  await captureWithToken(facultyToken, '/faculty/weekly', 'faculty-weekly-timetable.png', '.timetable-grid, table, .weekly-card');

  // 15. Faculty Substitutions
  await captureWithToken(facultyToken, '/faculty/substitutions', 'faculty-substitutions.png', '.substitution-card, .card');

  console.log('All screenshots captured successfully!');
  await browser.close();
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
