'use strict';

import * as fs from 'fs';
import * as util from 'util';

const readFileAsync = util.promisify(fs.readFile);

// Result line pattern: [XX%]: target/testname ... passed/failed X.XXXs
const RESULT_LINE = /\[\s*(\d+)%\]:\s+(\S+)\s+\.+\s+(passed|failed|expected failure|unexpected pass)\s+(\d+\.\d+)s/;

// Summary line pattern
const SUMMARY_LINE = /(\d+)% tests passed, (\d+) test\(s\) failed(?:, (\d+) unexpected pass\(es\))?(?:, (\d+) expected failure\(s\))? out of (\d+), spent (\d+\.\d+)s/;

// Output line pattern (-v mode): stdout/stderr/errors: content
const OUTPUT_LINE = /^(stdout|stderr|errors): (.+)$/;

export type TestStatus = 'passed' | 'failed' | 'expected failure' | 'unexpected pass';

export interface TestResult {
    name: string;           // "target/testname"
    target: string;         // "target"
    testname: string;       // "testname"
    status: TestStatus;
    duration: number;       // milliseconds
    stdout?: string;
    stderr?: string;
    errors?: string;
    logFiles?: {
        stdout?: string;
        stderr?: string;
        errors?: string;
    };
}

export interface TestReport {
    passRate: number;       // percentage (0-100)
    totalTests: number;
    passedTests: number;
    failedTests: number;
    unexpectedPasses: number;
    expectedFailures: number;
    totalDuration: number;  // milliseconds
    tests: TestResult[];
}

/**
 * Strip ANSI color escape codes from string
 */
export function stripAnsiCodes(str: string): string {
    // More comprehensive ANSI stripping that handles various formats
    return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
              .replace(/\x1b\][^\x07]*\x07/g, '')
              .replace(/\x1b\[[\d;]*m/g, '')
              .replace(/\x1b\[\d+[A-Z]/g, '');
}

/**
 * Parse xmake test output into a structured TestReport
 */
export async function parseXmakeTestOutput(output: string, useDiagnosticMode: boolean = false): Promise<TestReport> {
    // Strip ANSI color codes
    const cleanOutput = stripAnsiCodes(output);
    const lines = cleanOutput.split('\n');

    const tests = new Map<string, TestResult>();
    let currentTest: string | null = null;

    // Summary defaults
    let passRate = 0;
    let totalTests = 0;
    let failedTests = 0;
    let unexpectedPasses = 0;
    let expectedFailures = 0;
    let totalDuration = 0;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Match result line - more flexible pattern
        // Format: [XX%]: target/testname ... passed/failed X.XXXs
        const resultMatch = trimmedLine.match(/\[\s*(\d+)%\]:\s+(\S+)\s+\.+\s+(passed|failed|expected failure|unexpected pass)\s+([\d.]+)s/);
        if (resultMatch) {
            const [, percent, name, status, duration] = resultMatch;
            const parts = name.split('/');
            const target = parts[0] || '';
            const testname = parts.slice(1).join('/') || '';

            const testResult: TestResult = {
                name,
                target,
                testname,
                status: status as TestStatus,
                duration: parseFloat(duration) * 1000
            };

            tests.set(name, testResult);
            currentTest = name;
            continue;
        }

        // Match output line (-v or -D mode)
        const outputMatch = trimmedLine.match(/^(stdout|stderr|errors): (.+)$/);
        if (outputMatch && currentTest) {
            const [, kind, content] = outputMatch;
            const test = tests.get(currentTest);
            if (test) {
                // Check if this is a log file path (-D mode)
                const logMatch = content.match(/^(.+)\.(stdout|stderr|errors)\.log$/);
                if (logMatch && useDiagnosticMode) {
                    // Store log file path
                    if (!test.logFiles) test.logFiles = {};
                    const logKind = kind as keyof typeof test.logFiles;
                    test.logFiles[logKind] = content;

                    // Try to read log file content
                    try {
                        const logContent = await readFileAsync(content, 'utf-8');
                        if (kind === 'stdout') test.stdout = logContent;
                        else if (kind === 'stderr') test.stderr = logContent;
                        else if (kind === 'errors') test.errors = logContent;
                    } catch {
                        // Log file may not exist or be accessible
                    }
                } else {
                    // Direct content (-v mode)
                    if (kind === 'stdout') test.stdout = (test.stdout || '') + content + '\n';
                    else if (kind === 'stderr') test.stderr = (test.stderr || '') + content + '\n';
                    else if (kind === 'errors') test.errors = (test.errors || '') + content + '\n';
                }
            }
            continue;
        }

        // Match summary line
        const summaryMatch = trimmedLine.match(/(\d+)% tests passed, (\d+) test\(s\) failed(?:, (\d+) unexpected pass\(es\))?(?:, (\d+) expected failure\(s\))? out of (\d+), spent ([\d.]+)s/);
        if (summaryMatch) {
            const [, rate, failed, unexpected, expected, total, duration] = summaryMatch;
            passRate = parseInt(rate, 10);
            failedTests = parseInt(failed, 10);
            unexpectedPasses = unexpected ? parseInt(unexpected, 10) : 0;
            expectedFailures = expected ? parseInt(expected, 10) : 0;
            totalTests = parseInt(total, 10);
            totalDuration = parseFloat(duration) * 1000;
            continue;
        }
    }

    // Calculate passed tests
    const passedTests = totalTests - failedTests - unexpectedPasses - expectedFailures;

    return {
        passRate,
        totalTests,
        passedTests: Math.max(0, passedTests),
        failedTests,
        unexpectedPasses,
        expectedFailures,
        totalDuration,
        tests: Array.from(tests.values())
    };
}

/**
 * Parse xmake test output synchronously (for use in test result handler)
 */
export function parseXmakeTestOutputSync(output: string): TestReport {
    // Strip ANSI color codes
    const cleanOutput = stripAnsiCodes(output);
    const lines = cleanOutput.split('\n');

    const tests = new Map<string, TestResult>();
    let currentTest: string | null = null;

    // Summary defaults
    let passRate = 0;
    let totalTests = 0;
    let failedTests = 0;
    let unexpectedPasses = 0;
    let expectedFailures = 0;
    let totalDuration = 0;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Match result line
        const resultMatch = trimmedLine.match(RESULT_LINE);
        if (resultMatch) {
            const [, percent, name, status, duration] = resultMatch;
            const parts = name.split('/');
            const target = parts[0] || '';
            const testname = parts.slice(1).join('/') || '';

            const testResult: TestResult = {
                name,
                target,
                testname,
                status: status as TestStatus,
                duration: parseFloat(duration) * 1000
            };

            tests.set(name, testResult);
            currentTest = name;
            continue;
        }

        // Match output line (-v mode)
        const outputMatch = trimmedLine.match(OUTPUT_LINE);
        if (outputMatch && currentTest) {
            const [, kind, content] = outputMatch;
            const test = tests.get(currentTest);
            if (test) {
                if (kind === 'stdout') test.stdout = (test.stdout || '') + content + '\n';
                else if (kind === 'stderr') test.stderr = (test.stderr || '') + content + '\n';
                else if (kind === 'errors') test.errors = (test.errors || '') + content + '\n';
            }
            continue;
        }

        // Match summary line
        const summaryMatch = trimmedLine.match(SUMMARY_LINE);
        if (summaryMatch) {
            const [, rate, failed, unexpected, expected, total, duration] = summaryMatch;
            passRate = parseInt(rate, 10);
            failedTests = parseInt(failed, 10);
            unexpectedPasses = unexpected ? parseInt(unexpected, 10) : 0;
            expectedFailures = expected ? parseInt(expected, 10) : 0;
            totalTests = parseInt(total, 10);
            totalDuration = parseFloat(duration) * 1000;
            continue;
        }
    }

    // Calculate passed tests
    const passedTests = totalTests - failedTests - unexpectedPasses - expectedFailures;

    return {
        passRate,
        totalTests,
        passedTests: Math.max(0, passedTests),
        failedTests,
        unexpectedPasses,
        expectedFailures,
        totalDuration,
        tests: Array.from(tests.values())
    };
}
