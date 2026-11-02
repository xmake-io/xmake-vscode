const path = require('path');

const SUITES = [
    { name: 'Compilation', file: 'compile.test.js' },
    { name: 'Unit',        file: 'test.test.js' }
];

console.log('Running all test suites...\n');

let passed = 0;
let failed = 0;
const errors = [];

for (const suite of SUITES) {
    try {
        const runTests = require(path.join(__dirname, suite.file));
        if (runTests()) {
            passed++;
        } else {
            failed++;
            errors.push(suite.name);
        }
    } catch (err) {
        console.error(`  ❌ Could not load ${suite.file}: ${err.message}\n`);
        failed++;
        errors.push(suite.name);
    }
}

if (failed === 0) {
    console.log(`✅ All tests passed! (${passed}/${SUITES.length} suites)`);
    process.exit(0);
} else {
    console.error(`❌ Some tests failed! (${passed}/${SUITES.length} suites passed)`);
    console.error(`   Failed suites: ${errors.join(', ')}`);
    process.exit(1);
}
