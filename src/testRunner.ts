'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log } from './log';
import { config } from './config';
import * as process from './process';
import { getAnnotatedOutput } from './process';
import { parseXmakeTestOutput, TestReport, TestResult } from './testResultParser';
import { TEST_MACRO_PATTERNS, isTestNameMatch } from './testMacroPatterns';

/**
 * Extract JSON block from xmake Lua script output.
 * xmake may interleave print() from user rules (e.g. on_load) with the main output.
 * Strategy: try __begin__/__end__ markers first; fall back to finding first { or [.
 */
function extractJsonBlock(text: string): string | null {
    const trimmed = text.trim();
    if (!trimmed) return null;

    // Try __begin__/__end__ markers (used by some xmake versions)
    const annotated = getAnnotatedOutput(trimmed);
    if (annotated.length > 0) {
        return annotated.join('\n');
    }

    // Find JSON start (first [ or {)
    const jsonStart = trimmed.match(/[[{]/);
    if (!jsonStart) return null;

    const startIdx = jsonStart.index!;
    const startChar = jsonStart[0];
    const endChar = startChar === '[' ? ']' : '}';

    // Find last matching end character
    const endIdx = trimmed.lastIndexOf(endChar);
    if (endIdx <= startIdx) return null;

    return trimmed.slice(startIdx, endIdx + 1);
}

// Test discovery result from Lua script
interface TestDiscoverResult {
    fullname: string;
    target: string;
    name: string;
    definition?: {
        file: string;
        line: number;
    };
    sourcefiles: string[];
    scriptdir: string;
    targetfile?: string;
    group?: string;
    config: Record<string, any>;
}

// Test location for CodeLens
export interface TestLocation {
    testName: string;
    targetName: string;
    line: number;
    sourceFile: string;
    definitionFile?: string;
    definitionLine?: number;
}

// Singleton test controller
let testController: vscode.TestController | undefined;

// Event emitter for test changes
const onTestsChangedEmitter = new vscode.EventEmitter<void>();
export const onTestsChanged = onTestsChangedEmitter.event;

// Cached test data
let discoveredTests: TestDiscoverResult[] = [];

/**
 * Ensure test controller is initialized
 */
function ensureTestController(): vscode.TestController {
    if (!testController) {
        testController = vscode.tests.createTestController('xmake.tests', 'XMake Tests');

        // Set refresh handler
        (testController as any).refreshHandler = () => refreshTests();

        // Register Run profile
        testController.createRunProfile(
            'Run Tests',
            vscode.TestRunProfileKind.Run,
            (request, token) => runTestHandler(request, token),
            true
        );

        // Register Debug profile
        testController.createRunProfile(
            'Debug Tests',
            vscode.TestRunProfileKind.Debug,
            (request, token) => debugTestHandler(request, token),
            true
        );
    }
    return testController;
}

/**
 * Discover tests from xmake project
 */
export async function discoverTests(): Promise<void> {
    const controller = ensureTestController();
    const workspaceRoot = config.workingDirectory;

    if (!workspaceRoot || !fs.existsSync(path.join(workspaceRoot, 'xmake.lua'))) {
        log.info('No xmake project found, skipping test discovery');
        return;
    }

    try {
        // Execute test_discover.lua
        const result = await process.iorunv(
            config.executable,
            ['l', path.join(__dirname, '..', 'assets', 'test_discover.lua')],
            { "COLORTERM": "nocolor" },
            workspaceRoot
        );

        if (result.retval !== 0) {
            log.error(`Test discovery failed (exit ${result.retval}): ${result.stderr}`);
            return;
        }

        // Parse JSON array from output
        const cleanOutput = extractJsonBlock(result.stdout);
        if (!cleanOutput) {
            log.info(`No tests discovered (no JSON in output: "${result.stdout.slice(0, 200)}")`);
            return;
        }

        discoveredTests = JSON.parse(cleanOutput) as TestDiscoverResult[];
        log.info(`Discovered ${discoveredTests.length} tests`);
        if (discoveredTests.length === 0) {
            log.info('Zero tests returned by discovery script (no add_tests found in xmake.lua)');
        }

        // Build test item tree
        buildTestItemTree(controller, discoveredTests);

        // Notify CodeLens provider
        onTestsChangedEmitter.fire();

    } catch (err) {
        log.error(`Test discovery error: ${err}`);
    }
}

/**
 * Build test item tree from discovered tests
 */
function buildTestItemTree(controller: vscode.TestController, tests: TestDiscoverResult[]): void {
    // Clear existing items
    controller.items.replace([]);

    // Group tests by target
    const targetGroups = new Map<string, TestDiscoverResult[]>();
    for (const test of tests) {
        const targetName = test.target;
        if (!targetGroups.has(targetName)) {
            targetGroups.set(targetName, []);
        }
        targetGroups.get(targetName)!.push(test);
    }

    // Create test items
    for (const [targetName, targetTests] of targetGroups) {
        // Create target node
        const targetItem = controller.createTestItem(
            `target:${targetName}`,
            targetName,
            undefined
        );
        controller.items.add(targetItem);

        // Create test nodes under target
        for (const test of targetTests) {
            // Find the correct source file and line number by searching for test macros
            const location = findTestMacroInSourceFiles(test);

            const testItem = controller.createTestItem(
                test.fullname,
                test.name,
                location?.uri
            );

            // Set range if we found the test macro
            if (location?.range) {
                testItem.range = location.range;
            }

            // Store test data as description
            testItem.description = test.target;

            targetItem.children.add(testItem);
        }
    }
}

/**
 * Find test macro in source files to get correct URI and line number
 */
function findTestMacroInSourceFiles(test: TestDiscoverResult): { uri: vscode.Uri; range: vscode.Range } | undefined {
    // Search in source files for test macro definitions
    for (const sourceFile of test.sourcefiles) {
        // Only search in C/C++ files
        const ext = path.extname(sourceFile).toLowerCase();
        if (!['.c', '.cpp', '.cc', '.cxx', '.hpp', '.h'].includes(ext)) {
            continue;
        }

        try {
            if (!fs.existsSync(sourceFile)) {
                continue;
            }

            const content = fs.readFileSync(sourceFile, 'utf-8');
            const lines = content.split('\n');

            // Search for test macros that match the test name
            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];

                for (const pattern of TEST_MACRO_PATTERNS) {
                    pattern.regex.lastIndex = 0;
                    let match: RegExpExecArray | null;

                    while ((match = pattern.regex.exec(line)) !== null) {
                        const macroName = pattern.extractName(match);

                        // Check if the macro name matches the test name
                        if (isTestNameMatch(test.fullname, macroName) ||
                            isTestNameMatch(`${test.target}/${test.name}`, macroName) ||
                            isTestNameMatch(test.name, macroName)) {
                            return {
                                uri: vscode.Uri.file(sourceFile),
                                range: new vscode.Range(
                                    new vscode.Position(lineIndex, 0),
                                    new vscode.Position(lineIndex, 0)
                                )
                            };
                        }
                    }
                }
            }
        } catch (err) {
            // Skip files that can't be read
            log.verbose(`Could not read source file ${sourceFile}: ${err}`);
        }
    }

    // Fallback: use the first source file if no macro found
    if (test.sourcefiles.length > 0) {
        return {
            uri: vscode.Uri.file(test.sourcefiles[0]),
            range: new vscode.Range(0, 0, 0, 0)
        };
    }

    return undefined;
}

/**
 * Run test handler
 */
async function runTestHandler(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
): Promise<void> {
    const controller = ensureTestController();
    const run = controller.createTestRun(request);

    // Focus Test Results panel so user sees results immediately
    try {
        vscode.commands.executeCommand('workbench.panel.testResults.view.focus');
    } catch {
        try {
            vscode.commands.executeCommand('workbench.view.testing');
        } catch {
            // ignore
        }
    }

    try {
        // Get tests to run, expanding suite nodes to their children
        const testsToRun: vscode.TestItem[] = [];
        const itemsToProcess = request.include || getAllTestItems(controller);

        for (const item of itemsToProcess) {
            if (item.children.size > 0) {
                // This is a suite node, expand to leaf tests
                collectLeafTests(item, testsToRun);
            } else {
                // This is a leaf test
                testsToRun.push(item);
            }
        }

        // Build target(s) before running tests to ensure test binaries exist
        try {
            // collect unique target names from test ids (format: "targetname/testname")
            const targets = new Map<string, boolean>();
            testsToRun.forEach(t => targets.set(t.id.split('/')[0], true));
            const targetList = Array.from(targets.keys());
            const buildArgs = targetList.length === 1 ? ['build', targetList[0]] : ['build', '-a'];
            await process.iorunv(
                config.executable,
                buildArgs,
                {},
                config.workingDirectory
            );
        } catch (err) {
            for (const test of testsToRun) {
                run.errored(test, new vscode.TestMessage(`Build failed before running tests: ${err}`));
            }
            return;
        }

        // Mark all tests as started
        for (const test of testsToRun) {
            run.started(test);
        }

        // If running a single test, pass the test name; otherwise run all (xmake handles parallelism)
        const testName = testsToRun.length === 1 ? testsToRun[0].id : undefined;

        try {
            const result = await executeTest(testName, false, token);

            // Update each test with its result
            for (const test of testsToRun) {
                if (token.isCancellationRequested) {
                    run.skipped(test);
                    continue;
                }
                updateTestResult(run, test, result);
            }
        } catch (err) {
            if (err instanceof Error && err.message === 'Test execution cancelled') {
                for (const test of testsToRun) {
                    run.skipped(test);
                }
            } else {
                for (const test of testsToRun) {
                    run.errored(test, new vscode.TestMessage(`Test execution failed: ${err}`));
                }
            }
        }
    } finally {
        run.end();
    }
}

/**
 * Collect all leaf tests from a test item (recursively)
 */
function collectLeafTests(item: vscode.TestItem, result: vscode.TestItem[]): void {
    if (item.children.size === 0) {
        result.push(item);
    } else {
        item.children.forEach(child => collectLeafTests(child, result));
    }
}

/**
 * Debug test handler
 */
async function debugTestHandler(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken
): Promise<void> {
    const controller = ensureTestController();
    const run = controller.createTestRun(request);

    let test: vscode.TestItem | undefined;

    try {
        // expand suite nodes to leaf tests
        const testsToDebug: vscode.TestItem[] = [];
        const itemsToProcess = request.include || getAllTestItems(controller);
        for (const item of itemsToProcess) {
            if (item.children.size > 0) {
                collectLeafTests(item, testsToDebug);
            } else {
                testsToDebug.push(item);
            }
        }

        if (testsToDebug.length === 0) {
            return;
        }

        test = testsToDebug[0];
        run.started(test);

        const testInfo = discoveredTests.find(t => t.fullname === test.id);
        if (!testInfo) {
            run.errored(test, new vscode.TestMessage(`Test not found: ${test.id}`));
            return;
        }

        // delegate to xmake.onDebug for consistent debug behavior (mode switch, build, launch)
        await vscode.commands.executeCommand('xmake.onDebug', testInfo.target);
    } catch (err) {
        log.error(`Debug test failed: ${err}`);
        if (test) {
            run.errored(test, new vscode.TestMessage(`Debug failed: ${err}`));
        }
    } finally {
        run.end();
    }
}

/**
 * Execute test(s)
 * @param testName - Specific test name to run, or undefined to run all tests
 */
async function executeTest(testName: string | undefined, useDiagnosticMode: boolean, token?: vscode.CancellationToken): Promise<TestReport> {
    // Use Lua script for structured JSON output instead of parsing text
    const scriptPath = path.join(__dirname, '..', 'assets', 'test_run.lua');

    // Build args - pass test name if specified, otherwise run all tests
    const args = ['l', scriptPath];
    if (testName) {
        args.push(testName);
    }

    // Use cancellation-aware execution
    const result = await process.iorunvWithCancel(
        config.executable,
        args,
        { "COLORTERM": "nocolor" },
        config.workingDirectory,
        token
    );

    // Parse JSON from output (our script prints JSON last)
    const cleanOutput = extractJsonBlock(result.stdout);
    if (!cleanOutput) {
        return {
            passRate: 0,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            unexpectedPasses: 0,
            expectedFailures: 0,
            totalDuration: 0,
            tests: []
        };
    }

    try {
        const report = JSON.parse(cleanOutput);

        // Convert to TestReport format
        const tests: TestResult[] = (report.tests || []).map((t: any) => ({
            name: t.name,
            target: t.target || '',
            testname: t.name.split('/').slice(1).join('/'),
            status: t.passed ?
                (t.should_fail ? 'unexpected pass' : 'passed') :
                (t.should_fail ? 'expected failure' : 'failed'),
            duration: (t.spent || 0),
            stdout: t.stdout,
            stderr: t.stderr,
            errors: t.errors || ''
        }));

        return {
            passRate: report.passed_rate || 0,
            totalTests: report.total || 0,
            passedTests: report.passed || 0,
            failedTests: (report.total || 0) - (report.passed || 0),
            unexpectedPasses: tests.filter(t => t.status === 'unexpected pass').length,
            expectedFailures: tests.filter(t => t.status === 'expected failure').length,
            totalDuration: report.spent || 0,
            tests
        };
    } catch (err) {
        log.error(`Failed to parse test JSON: ${err}`);
        // Fallback to text parsing
        return parseXmakeTestOutput(result.stdout, useDiagnosticMode);
    }
}

/**
 * Update test result in run
 */
function updateTestResult(run: vscode.TestRun, test: vscode.TestItem, report: TestReport): void {
    // Find the specific test result
    const testResult = report.tests.find(t => t.name === test.id);

    if (!testResult) {
        run.errored(test, new vscode.TestMessage('Test result not found in output'));
        return;
    }

    const duration = testResult.duration;

    // Append raw output to test
    // VSCode Test Output expects \r\n line endings
    // See: https://code.visualstudio.com/api/extension-guides/testing#test-output
    let output = '';
    if (testResult.stdout) {
        output += testResult.stdout;
    }
    if (testResult.stderr) {
        output += testResult.stderr;
    }
    if (testResult.errors) {
        output += testResult.errors;
    }

    if (output) {
        // Normalize line endings to \r\n as expected by VSCode Test Output
        output = output.replace(/\r?\n/g, '\r\n');

        if (test.uri && test.range) {
            run.appendOutput(output, new vscode.Location(test.uri, test.range.end), test);
        } else {
            run.appendOutput(output, undefined, test);
        }
    }

    // Update test status
    const errMsg = (testResult.errors || '').replace(/\r?\n/g, '\r\n');

    switch (testResult.status) {
        case 'passed':
            run.passed(test, duration);
            break;
        case 'failed':
            run.failed(test, new vscode.TestMessage(errMsg || 'Test failed'), duration);
            break;
        case 'expected failure':
            run.passed(test, duration);
            break;
        case 'unexpected pass':
            run.failed(test, new vscode.TestMessage('Test unexpectedly passed'), duration);
            break;
    }
}

/**
 * Get all test items from controller
 */
function getAllTestItems(controller: vscode.TestController): vscode.TestItem[] {
    const result: vscode.TestItem[] = [];

    function walk(collection: vscode.TestItemCollection): void {
        const items: vscode.TestItem[] = [];
        collection.forEach(item => items.push(item));
        for (const item of items) {
            if (item.children.size === 0) {
                result.push(item);
            } else {
                walk(item.children);
            }
        }
    }

    walk(controller.items);
    return result;
}

/**
 * Refresh tests
 */
export async function refreshTests(): Promise<void> {
    await discoverTests();
}

/**
 * Find test item by name (supports fuzzy matching)
 */
function findTestItemByName(controller: vscode.TestController, testName: string): vscode.TestItem | undefined {
    let found: vscode.TestItem | undefined;

    // First try exact match on id
    controller.items.forEach(target => {
        target.children.forEach(test => {
            if (test.id === testName) {
                found = test;
            }
        });
    });
    if (found) return found;

    // Try match on label (test name without target prefix)
    controller.items.forEach(target => {
        target.children.forEach(test => {
            if (test.label === testName) {
                found = test;
            }
        });
    });
    if (found) return found;

    // Try fuzzy match - bi-directional containment
    const normalizedName = testName.toLowerCase();
    controller.items.forEach(target => {
        target.children.forEach(test => {
            const normId = test.id.toLowerCase();
            const normLabel = test.label.toLowerCase();
            if (!found && (normId.includes(normalizedName) ||
                normLabel.includes(normalizedName) ||
                normalizedName.includes(normId) ||
                normalizedName.includes(normLabel))) {
                found = test;
            }
        });
    });

    return found;
}

/**
 * Find test item whose source files contain the given file path.
 * This bridges gtest macro names (e.g. "expected.transform") to xmake test items
 * by matching the source file where the macro was found.
 */
function findTestItemBySourceFile(controller: vscode.TestController, sourceFile: string): vscode.TestItem | undefined {
    const normalizedTarget = sourceFile.toLowerCase().replace(/\\/g, '/');

    for (const test of discoveredTests) {
        const matches = test.sourcefiles.some(sf =>
            sf.toLowerCase().replace(/\\/g, '/') === normalizedTarget
        );
        if (matches) {
            return findTestItemByName(controller, test.fullname);
        }
    }
    return undefined;
}

/**
 * Run a specific test by name (from CodeLens macro)
 */
export async function runTest(testName: string, sourceFile?: string): Promise<void> {
    const controller = ensureTestController();

    // Find the test item (supports fuzzy matching)
    let testItem = findTestItemByName(controller, testName);

    if (!testItem) {
        // Discovery may not have happened yet; trigger it and retry
        await discoverTests();
        testItem = findTestItemByName(controller, testName);
    }

    if (!testItem && sourceFile) {
        // gtest macro name (e.g. "expected.transform") may not match xmake test name
        // (e.g. "expected_test"). Match by source file instead.
        testItem = findTestItemBySourceFile(controller, sourceFile);
    }

    if (!testItem) {
        vscode.window.showErrorMessage(`Test not found: ${testName}`);
        return;
    }

    // Create a request for this specific test
    const request = new vscode.TestRunRequest([testItem]);
    await runTestHandler(request, new vscode.CancellationTokenSource().token);
}

/**
 * Debug a specific test by name (from CodeLens macro)
 */
export async function debugTest(testName: string, sourceFile?: string): Promise<void> {
    const controller = ensureTestController();

    // Find the test item (supports fuzzy matching)
    let testItem = findTestItemByName(controller, testName);

    if (!testItem) {
        // Discovery may not have happened yet; trigger it and retry
        await discoverTests();
        testItem = findTestItemByName(controller, testName);
    }

    if (!testItem && sourceFile) {
        // gtest macro name may not match xmake test name; match by source file
        testItem = findTestItemBySourceFile(controller, sourceFile);
    }

    if (!testItem) {
        vscode.window.showErrorMessage(`Test not found: ${testName}`);
        return;
    }

    // Create a request for this specific test
    const request = new vscode.TestRunRequest([testItem]);
    await debugTestHandler(request, new vscode.CancellationTokenSource().token);
}

/**
 * Get discovered tests (for CodeLens)
 */
export function getDiscoveredTests(): TestDiscoverResult[] {
    return discoveredTests;
}

/**
 * Dispose test controller
 */
export function disposeTestController(): void {
    if (testController) {
        testController.dispose();
        testController = undefined;
    }
    onTestsChangedEmitter.dispose();
}
