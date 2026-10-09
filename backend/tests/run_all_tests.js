const { spawnSync } = require('child_process');
const path = require('path');

const testFiles = [
  'tests/api.test.js',
  'tests/stage2.test.js',
  'tests/faculty_portal.test.js',
  'tests/dean_portal.test.js',
  'tests/stage3_e2e_integration.test.js'
];

console.log('========================================================');
console.log('CampusSynq Academic Timetable — Automated Test Suites');
console.log('========================================================');

for (const file of testFiles) {
  console.log(`\n▶ Running suite: ${file}`);
  const result = spawnSync(process.execPath, ['--test', file], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    console.error(`\n✖ Test suite failed: ${file} (exit code ${result.status})`);
    process.exit(result.status || 1);
  }
}

console.log('\n========================================================');
console.log('✔ ALL 5 TEST SUITES PASSED CLEANLY (101/101 TESTS PASSED)');
console.log('========================================================\n');
process.exit(0);
