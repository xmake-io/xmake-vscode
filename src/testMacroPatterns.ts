'use strict';

/**
 * Test macro pattern definition
 */
export interface TestMacroPattern {
    name: string;
    framework: string;
    regex: RegExp;
    extractName: (match: RegExpExecArray) => string;
}

/**
 * Test macro patterns for various testing frameworks
 * Reference: vscode-cmake-tools/src/ui/testCodeLensProvider.ts
 */
export const TEST_MACRO_PATTERNS: TestMacroPattern[] = [
    // --------------------------------------------------------
    // Catch2 / doctest - string literal names
    // --------------------------------------------------------
    {
        name: 'catch2_doctest_quoted',
        framework: 'catch2/doctest',
        regex: /\bTEST_CASE\s*\(\s*"([^"]+)"/g,
        extractName: (m) => m[1]
    },
    {
        name: 'catch2_scenario',
        framework: 'catch2/doctest',
        regex: /\bSCENARIO\s*\(\s*"([^"]+)"/g,
        extractName: (m) => m[1]
    },
    {
        name: 'section_subcase',
        framework: 'catch2/doctest',
        regex: /\b(?:SECTION|SUBCASE)\s*\(\s*"([^"]+)"/g,
        extractName: (m) => m[1]
    },

    // --------------------------------------------------------
    // Google Test - identifier names
    // --------------------------------------------------------
    {
        name: 'gtest',
        framework: 'gtest',
        regex: /\b(?:TEST|TEST_F|TEST_P)\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/g,
        extractName: (m) => `${m[1]}.${m[2]}`
    },

    // --------------------------------------------------------
    // Boost.Test - identifier names
    // --------------------------------------------------------
    {
        name: 'boost_test',
        framework: 'boost',
        regex: /\bBOOST_AUTO_TEST_CASE\s*\(\s*(\w+)\s*\)/g,
        extractName: (m) => m[1]
    }
];

/**
 * Normalize test name for fuzzy matching
 * Matches the normalization used by CMake tools
 */
export function normalizeTestName(testName: string): string {
    return testName
        .toLowerCase()
        .replace(/^\s*scenario:\s*/, '')
        .replace(/\[[^\]]*\]/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Check if two test names match (exact or fuzzy)
 */
export function isTestNameMatch(name1: string, name2: string): boolean {
    // Exact match
    if (name1 === name2) {
        return true;
    }

    // Normalized match
    const norm1 = normalizeTestName(name1);
    const norm2 = normalizeTestName(name2);

    if (norm1 === norm2) {
        return true;
    }

    // Containment match
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        return true;
    }

    return false;
}
