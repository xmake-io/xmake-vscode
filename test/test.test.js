const assert = require('assert');

const PREFIX = '[unit]';

function log(msg) {
    console.log(`${PREFIX} ${msg}`);
}

function logErr(msg) {
    console.error(`${PREFIX} ${msg}`);
}

// Test testResultParser
function testResultParser() {
    log('  --- testResultParser tests ---');

    const { stripAnsiCodes, parseXmakeTestOutputSync } = require('../out/testResultParser');

    assert.strictEqual(
        stripAnsiCodes('\x1b[32;1m[ 50%]:\x1b[0m target/test1'),
        '[ 50%]: target/test1'
    );
    assert.strictEqual(
        stripAnsiCodes('\x1b[38;2;0;255;0;1m[100%]:\x1b[0m target/test1'),
        '[100%]: target/test1'
    );
    log('  ✅ stripAnsiCodes - OK');

    const output1 = `running tests ...
[ 50%]: target/test1 .............. passed 0.001s

report of tests:
[ 50%]: target/test1 .............. passed 0.001s

100% tests passed, 0 test(s) failed out of 1, spent 0.001s`;

    const report1 = parseXmakeTestOutputSync(output1);
    assert.strictEqual(report1.totalTests, 1);
    assert.strictEqual(report1.passedTests, 1);
    assert.strictEqual(report1.failedTests, 0);
    assert.strictEqual(report1.tests[0].name, 'target/test1');
    assert.strictEqual(report1.tests[0].status, 'passed');
    log('  ✅ parseXmakeTestOutputSync single test - OK');

    const output2 = `running tests ...
[ 25%]: math/add .............. passed 0.001s
[ 50%]: math/sub .............. passed 0.002s
[ 75%]: math/mul .............. failed 0.100s
[100%]: math/div .............. passed 0.001s

report of tests:
[ 25%]: math/add .............. passed 0.001s
[ 50%]: math/sub .............. passed 0.002s
[ 75%]: math/mul .............. failed 0.100s
[100%]: math/div .............. passed 0.001s

75% tests passed, 1 test(s) failed out of 4, spent 0.104s`;

    const report2 = parseXmakeTestOutputSync(output2);
    assert.strictEqual(report2.totalTests, 4);
    assert.strictEqual(report2.passedTests, 3);
    assert.strictEqual(report2.failedTests, 1);
    assert.strictEqual(report2.passRate, 75);
    log('  ✅ parseXmakeTestOutputSync multiple tests - OK');

    const output3 = `\x1b[32;1mrunning tests ...\x1b[0m
\x1b[32;1m[ 50%]:\x1b[0m target/test1 .............. \x1b[32mpassed\x1b[0m 0.001s

report of tests:
\x1b[32;1m[ 50%]:\x1b[0m target/test1 .............. \x1b[32mpassed\x1b[0m 0.001s

\x1b[32m100%\x1b[0m tests passed, \x1b[31m0\x1b[0m test(s) failed out of \x1b[1m1\x1b[0m, spent \x1b[1m0.001s\x1b[0m`;

    const report3 = parseXmakeTestOutputSync(output3);
    assert.strictEqual(report3.totalTests, 1);
    assert.strictEqual(report3.passedTests, 1);
    log('  ✅ parseXmakeTestOutputSync with ANSI codes - OK');

    const output4 = `running tests ...
[ 50%]: target/test1 .. expected failure 0.002s

report of tests:
[ 50%]: target/test1 .. expected failure 0.002s

100% tests passed, 0 test(s) failed, 1 expected failure(s) out of 1, spent 0.002s`;

    const report4 = parseXmakeTestOutputSync(output4);
    assert.strictEqual(report4.tests[0].status, 'expected failure');
    assert.strictEqual(report4.expectedFailures, 1);
    log('  ✅ parseXmakeTestOutputSync expected failure - OK');

    const output5 = `running tests ...
[ 50%]: target/test1 ... unexpected pass 0.001s

report of tests:
[ 50%]: target/test1 ... unexpected pass 0.001s

50% tests passed, 1 test(s) failed, 1 unexpected pass(es) out of 2, spent 0.001s`;

    const report5 = parseXmakeTestOutputSync(output5);
    assert.strictEqual(report5.tests[0].status, 'unexpected pass');
    assert.strictEqual(report5.unexpectedPasses, 1);
    log('  ✅ parseXmakeTestOutputSync unexpected pass - OK');
}

// Test testMacroPatterns
function testMacroPatterns() {
    log('  --- testMacroPatterns tests ---');

    const { TEST_MACRO_PATTERNS, normalizeTestName, isTestNameMatch } = require('../out/testMacroPatterns');

    assert.strictEqual(normalizeTestName('MyTest'), 'mytest');
    assert.strictEqual(normalizeTestName('Scenario: My Test'), 'my test');
    assert.strictEqual(normalizeTestName('test-name_here'), 'test name here');
    assert.strictEqual(normalizeTestName('TEST_NAME'), 'test name');
    log('  ✅ normalizeTestName - OK');

    assert.strictEqual(isTestNameMatch('test1', 'test1'), true);
    assert.strictEqual(isTestNameMatch('Test-Name', 'test_name'), true);
    assert.strictEqual(isTestNameMatch('test1', 'test2'), false);
    assert.strictEqual(isTestNameMatch('test', 'test name'), true);
    assert.strictEqual(isTestNameMatch('test name', 'test'), true);
    log('  ✅ isTestNameMatch - OK');

    const doctestPattern = TEST_MACRO_PATTERNS.find(p => p.name === 'catch2_doctest_quoted');
    doctestPattern.regex.lastIndex = 0;
    const match1 = doctestPattern.regex.exec('TEST_CASE("my test name")');
    assert.ok(match1);
    assert.strictEqual(doctestPattern.extractName(match1), 'my test name');

    doctestPattern.regex.lastIndex = 0;
    const match1b = doctestPattern.regex.exec('TEST_CASE( "with spaces" )');
    assert.ok(match1b);
    assert.strictEqual(doctestPattern.extractName(match1b), 'with spaces');
    log('  ✅ doctest TEST_CASE pattern - OK');

    const scenarioPattern = TEST_MACRO_PATTERNS.find(p => p.name === 'catch2_scenario');
    scenarioPattern.regex.lastIndex = 0;
    const matchScenario = scenarioPattern.regex.exec('SCENARIO("user logs in")');
    assert.ok(matchScenario);
    assert.strictEqual(scenarioPattern.extractName(matchScenario), 'user logs in');
    log('  ✅ doctest SCENARIO pattern - OK');

    const sectionPattern = TEST_MACRO_PATTERNS.find(p => p.name === 'section_subcase');
    sectionPattern.regex.lastIndex = 0;
    const matchSection = sectionPattern.regex.exec('SECTION("when empty")');
    assert.ok(matchSection);
    assert.strictEqual(sectionPattern.extractName(matchSection), 'when empty');

    sectionPattern.regex.lastIndex = 0;
    const matchSubcase = sectionPattern.regex.exec('SUBCASE("subcase name")');
    assert.ok(matchSubcase);
    assert.strictEqual(sectionPattern.extractName(matchSubcase), 'subcase name');
    log('  ✅ SECTION/SUBCASE pattern - OK');

    const gtestPattern = TEST_MACRO_PATTERNS.find(p => p.name === 'gtest');
    gtestPattern.regex.lastIndex = 0;
    const match2 = gtestPattern.regex.exec('TEST(MySuite, MyTest)');
    assert.ok(match2);
    assert.strictEqual(gtestPattern.extractName(match2), 'MySuite.MyTest');

    gtestPattern.regex.lastIndex = 0;
    const match2b = gtestPattern.regex.exec('TEST_F(MyFixture, MyTest)');
    assert.ok(match2b);
    assert.strictEqual(gtestPattern.extractName(match2b), 'MyFixture.MyTest');

    gtestPattern.regex.lastIndex = 0;
    const match2c = gtestPattern.regex.exec('TEST_P(MyFixture, MyTest)');
    assert.ok(match2c);
    assert.strictEqual(gtestPattern.extractName(match2c), 'MyFixture.MyTest');
    log('  ✅ gtest TEST/TEST_F/TEST_P pattern - OK');

    const boostPattern = TEST_MACRO_PATTERNS.find(p => p.name === 'boost_test');
    boostPattern.regex.lastIndex = 0;
    const match3 = boostPattern.regex.exec('BOOST_AUTO_TEST_CASE(my_test)');
    assert.ok(match3);
    assert.strictEqual(boostPattern.extractName(match3), 'my_test');
    log('  ✅ boost BOOST_AUTO_TEST_CASE pattern - OK');

    for (const pattern of TEST_MACRO_PATTERNS) {
        assert.ok(pattern.regex.global, `Pattern ${pattern.name} should have global flag`);
    }
    log('  ✅ All patterns have global flag - OK');
}

function runTests() {
    log('Running unit tests...');

    try {
        testResultParser();
        testMacroPatterns();
        log('✅ All unit tests passed!\n');
        return true;
    } catch (err) {
        logErr(`  ❌ ${err.message}`);
        logErr('❌ Some unit tests failed!\n');
        return false;
    }
}

if (require.main === module) {
    const passed = runTests();
    process.exit(passed ? 0 : 1);
}

module.exports = runTests;
